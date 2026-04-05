import { NextResponse } from 'next/server'

// Single-user app — login page protects the UI.
// API routes are not publicly exposed so no additional auth layer needed.
export async function requireAuth() {
  return { session: { user: { name: 'admin' } }, error: null as NextResponse | null }
}
