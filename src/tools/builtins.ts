import type { JarvisTool } from '../types.js';
import type { Memory } from '../memory/Memory.js';

export function createBuiltinTools(memory: Memory): JarvisTool[] {
  return [
    {
      name: 'get_time',
      description: 'Get the current date and time',
      parameters: {},
      execute: async () => new Date().toISOString(),
    },
    {
      name: 'remember',
      description: 'Save a piece of information to memory',
      parameters: {
        key: { type: 'string', description: 'Memory key' },
        value: { type: 'string', description: 'Value to store' },
      },
      execute: async (args) => {
        memory.set(String(args.key), String(args.value));
        return `Remembered "${args.key}"`;
      },
    },
    {
      name: 'recall',
      description: 'Retrieve a piece of information from memory',
      parameters: {
        key: { type: 'string', description: 'Memory key to look up' },
      },
      execute: async (args) => {
        return memory.get(String(args.key)) ?? `No memory found for "${args.key}"`;
      },
    },
  ];
}
