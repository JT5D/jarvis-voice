import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProviderChain } from '../../src/engine/ProviderChain.js';

interface MockProvider {
  readonly name: string;
  available(): Promise<boolean>;
}

function mockProvider(name: string, isAvailable: boolean): MockProvider {
  return { name, available: vi.fn().mockResolvedValue(isAvailable) };
}

describe('ProviderChain', () => {
  it('resolves to first available provider', async () => {
    const chain = new ProviderChain([
      mockProvider('a', false),
      mockProvider('b', true),
      mockProvider('c', true),
    ]);
    const result = await chain.resolve();
    expect(result.name).toBe('b');
  });

  it('throws when no providers available', async () => {
    const chain = new ProviderChain([
      mockProvider('a', false),
      mockProvider('b', false),
    ]);
    await expect(chain.resolve()).rejects.toThrow('No provider available');
  });

  it('throws on empty chain', async () => {
    const chain = new ProviderChain<MockProvider>([]);
    await expect(chain.resolve()).rejects.toThrow('No provider available');
  });

  it('skips failed providers until cooldown expires', async () => {
    const a = mockProvider('a', true);
    const b = mockProvider('b', true);
    const chain = new ProviderChain([a, b]);

    chain.markFailed('a');
    const result = await chain.resolve();
    expect(result.name).toBe('b');
  });

  it('retries failed providers as last resort when all cooling down', async () => {
    const a = mockProvider('a', true);
    const chain = new ProviderChain([a]);

    chain.markFailed('a');
    // Should still resolve since it retries as last resort
    const result = await chain.resolve();
    expect(result.name).toBe('a');
  });

  it('returns provider names', () => {
    const chain = new ProviderChain([mockProvider('x', true), mockProvider('y', false)]);
    expect(chain.names()).toEqual(['x', 'y']);
  });

  it('reports correct length', () => {
    const chain = new ProviderChain([mockProvider('a', true)]);
    expect(chain.length).toBe(1);
  });

  it('handles provider.available() throwing', async () => {
    const bad: MockProvider = { name: 'bad', available: vi.fn().mockRejectedValue(new Error('boom')) };
    const good = mockProvider('good', true);
    const chain = new ProviderChain([bad, good]);
    const result = await chain.resolve();
    expect(result.name).toBe('good');
  });
});
