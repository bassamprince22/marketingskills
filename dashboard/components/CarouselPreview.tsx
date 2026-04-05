'use client'

import { useState } from 'react'

interface CarouselPreviewProps {
  slides: string[]
  onClose: () => void
}

export function CarouselPreview({ slides, onClose }: CarouselPreviewProps) {
  const [current, setCurrent] = useState(0)

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl overflow-hidden max-w-sm w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <p className="text-sm font-medium text-slate-700">
            Slide {current + 1} / {slides.length}
          </p>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-lg leading-none">
            ×
          </button>
        </div>

        {/* Slide image */}
        <div className="aspect-square bg-slate-100 relative overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={slides[current]}
            alt={`Slide ${current + 1}`}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between px-4 py-3">
          <button
            disabled={current === 0}
            onClick={() => setCurrent((c) => c - 1)}
            className="text-sm text-slate-600 hover:text-slate-900 disabled:opacity-30 font-medium"
          >
            ← Prev
          </button>

          {/* Dot indicators */}
          <div className="flex gap-1">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i === current ? 'bg-violet-600' : 'bg-slate-300'
                }`}
              />
            ))}
          </div>

          <button
            disabled={current === slides.length - 1}
            onClick={() => setCurrent((c) => c + 1)}
            className="text-sm text-slate-600 hover:text-slate-900 disabled:opacity-30 font-medium"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  )
}
