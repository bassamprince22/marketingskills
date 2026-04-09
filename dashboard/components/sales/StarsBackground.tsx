'use client'

import { useEffect, useRef } from 'react'

interface Star {
  x: number; y: number; r: number; delay: number; duration: number; opacity: number
}

function generateStars(count: number): Star[] {
  return Array.from({ length: count }, () => ({
    x:        Math.random() * 100,
    y:        Math.random() * 100,
    r:        Math.random() * 1.5 + 0.3,
    delay:    Math.random() * 4,
    duration: Math.random() * 3 + 2,
    opacity:  Math.random() * 0.6 + 0.2,
  }))
}

const STARS = generateStars(120)

export function StarsBackground() {
  return (
    <div
      className="stars-container"
      aria-hidden="true"
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}
    >
      {STARS.map((s, i) => (
        <span
          key={i}
          className="star"
          style={{
            left:        `${s.x}%`,
            top:         `${s.y}%`,
            width:       `${s.r * 2}px`,
            height:      `${s.r * 2}px`,
            '--delay':    `${s.delay}s`,
            '--duration': `${s.duration}s`,
            opacity:     s.opacity,
          } as React.CSSProperties}
        />
      ))}
      {/* Nebula blobs */}
      <div
        style={{
          position: 'absolute',
          top: '15%', left: '10%',
          width: '35vw', height: '35vw',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(79,142,247,0.04) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '20%', right: '5%',
          width: '40vw', height: '40vw',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(124,58,237,0.05) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}
