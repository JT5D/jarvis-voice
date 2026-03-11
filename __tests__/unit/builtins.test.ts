import { describe, it, expect } from 'vitest';
import { createBuiltinTools } from '../../src/tools/builtins.js';
import { Memory } from '../../src/memory/Memory.js';

describe('Builtin tools', () => {
  const memory = new Memory('test-builtins');
  const tools = createBuiltinTools(memory);

  it('creates 3 builtin tools', () => {
    expect(tools).toHaveLength(3);
    expect(tools.map(t => t.name)).toEqual(['get_time', 'remember', 'recall']);
  });

  it('get_time returns ISO date string', async () => {
    const result = await tools[0].execute({});
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('remember stores values', async () => {
    const result = await tools[1].execute({ key: 'color', value: 'blue' });
    expect(result).toContain('Remembered');
    expect(memory.get('color')).toBe('blue');
  });

  it('recall retrieves stored values', async () => {
    memory.set('name', 'Jarvis');
    const result = await tools[2].execute({ key: 'name' });
    expect(result).toBe('Jarvis');
  });

  it('recall returns error for missing keys', async () => {
    const result = await tools[2].execute({ key: 'nonexistent' });
    expect(result).toContain('No memory found');
  });
});
