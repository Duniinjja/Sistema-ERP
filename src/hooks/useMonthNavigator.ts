import { useCallback, useMemo, useState } from 'react'
import { formatMonthLabel } from '../utils/format'

export function useMonthNavigator(initial?: Date) {
  const [month, setMonth] = useState<Date>(() => {
    const now = initial ?? new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  const goNextMonth = useCallback(() => {
    setMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }, [])

  const goPrevMonth = useCallback(() => {
    setMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }, [])

  const resetMonth = useCallback(() => {
    const now = new Date()
    setMonth(new Date(now.getFullYear(), now.getMonth(), 1))
  }, [])

  const label = useMemo(() => formatMonthLabel(month), [month])

  return {
    month,
    goNextMonth,
    goPrevMonth,
    resetMonth,
    label,
    setMonth,
  }
}
