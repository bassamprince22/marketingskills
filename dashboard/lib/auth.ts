import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Password',
      credentials: {
        password: { label: 'Password', type: 'password', placeholder: 'Enter dashboard password' },
      },
      async authorize(credentials) {
        if (!credentials?.password) return null
        if (credentials.password === process.env.DASHBOARD_PASSWORD) {
          return { id: '1', name: 'Admin' }
        }
        return null
      },
    }),
  ],
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: '/login' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id
      return token
    },
    async session({ session, token }) {
      if (token) session.user = { name: 'Admin', email: '', image: '' }
      return session
    },
  },
}
