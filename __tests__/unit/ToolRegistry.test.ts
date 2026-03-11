import { describe, it, expect, vi } from 'vitest';
import { ToolRegistry } from '../../src/tools/ToolRegistry.js';
import type { JarvisTool } from '../../src/types.js';

function makeTool(name: string, result = 'ok'): JarvisTool {
  return {
    name,
    description: `Tool ${name}`,
    parameters: {},
    execute: vi.fn().mockResolvedValue(result),
  };
}

describe('ToolRegistry', () => {
  it('registers and lists tools', () => {
    const reg = new ToolRegistry();
    reg.register(makeTool('alpha'));
    reg.register(makeTool('beta'));
    const schemas = reg.list();
    expect(schemas).toHaveLength(2);
    expect(schemas[0].name).toBe('alpha');
  });

  it('executes a tool', async () => {
    const reg = new ToolRegistry();
    reg.register(makeTool('hello', 'world'));
    const result = await reg.execute({ id: '1', name: 'hello', args: {} });
    expect(result).toBe('world');
  });

  it('returns error for unknown tool', async () => {
    const reg = new ToolRegistry();
    const result = await reg.execute({ id: '1', name: 'nope', args: {} });
    expect(result).toContain('unknown tool');
  });

  it('truncates long results to 500 chars', async () => {
    const reg = new ToolRegistry();
    reg.register(makeTool('long', 'x'.repeat(600)));
    const result = await reg.execute({ id: '1', name: 'long', args: {} });
    expect(result.length).toBeLessThanOrEqual(500);
    expect(result).toContain('...');
  });

  it('handles tool execution errors', async () => {
    const reg = new ToolRegistry();
    const tool = makeTool('bad');
    (tool.execute as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('boom'));
    reg.register(tool);
    const result = await reg.execute({ id: '1', name: 'bad', args: {} });
    expect(result).toContain('Error: boom');
  });

  it('unregisters tools', () => {
    const reg = new ToolRegistry();
    reg.register(makeTool('temp'));
    expect(reg.size).toBe(1);
    reg.unregister('temp');
    expect(reg.size).toBe(0);
  });
});
