import { useEffect } from 'react'

export function usePageMonitor(page: string) {
  useEffect(() => {
    const start = performance.now()
    console.info(`[monitor] ${page} rendered`)
    return () => {
      const duration = performance.now() - start
      console.info(`[monitor] ${page} unmounted after ${duration.toFixed(2)}ms`)
    }
  }, [page])
}
