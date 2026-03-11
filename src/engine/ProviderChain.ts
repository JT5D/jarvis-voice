/**
 * Generic fallback chain — resolves to first available provider.
 * Mirrors the spatial-web-browser's Groq→Gemini→Ollama→Claude pattern.
 */
export class ProviderChain<T extends { readonly name: string; available(): Promise<boolean> }> {
  private failed = new Set<string>();
  private cooldowns = new Map<string, number>();
  private readonly COOLDOWN_MS = 60_000;

  constructor(private providers: T[]) {}

  /** Get first available provider (skipping failed/cooling down) */
  async resolve(): Promise<T> {
    this.clearExpiredCooldowns();
    for (const p of this.providers) {
      if (this.failed.has(p.name) && this.cooldowns.has(p.name)) continue;
      try {
        if (await p.available()) return p;
      } catch {
        // Provider check failed, skip
      }
    }
    // Retry failed providers as last resort
    this.failed.clear();
    this.cooldowns.clear();
    for (const p of this.providers) {
      try {
        if (await p.available()) return p;
      } catch {
        // skip
      }
    }
    const names = this.providers.map(p => p.name).join(', ');
    throw new Error(`No provider available. Tried: ${names}`);
  }

  /** Mark a provider as temporarily failed */
  markFailed(name: string): void {
    this.failed.add(name);
    this.cooldowns.set(name, Date.now() + this.COOLDOWN_MS);
  }

  /** Get all provider names */
  names(): string[] {
    return this.providers.map(p => p.name);
  }

  get length(): number {
    return this.providers.length;
  }

  private clearExpiredCooldowns(): void {
    const now = Date.now();
    for (const [name, expiry] of this.cooldowns) {
      if (now >= expiry) {
        this.cooldowns.delete(name);
        this.failed.delete(name);
      }
    }
  }
}
