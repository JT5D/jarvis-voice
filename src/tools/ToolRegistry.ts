import type { JarvisTool, ToolSchema, ToolCall } from '../types.js';

export class ToolRegistry {
  private tools = new Map<string, JarvisTool>();

  register(tool: JarvisTool): void {
    this.tools.set(tool.name, tool);
  }

  unregister(name: string): void {
    this.tools.delete(name);
  }

  list(): ToolSchema[] {
    return [...this.tools.values()].map(({ name, description, parameters }) => ({
      name,
      description,
      parameters,
    }));
  }

  async execute(call: ToolCall): Promise<string> {
    const tool = this.tools.get(call.name);
    if (!tool) return `Error: unknown tool "${call.name}"`;
    try {
      const result = await tool.execute(call.args);
      // Truncate to 500 chars for token budget (spatial-web-browser pattern)
      return result.length > 500 ? result.slice(0, 497) + '...' : result;
    } catch (err) {
      return `Error: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  get size(): number {
    return this.tools.size;
  }
}
