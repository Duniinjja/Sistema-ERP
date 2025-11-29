export type PersistenceAdapter = {
  read<T>(key: string): T | null
  write<T>(key: string, value: T): void
  remove(key: string): void
}

export function createLocalStorageAdapter(): PersistenceAdapter {
  return {
    read(key) {
      if (typeof window === 'undefined') return null
      try {
        const raw = localStorage.getItem(key)
        if (!raw) return null
        return JSON.parse(raw)
      } catch {
        return null
      }
    },
    write(key, value) {
      if (typeof window === 'undefined') return
      try {
        localStorage.setItem(key, JSON.stringify(value))
      } catch {
        /* ignore */
      }
    },
    remove(key) {
      if (typeof window === 'undefined') return
      localStorage.removeItem(key)
    },
  }
}

export function createMemoryAdapter(): PersistenceAdapter {
  const store = new Map<string, string>()
  return {
    read(key) {
      const value = store.get(key)
      return value ? JSON.parse(value) : null
    },
    write(key, value) {
      store.set(key, JSON.stringify(value))
    },
    remove(key) {
      store.delete(key)
    },
  }
}

let currentAdapter: PersistenceAdapter = createLocalStorageAdapter()

export const persistence = {
  read<T>(key: string) {
    return currentAdapter.read<T>(key)
  },
  write<T>(key: string, value: T) {
    currentAdapter.write(key, value)
  },
  remove(key: string) {
    currentAdapter.remove(key)
  },
  setAdapter(adapter: PersistenceAdapter) {
    currentAdapter = adapter
  },
  getAdapter() {
    return currentAdapter
  },
}

export function configurePersistenceAdapter(mode: 'local' | 'memory' = 'local') {
  if (mode === 'memory') {
    currentAdapter = createMemoryAdapter()
  } else {
    currentAdapter = createLocalStorageAdapter()
  }
}
