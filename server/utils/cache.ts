import NodeCache from 'node-cache';

const ttl = Number(process.env.CACHE_TTL ?? 60);

export const cache = new NodeCache({ stdTTL: ttl });

export async function getOrSet<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const cached = cache.get<T>(key);
  if (cached !== undefined) {
    return cached;
  }
  const result = await fn();
  cache.set(key, result);
  return result;
}
