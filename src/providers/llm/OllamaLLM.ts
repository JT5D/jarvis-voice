import type { LLMProvider, ChatMessage, LLMResponse, ToolSchema } from '../../types.js';

/** Local Ollama LLM — FREE, zero API key. Requires Ollama running at localhost:11434. */
export class OllamaLLM implements LLMProvider {
  readonly name = 'OllamaLLM';
  private baseUrl: string;
  private model: string;

  constructor(model = 'llama3.2', baseUrl = 'http://localhost:11434') {
    this.model = model;
    this.baseUrl = baseUrl;
  }

  async available(): Promise<boolean> {
    try {
      const resp = await fetch(`${this.baseUrl}/api/tags`, { signal: AbortSignal.timeout(2000) });
      return resp.ok;
    } catch {
      return false;
    }
  }

  async chat(
    messages: ChatMessage[],
    tools?: ToolSchema[],
    onChunk?: (chunk: string) => void,
  ): Promise<LLMResponse> {
    const body: Record<string, unknown> = {
      model: this.model,
      messages: messages.map(m => ({ role: m.role === 'tool' ? 'assistant' : m.role, content: m.content })),
      stream: true,
    };

    // Only pass tools to models that handle them well (≥8B)
    const smallModels = ['llama3.2', 'gemma:2b', 'phi3:mini', 'qwen2.5:7b'];
    const isSmall = smallModels.some(s => this.model.startsWith(s));
    if (tools?.length && !isSmall) {
      body.tools = tools.map(t => ({
        type: 'function',
        function: { name: t.name, description: t.description, parameters: { type: 'object', properties: t.parameters } },
      }));
    }

    const resp = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!resp.ok) throw new Error(`Ollama ${resp.status}: ${await resp.text()}`);

    const reader = resp.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let content = '';
    const toolCalls: LLMResponse['toolCalls'] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const lines = decoder.decode(value, { stream: true }).split('\n').filter(Boolean);
      for (const line of lines) {
        const data = JSON.parse(line) as {
          message?: { content?: string; tool_calls?: Array<{ function: { name: string; arguments: Record<string, unknown> } }> };
        };
        if (data.message?.content) {
          content += data.message.content;
          onChunk?.(data.message.content);
        }
        if (data.message?.tool_calls) {
          for (const tc of data.message.tool_calls) {
            toolCalls.push({ id: `ollama-${Date.now()}-${toolCalls.length}`, name: tc.function.name, args: tc.function.arguments });
          }
        }
      }
    }

    return { content, toolCalls: toolCalls.length > 0 ? toolCalls : undefined };
  }
}
