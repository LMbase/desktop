export interface RuntimeSessionCache {
  set: (key: string, value: string) => Promise<void>;
  get: (key: string) => Promise<string | null>;
  delete: (key: string) => Promise<void>;
  clear: () => Promise<void>;
}

export function createRuntimeSessionCache(): RuntimeSessionCache {
  const cache = new Map<string, string>();
  return {
    set: async (key: string, value: string) => {
      cache.set(key, value);
    },
    get: async (key: string) => cache.get(key) ?? null,
    delete: async (key: string) => {
      cache.delete(key);
    },
    clear: async () => {
      cache.clear();
    },
  };
}
