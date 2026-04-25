import { NextRequest, NextResponse } from 'next/server'

interface RateLimitOptions {
  max:    number
  window: number // ms
}

const store = new Map<string, number[]>()

function getKey(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown'
  return ip
}

export function checkRateLimit(req: NextRequest, opts: RateLimitOptions): NextResponse | null {
  const now = Date.now()
  const key = getKey(req)
  const hits = (store.get(key) ?? []).filter((t) => now - t < opts.window)
  hits.push(now)
  store.set(key, hits)

  if (hits.length > opts.max) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil(opts.window / 1000)),
          'X-RateLimit-Limit': String(opts.max),
          'X-RateLimit-Remaining': '0',
        },
      }
    )
  }
  return null
}

export const DEFAULT_LIMIT: RateLimitOptions = { max: 60,  window: 60_000 }
export const AUTH_LIMIT:    RateLimitOptions = { max: 5,   window: 900_000 }
export const IMPORT_LIMIT:  RateLimitOptions = { max: 10,  window: 300_000 }
export const AI_LIMIT:      RateLimitOptions = { max: 20,  window: 60_000 }
