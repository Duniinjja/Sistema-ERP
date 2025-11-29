import { useEffect, useRef, useState } from 'react'
import { persistence } from './services/persistence'

export type CrudItem<T extends Record<string, unknown>> = T & { id: string }
export const STORAGE_EVENT_NAME = 'erp-storage-change'

export function useLocalCrud<T extends Record<string, unknown>>(key: string, seed: CrudItem<T>[]) {
  const [items, setItems] = useState<CrudItem<T>[]>(() => {
    const stored = persistence.read<CrudItem<T>[]>(key)
    if (Array.isArray(stored)) {
      return stored
    }
    return seed
  })
  const instanceIdRef = useRef<string>()
  if (!instanceIdRef.current) {
    instanceIdRef.current = crypto.randomUUID()
  }
  const seedRef = useRef(seed)
  useEffect(() => {
    seedRef.current = seed
  }, [seed])
  const signatureRef = useRef<string>(JSON.stringify(items))

  useEffect(() => {
    if (typeof window === 'undefined') return
    const serialized = JSON.stringify(items)
    signatureRef.current = serialized
    persistence.write(key, items)
    const event = new CustomEvent(STORAGE_EVENT_NAME, { detail: { key, source: instanceIdRef.current } })
    window.dispatchEvent(event)
  }, [items, key])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handler = (event: Event) => {
      if (!(event instanceof CustomEvent)) return
      const detail = event.detail as { key?: string; source?: string }
      if (!detail?.key || detail.source === instanceIdRef.current) return
      if (detail.key !== key) return
      try {
        const next = persistence.read<CrudItem<T>[]>(key) ?? seedRef.current
        if (!Array.isArray(next)) return
        const serializedNext = JSON.stringify(next)
        if (serializedNext === signatureRef.current) return
        signatureRef.current = serializedNext
        setItems(next)
      } catch (err) {
        console.warn(`Falha ao sincronizar ${key}`, err)
      }
    }
    window.addEventListener(STORAGE_EVENT_NAME, handler)
    return () => window.removeEventListener(STORAGE_EVENT_NAME, handler)
  }, [key])

  const add = (data: Omit<CrudItem<T>, 'id'> & { id?: string }) => {
    const id = data.id ?? crypto.randomUUID()
    const rest = { ...data }
    delete (rest as Partial<CrudItem<T>>).id
    setItems((prev) => [...prev, { ...(rest as CrudItem<T>), id }])
    return id
  }

  const update = (id: string, data: Partial<CrudItem<T>>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...data } : item)))
  }

  const remove = (ids: string[]) => {
    setItems((prev) => prev.filter((item) => !ids.includes(item.id)))
  }

  return { items, add, update, remove, setItems }
}
