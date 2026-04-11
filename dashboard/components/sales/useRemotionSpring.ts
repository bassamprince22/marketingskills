'use client'
import { useEffect, useRef, useState } from 'react'

// Remotion-style spring physics for UI animations
function springValue(frame: number, config: { stiffness: number; damping: number; mass: number }): number {
  const { stiffness, damping, mass } = config
  const omega0 = Math.sqrt(stiffness / mass)
  const zeta = damping / (2 * Math.sqrt(stiffness * mass))
  if (zeta < 1) {
    const omegaD = omega0 * Math.sqrt(1 - zeta * zeta)
    const t = frame / 30 // 30fps
    return 1 - Math.exp(-zeta * omega0 * t) * Math.cos(omegaD * t)
  }
  return 1
}

export function useRemotionSpring(options: {
  frame: number
  config?: { stiffness?: number; damping?: number; mass?: number }
  from?: number
  to?: number
}): number {
  const { frame, config = {}, from = 0, to = 1 } = options
  const { stiffness = 100, damping = 15, mass = 1 } = config
  const raw = Math.min(1, Math.max(0, springValue(frame, { stiffness, damping, mass })))
  return from + (to - from) * raw
}

export function useAnimationFrame(delay = 0): number {
  const [frame, setFrame] = useState(0)
  const started = useRef(false)
  const startTime = useRef(0)
  const raf = useRef<number>(0)

  useEffect(() => {
    const timeout = setTimeout(() => {
      started.current = true
      startTime.current = performance.now()
      const tick = (now: number) => {
        const elapsed = now - startTime.current
        setFrame(Math.floor(elapsed / (1000 / 30))) // 30fps
        raf.current = requestAnimationFrame(tick)
      }
      raf.current = requestAnimationFrame(tick)
    }, delay)
    return () => {
      clearTimeout(timeout)
      cancelAnimationFrame(raf.current)
    }
  }, [delay])

  return frame
}
