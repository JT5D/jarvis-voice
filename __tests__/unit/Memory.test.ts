import { describe, it, expect, beforeEach } from 'vitest';
import { Memory } from '../../src/memory/Memory.js';

describe('Memory', () => {
  let memory: Memory;

  beforeEach(() => {
    memory = new Memory('test');
    memory.clear();
  });

  it('stores and retrieves values', () => {
    memory.set('key', 'value');
    expect(memory.get('key')).toBe('value');
  });

  it('returns null for missing keys', () => {
    expect(memory.get('nonexistent')).toBeNull();
  });

  it('deletes values', () => {
    memory.set('key', 'value');
    expect(memory.delete('key')).toBe(true);
    expect(memory.get('key')).toBeNull();
  });

  it('returns false when deleting missing key', () => {
    expect(memory.delete('missing')).toBe(false);
  });

  it('lists all keys', () => {
    memory.set('a', '1');
    memory.set('b', '2');
    expect(memory.keys()).toEqual(expect.arrayContaining(['a', 'b']));
  });

  it('clears all values', () => {
    memory.set('a', '1');
    memory.set('b', '2');
    memory.clear();
    expect(memory.keys()).toHaveLength(0);
  });

  it('overwrites existing values', () => {
    memory.set('key', 'old');
    memory.set('key', 'new');
    expect(memory.get('key')).toBe('new');
  });
});
