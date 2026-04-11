import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { ScheduleClient } from './ScheduleClient'

export default async function SchedulePage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  return <ScheduleClient />
}
