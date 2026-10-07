import { useCallback, useLayoutEffect, useRef } from 'react'

/**
 * Função com identidade fixa que sempre chama a versão mais recente de `fn`.
 * Permite passar handlers para componentes memoizados sem quebrar o memo a cada render.
 */
export function useStableCallback<A extends unknown[], R>(fn: (...args: A) => R) {
  const ref = useRef(fn)
  useLayoutEffect(() => {
    ref.current = fn
  })
  return useCallback((...args: A) => ref.current(...args), [])
}
