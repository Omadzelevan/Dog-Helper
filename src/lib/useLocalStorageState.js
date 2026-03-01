import { useEffect, useMemo, useState } from 'react'

export function useLocalStorageState(key, initialValue) {
  const initial = useMemo(() => {
    try {
      const raw = localStorage.getItem(key)
      if (!raw) return initialValue
      return JSON.parse(raw)
    } catch {
      return initialValue
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const [value, setValue] = useState(initial)

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // ignore storage errors (quota, disabled, etc.)
    }
  }, [key, value])

  return [value, setValue]
}

