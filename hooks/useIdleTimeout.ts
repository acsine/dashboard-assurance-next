import { useCallback, useEffect, useRef } from 'react'

interface UseIdleTimeoutOptions {
  timeoutMs?: number
  onWarning?: () => void
  onTimeout?: () => void
}

const DEFAULT_TIMEOUT = 15 * 60 * 1000

export function useIdleTimeout({
  timeoutMs = DEFAULT_TIMEOUT,
  onWarning,
  onTimeout,
}: UseIdleTimeoutOptions = {}) {
  const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warningIdRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onWarningRef = useRef(onWarning)
  const onTimeoutRef = useRef(onTimeout)

  useEffect(() => {
    onWarningRef.current = onWarning
    onTimeoutRef.current = onTimeout
  }, [onWarning, onTimeout])

  const resetTimer = useCallback(() => {
    if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current)
    if (warningIdRef.current) clearTimeout(warningIdRef.current)

    const warningDelay = Math.max(0, timeoutMs - 60_000)

    warningIdRef.current = setTimeout(() => {
      onWarningRef.current?.()
    }, warningDelay)

    timeoutIdRef.current = setTimeout(() => {
      onTimeoutRef.current?.()
    }, timeoutMs)
  }, [timeoutMs])

  useEffect(() => {
    resetTimer()

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'] as const
    const handleActivity = () => resetTimer()

    events.forEach((event) => {
      document.addEventListener(event, handleActivity)
    })

    return () => {
      if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current)
      if (warningIdRef.current) clearTimeout(warningIdRef.current)
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity)
      })
    }
  }, [resetTimer])

  return { resetTimer }
}
