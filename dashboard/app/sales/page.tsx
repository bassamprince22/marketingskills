import { redirect } from 'next/navigation'

// /sales → redirect to the dashboard
export default function SalesIndexPage() {
  redirect('/sales/dashboard')
}
