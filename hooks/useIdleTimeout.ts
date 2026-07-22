import { useEffect, useRef } from 'react'

interface UseIdleTimeoutOptions {
  timeoutMs?: number
  onWarning?: () => void
  onTimeout?: () => void
}

const DEFAULT_TIMEOUT = 15 * 60 * 1000
const WARNING_TIME = 14 * 60 * 1000

export function useIdleTimeout({
  timeoutMs = DEFAULT_TIMEOUT,
  onWarning,
  onTimeout,
}: UseIdleTimeoutOptions = {}) {
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null)
  const warningIdRef = useRef<NodeJS.Timeout | null>(null)

  const resetTimer = () => {
    if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current)
    if (warningIdRef.current) clearTimeout(warningIdRef.current)

    warningIdRef.current = setTimeout(() => {
      onWarning?.()
    }, WARNING_TIME)

    timeoutIdRef.current = setTimeout(() => {
      onTimeout?.()
    }, timeoutMs)
  }

  useEffect(() => {
    resetTimer()

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
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
  }, [timeoutMs, onWarning, onTimeout])
}
