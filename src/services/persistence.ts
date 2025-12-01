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

const INDEXED_DB_NAME = 'erp-persistence'
const INDEXED_DB_STORE = 'entries'
const INDEXED_DB_VERSION = 1

function supportsIndexedDb() {
  return typeof window !== 'undefined' && 'indexedDB' in window
}

function openIndexedDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!supportsIndexedDb()) {
      reject(new Error('IndexedDB indisponível'))
      return
    }
    const request = indexedDB.open(INDEXED_DB_NAME, INDEXED_DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(INDEXED_DB_STORE)) {
        db.createObjectStore(INDEXED_DB_STORE, { keyPath: 'key' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function hydrateIndexedDbCache(cache: Map<string, string>) {
  if (!supportsIndexedDb()) return
  openIndexedDb()
    .then((db) => {
      const tx = db.transaction(INDEXED_DB_STORE, 'readonly')
      const store = tx.objectStore(INDEXED_DB_STORE)
      const request = store.openCursor()
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result as IDBCursorWithValue | null
        if (cursor) {
          cache.set(cursor.key as string, cursor.value as string)
          cursor.continue()
        } else {
          db.close()
        }
      }
      request.onerror = () => {
        console.warn('Falha ao ler IndexedDB', request.error)
        db.close()
      }
    })
    .catch((error) => {
      console.warn('IndexedDB indisponível', error)
    })
}

function persistIndexedDbEntry(key: string, value: string) {
  if (!supportsIndexedDb()) return
  openIndexedDb()
    .then((db) => {
      const tx = db.transaction(INDEXED_DB_STORE, 'readwrite')
      const store = tx.objectStore(INDEXED_DB_STORE)
      store.put({ key, value })
      tx.oncomplete = () => db.close()
      tx.onerror = () => {
        console.warn('Falha ao salvar no IndexedDB', tx.error)
        db.close()
      }
    })
    .catch((error) => {
      console.warn('IndexedDB indisponível', error)
    })
}

function deleteIndexedDbEntry(key: string) {
  if (!supportsIndexedDb()) return
  openIndexedDb()
    .then((db) => {
      const tx = db.transaction(INDEXED_DB_STORE, 'readwrite')
      const store = tx.objectStore(INDEXED_DB_STORE)
      store.delete(key)
      tx.oncomplete = () => db.close()
      tx.onerror = () => {
        console.warn('Falha ao remover do IndexedDB', tx.error)
        db.close()
      }
    })
    .catch((error) => {
      console.warn('IndexedDB indisponível', error)
    })
}

export function createIndexedDbAdapter(): PersistenceAdapter {
  if (!supportsIndexedDb()) {
    console.warn('IndexedDB não disponível, fallback para memória.')
    return createMemoryAdapter()
  }
  const cache = new Map<string, string>()
  hydrateIndexedDbCache(cache)

  return {
    read(key) {
      const raw = cache.get(key)
      if (!raw) return null
      try {
        return JSON.parse(raw)
      } catch {
        return null
      }
    },
    write(key, value) {
      const serialized = JSON.stringify(value)
      cache.set(key, serialized)
      persistIndexedDbEntry(key, serialized)
    },
    remove(key) {
      cache.delete(key)
      deleteIndexedDbEntry(key)
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

export function configurePersistenceAdapter(mode: 'local' | 'memory' | 'indexeddb' = 'local') {
  if (mode === 'memory') {
    currentAdapter = createMemoryAdapter()
  } else if (mode === 'indexeddb') {
    currentAdapter = createIndexedDbAdapter()
  } else {
    currentAdapter = createLocalStorageAdapter()
  }
}
