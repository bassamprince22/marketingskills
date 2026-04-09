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
    } & DefaultSession['user']
  }
  interface User {
    id: string
    name: string
    email: string
    role: 'manager' | 'rep' | 'admin'
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: 'manager' | 'rep' | 'admin'
    name: string
    email: string
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
        try {
          const db = getServiceClient()
          const { data: user } = await db
            .from('sales_users')
            .select('id, name, email, username, role, password_hash, is_active')
            .eq('username', credentials.username.toLowerCase().trim())
            .eq('is_active', true)
            .single()
          if (!user) return null
          const valid = await bcrypt.compare(credentials.password, user.password_hash)
          if (!valid) return null
          return { id: user.id, name: user.name, email: user.email, role: user.role }
        } catch {
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
          return { id: '1', name: 'Admin', email: 'admin@local', role: 'admin' as const }
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
        token.id    = user.id
        token.role  = user.role
        token.name  = user.name
        token.email = user.email
      }
      return token
    },
    async session({ session, token }) {
      session.user = {
        id:    token.id,
        name:  token.name,
        email: token.email ?? '',
        role:  token.role,
        image: null,
      }
      return session
    },
  },
}
