import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { WorkspacesClient } from './WorkspacesClient'

export default async function WorkspacesPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  return <WorkspacesClient />
}
