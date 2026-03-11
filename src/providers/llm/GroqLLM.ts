import type { LLMProvider, ChatMessage, LLMResponse, ToolSchema } from '../../types.js';

/** Groq Cloud LLM — FREE tier (30 RPM). Requires GROQ_API_KEY env var. */
export class GroqLLM implements LLMProvider {
  readonly name = 'GroqLLM';
  private apiKey: string;
  private model: string;

  constructor(apiKey?: string, model = 'llama-3.3-70b-versatile') {
    this.apiKey = apiKey ?? (typeof process !== 'undefined' ? (process.env?.GROQ_API_KEY ?? '') : '');
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
    const body: Record<string, unknown> = {
      model: this.model,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
        ...(m.toolCallId ? { tool_call_id: m.toolCallId } : {}),
      })),
      stream: true,
    };

    if (tools?.length) {
      body.tools = tools.map(t => ({
        type: 'function',
        function: { name: t.name, description: t.description, parameters: { type: 'object', properties: t.parameters } },
      }));
    }

    const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const text = await resp.text();
      if (resp.status === 429) throw new Error(`rate limit: ${text}`);
      throw new Error(`Groq ${resp.status}: ${text}`);
    }

    return this.parseSSE(resp, onChunk);
  }

  private async parseSSE(resp: Response, onChunk?: (chunk: string) => void): Promise<LLMResponse> {
    const reader = resp.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let content = '';
    const toolCalls = new Map<number, { id: string; name: string; args: string }>();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value, { stream: true });
      for (const line of text.split('\n')) {
        if (!line.startsWith('data: ') || line === 'data: [DONE]') continue;
        const data = JSON.parse(line.slice(6)) as {
          choices: Array<{
            delta: {
              content?: string;
              tool_calls?: Array<{ index: number; id?: string; function?: { name?: string; arguments?: string } }>;
            };
          }>;
        };

        const delta = data.choices[0]?.delta;
        if (delta?.content) { content += delta.content; onChunk?.(delta.content); }

        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            const existing = toolCalls.get(tc.index);
            if (existing) {
              if (tc.function?.arguments) existing.args += tc.function.arguments;
            } else {
              toolCalls.set(tc.index, {
                id: tc.id ?? `groq-${Date.now()}-${tc.index}`,
                name: tc.function?.name ?? '',
                args: tc.function?.arguments ?? '',
              });
            }
          }
        }
      }
    }

    const parsed = [...toolCalls.values()].map(tc => ({
      id: tc.id, name: tc.name, args: JSON.parse(tc.args || '{}') as Record<string, unknown>,
    }));

    return { content, toolCalls: parsed.length > 0 ? parsed : undefined };
  }
}
