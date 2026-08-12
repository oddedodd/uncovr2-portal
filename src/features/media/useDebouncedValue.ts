import { useEffect, useState } from 'react'

/**
 * Utsetter endringer i en verdi til den har stått i ro. Brukes for felt som
 * mater en query-nøkkel direkte, slik at hvert tastetrykk ikke blir et kall.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}
