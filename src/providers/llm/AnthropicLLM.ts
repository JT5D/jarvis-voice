import type { LLMProvider, ChatMessage, LLMResponse, ToolSchema } from '../../types.js';

/** Claude API — PREMIUM, requires ANTHROPIC_API_KEY. Best quality. */
export class AnthropicLLM implements LLMProvider {
  readonly name = 'AnthropicLLM';
  private apiKey: string;
  private model: string;

  constructor(apiKey?: string, model = 'claude-sonnet-4-20250514') {
    this.apiKey = apiKey ?? (typeof process !== 'undefined' ? (process.env?.ANTHROPIC_API_KEY ?? '') : '');
    this.model = model;
  }

  async available(): Promise<boolean> {
    return !!this.apiKey;
  }

  async chat(
    messages: ChatMessage[],
    tools?: ToolSchema[],
    onChunk?: (chunk: string) => void,
  ): Promise<LLMResponse> {
    const systemMsg = messages.find(m => m.role === 'system');
    const nonSystemMsgs = messages.filter(m => m.role !== 'system');

    const body: Record<string, unknown> = {
      model: this.model,
      max_tokens: 1024,
      stream: true,
      messages: nonSystemMsgs.map(m => ({
        role: m.role === 'tool' ? 'user' : m.role,
        content: m.role === 'tool'
          ? [{ type: 'tool_result', tool_use_id: m.toolCallId, content: m.content }]
          : m.content,
      })),
    };

    if (systemMsg) body.system = systemMsg.content;
    if (tools?.length) {
      body.tools = tools.map(t => ({
        name: t.name, description: t.description, input_schema: { type: 'object', properties: t.parameters },
      }));
    }

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': this.apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const text = await resp.text();
      if (resp.status === 429) throw new Error(`rate limit: ${text}`);
      throw new Error(`Anthropic ${resp.status}: ${text}`);
    }

    return this.parseSSE(resp, onChunk);
  }

  private async parseSSE(resp: Response, onChunk?: (chunk: string) => void): Promise<LLMResponse> {
    const reader = resp.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let content = '';
    const toolCalls: LLMResponse['toolCalls'] = [];
    let currentToolId = '';
    let currentToolName = '';
    let currentToolArgs = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value, { stream: true });
      for (const line of text.split('\n')) {
        if (!line.startsWith('data: ')) continue;
        const data = JSON.parse(line.slice(6)) as Record<string, unknown>;

        switch (data.type) {
          case 'content_block_start': {
            const block = data.content_block as { type: string; id?: string; name?: string };
            if (block.type === 'tool_use') {
              currentToolId = block.id ?? `claude-${Date.now()}`;
              currentToolName = block.name ?? '';
              currentToolArgs = '';
            }
            break;
          }
          case 'content_block_delta': {
            const delta = data.delta as { type: string; text?: string; partial_json?: string };
            if (delta.type === 'text_delta' && delta.text) { content += delta.text; onChunk?.(delta.text); }
            if (delta.type === 'input_json_delta' && delta.partial_json) { currentToolArgs += delta.partial_json; }
            break;
          }
          case 'content_block_stop': {
            if (currentToolName) {
              toolCalls.push({ id: currentToolId, name: currentToolName, args: JSON.parse(currentToolArgs || '{}') as Record<string, unknown> });
              currentToolName = '';
            }
            break;
          }
        }
      }
    }

    return { content, toolCalls: toolCalls.length > 0 ? toolCalls : undefined };
  }
}
