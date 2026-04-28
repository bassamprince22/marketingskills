import type { NextAuthOptions, DefaultSession } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { createClient } from '@supabase/supabase-js'

// Extend the built-in session types
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name: string
      email: string
      role: 'manager' | 'rep' | 'admin'
      orgId: string
      orgName: string
      image?: string | null
    } & DefaultSession['user']
  }
  interface User {
    id: string
    name: string
    email: string
    role: 'manager' | 'rep' | 'admin'
    orgId: string
    orgName: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: 'manager' | 'rep' | 'admin'
    name: string
    email: string
    orgId: string
    orgName: string
  }
}

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    // Sales system: username + password per user (stored in sales_users table)
    CredentialsProvider({
      id: 'sales',
      name: 'Sales Login',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null
        console.log('[auth] attempt for:', credentials.username)
        console.log('[auth] supabase url:', process.env.NEXT_PUBLIC_SUPABASE_URL)
        console.log('[auth] service key set:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)
        try {
          const db = getServiceClient()
          const { data: user, error: dbErr } = await db
            .from('sales_users')
            .select('id, name, email, username, role, password_hash, is_active, org_id')
            .eq('username', credentials.username.toLowerCase().trim())
            .eq('is_active', true)
            .single()
          console.log('[auth] user found:', !!user, '| db error:', dbErr?.message ?? 'none')
          if (!user) return null
          const valid = await bcrypt.compare(credentials.password, user.password_hash)
          console.log('[auth] password valid:', valid)
          if (!valid) return null

          const orgId = user.org_id ?? 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
          const { data: org } = await db
            .from('orgs')
            .select('name')
            .eq('id', orgId)
            .single()

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            orgId,
            orgName: org?.name ?? 'Fadaa',
          }
        } catch (e) {
          console.error('[auth] exception:', e)
          return null
        }
      },
    }),

    // Legacy social dashboard: single shared password
    CredentialsProvider({
      id: 'password',
      name: 'Password',
      credentials: {
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.password) return null
        if (credentials.password === process.env.DASHBOARD_PASSWORD) {
          return {
            id: '1',
            name: 'Admin',
            email: 'admin@local',
            role: 'admin' as const,
            orgId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
            orgName: 'Fadaa',
          }
        }
        return null
      },
    }),
  ],
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: '/sales/login' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id      = user.id
        token.role    = user.role
        token.name    = user.name
        token.email   = user.email
        token.orgId   = user.orgId
        token.orgName = user.orgName
      }
      // Backfill orgId for sessions that predate multi-tenancy
      if (!token.orgId && token.id) {
        try {
          const db = getServiceClient()
          const { data: u } = await db.from('sales_users').select('org_id').eq('id', token.id).single()
          if (u?.org_id) {
            token.orgId = u.org_id
            const { data: org } = await db.from('orgs').select('name').eq('id', u.org_id).single()
            token.orgName = org?.name ?? 'Fadaa'
          } else {
            token.orgId   = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
            token.orgName = 'Fadaa'
          }
        } catch {
          token.orgId   = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
          token.orgName = 'Fadaa'
        }
      }
      return token
    },
    async session({ session, token }) {
      session.user = {
        id:      token.id,
        name:    token.name,
        email:   token.email ?? '',
        role:    token.role,
        orgId:   token.orgId,
        orgName: token.orgName,
        image:   null,
      }
      return session
    },
  },
}
