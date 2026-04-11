import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { UploadsClient } from './UploadsClient'

export default async function UploadsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  return <UploadsClient />
}
