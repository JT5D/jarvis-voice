/**
 * Simple key-value memory store.
 * Uses in-memory Map with optional localStorage persistence.
 */
export class Memory {
  private store = new Map<string, string>();
  private storageKey: string;

  constructor(namespace = 'jarvis') {
    this.storageKey = `${namespace}:memory`;
    this.load();
  }

  get(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  set(key: string, value: string): void {
    this.store.set(key, value);
    this.persist();
  }

  delete(key: string): boolean {
    const had = this.store.delete(key);
    if (had) this.persist();
    return had;
  }

  keys(): string[] {
    return [...this.store.keys()];
  }

  clear(): void {
    this.store.clear();
    this.persist();
  }

  private persist(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const obj = Object.fromEntries(this.store);
        localStorage.setItem(this.storageKey, JSON.stringify(obj));
      }
    } catch {
      // Storage unavailable, memory-only mode
    }
  }

  private load(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(this.storageKey);
        if (raw) {
          const obj = JSON.parse(raw) as Record<string, string>;
          for (const [k, v] of Object.entries(obj)) {
            this.store.set(k, v);
          }
        }
      }
    } catch {
      // Storage unavailable
    }
  }
}
