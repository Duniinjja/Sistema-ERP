import { useEffect, useState } from 'react'

export type CrudItem<T extends Record<string, unknown>> = T & { id: string }

export function useLocalCrud<T extends Record<string, unknown>>(key: string, seed: CrudItem<T>[]) {
  const [items, setItems] = useState<CrudItem<T>[]>(() => {
    try {
      const raw = localStorage.getItem(key)
      if (raw) {
        return JSON.parse(raw)
      }
    } catch (err) {
      console.warn(`Falha ao ler ${key} do storage`, err)
    }
    return seed
  })

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(items))
  }, [items, key])

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
