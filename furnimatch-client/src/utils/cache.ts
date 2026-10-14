// In-memory runtime cache for API responses to enable instant tab switching and smooth navigation
const cacheMap = new Map<string, { data: any; timestamp: number }>();

export const getCache = <T = any>(key: string): T | null => {
  const entry = cacheMap.get(key);
  if (!entry) return null;
  return entry.data as T;
};

export const setCache = (key: string, data: any): void => {
  cacheMap.set(key, { data, timestamp: Date.now() });
};

export const hasCache = (key: string): boolean => {
  return cacheMap.has(key);
};

export const clearCache = (keyPrefix?: string): void => {
  if (!keyPrefix) {
    cacheMap.clear();
    return;
  }
  for (const key of cacheMap.keys()) {
    if (key.startsWith(keyPrefix)) {
      cacheMap.delete(key);
    }
  }
};
