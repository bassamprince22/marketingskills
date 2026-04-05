import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { ControlClient } from './ControlClient'

export default async function ControlPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  return <ControlClient />
}
