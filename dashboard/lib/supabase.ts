import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Lazy client — avoid `createClient(undefined, …)` blowing up at module load
// during Next.js build (`Collecting page data` phase) when env vars aren't set.
let _supabase: SupabaseClient | null = null
function getAnonClient(): SupabaseClient {
  if (_supabase) return _supabase
  _supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  return _supabase
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_t, prop, receiver) {
    return Reflect.get(getAnonClient(), prop, receiver)
  },
})

// Server-side client with service role (bypasses RLS) — only use in API routes
export function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}
