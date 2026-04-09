'use client'

import { useEffect, useRef, useState } from 'react'

export function useCountUp(target: number, durationMs = 900, delay = 0): number {
  const [value, setValue] = useState(0)
  const frameRef = useRef<number>()

  useEffect(() => {
    if (target === 0) { setValue(0); return }

    const timeout = setTimeout(() => {
      const start = performance.now()
      function step(now: number) {
        const elapsed  = now - start
        const progress = Math.min(elapsed / durationMs, 1)
        // ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3)
        setValue(Math.round(target * eased))
        if (progress < 1) {
          frameRef.current = requestAnimationFrame(step)
        }
      }
      frameRef.current = requestAnimationFrame(step)
    }, delay)

    return () => {
      clearTimeout(timeout)
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [target, durationMs, delay])

  return value
}
