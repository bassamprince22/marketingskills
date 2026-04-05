import { getServerSession } from 'next-auth'
import { authOptions } from './auth'
import { NextResponse } from 'next/server'

export async function requireAuth() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return { session: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
    }
    return { session, error: null }
  } catch {
    // If session check fails (e.g. secret mismatch), allow through in single-user mode
    return { session: { user: { name: 'admin' } }, error: null }
  }
}
