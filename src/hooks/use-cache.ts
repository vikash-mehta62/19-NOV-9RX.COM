import { useState, useEffect, useCallback } from "react";

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds (default: 5 minutes)
  key: string;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// Simple in-memory cache
const cache = new Map<string, CacheEntry<any>>();

export function useCache<T>(
  fetcher: () => Promise<T>,
  options: CacheOptions
) {
  const { ttl = 5 * 60 * 1000, key } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);

      // Check cache first
      if (!forceRefresh && cache.has(key)) {
        const entry = cache.get(key);
        if (entry && Date.now() - entry.timestamp < ttl) {
          setData(entry.data);
          setLoading(false);
          return entry.data;
        }
      }

      // Fetch fresh data
      const freshData = await fetcher();
      
      // Update cache
      cache.set(key, {
        data: freshData,
        timestamp: Date.now(),
      });

      setData(freshData);
      return freshData;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetcher, key, ttl]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refresh = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);

  const clearCache = useCallback(() => {
    cache.delete(key);
  }, [key]);

  return { data, loading, error, refresh, clearCache };
}

// Clear all cache
export function clearAllCache() {
  cache.clear();
}

// Clear cache by pattern
export function clearCacheByPattern(pattern: string) {
  const keys = Array.from(cache.keys());
  keys.forEach(key => {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  });
}
