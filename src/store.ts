import { useEffect, useState } from 'react'

export type CrudItem<T extends Record<string, unknown>> = T & { id: string }

export function useLocalCrud<T extends Record<string, unknown>>(key: string, seed: CrudItem<T>[]) {
  const [items, setItems] = useState<CrudItem<T>[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key)
      if (raw) {
        setItems(JSON.parse(raw))
      } else {
        setItems(seed)
      }
    } catch {
      setItems(seed)
    }
  }, [key, seed])

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(items))
  }, [items, key])

  const add = (data: Omit<CrudItem<T>, 'id'>) => {
    const id = crypto.randomUUID()
    setItems((prev) => [...prev, { ...data, id }])
  }

  const update = (id: string, data: Partial<CrudItem<T>>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...data } : item)))
  }

  const remove = (ids: string[]) => {
    setItems((prev) => prev.filter((item) => !ids.includes(item.id)))
  }

  return { items, add, update, remove, setItems }
}
