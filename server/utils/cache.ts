const ttl = Number(process.env.CACHE_TTL ?? 60);

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class SimpleCache {
  private map = new Map<string, CacheEntry<any>>();

  constructor(private defaultTtl: number) {}

  get<T>(key: string): T | undefined {
    const entry = this.map.get(key) as CacheEntry<T> | undefined;
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.map.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set<T>(key: string, value: T): void {
    this.map.set(key, { value, expiresAt: Date.now() + this.defaultTtl * 1000 });
  }
}

export const cache = new SimpleCache(ttl);

export async function getOrSet<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const cached = cache.get(key) as T | undefined;
  if (cached !== undefined) {
    return cached;
  }
  const result = await fn();
  cache.set(key, result);
  return result;
}
