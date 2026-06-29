import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'

// useState that persists to localStorage under `key`, so UI preferences (e.g. Browse
// filters) survive navigation and reloads. Reads/writes are guarded — Safari private
// mode can throw on access — and fall back to the initial value.
export function usePersistentState<T>(
  key: string,
  initial: T,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw === null ? initial : (JSON.parse(raw) as T)
    } catch {
      return initial
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // ignore: storage unavailable or full (e.g. private mode)
    }
  }, [key, value])

  return [value, setValue]
}
