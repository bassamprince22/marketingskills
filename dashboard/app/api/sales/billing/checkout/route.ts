import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getServiceClient } from '@/lib/supabase'
import { z } from 'zod'

const schema = z.object({
  plan: z.enum(['starter', 'pro', 'enterprise']),
})

const PRICE_IDS: Record<string, string | undefined> = {
  starter:    process.env.STRIPE_STARTER_PRICE_ID,
  pro:        process.env.STRIPE_PRO_PRICE_ID,
  enterprise: process.env.STRIPE_ENTERPRISE_PRICE_ID,
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { orgId } = session.user as { orgId: string; email: string }

  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })

  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) {
    return NextResponse.json({ error: 'Billing not configured' }, { status: 503 })
  }

  const priceId = PRICE_IDS[parsed.data.plan]
  if (!priceId) {
    return NextResponse.json({ error: `No price ID configured for plan: ${parsed.data.plan}` }, { status: 503 })
  }

  const db = getServiceClient()
  const { data: org } = await db.from('orgs').select('stripe_customer_id, name').eq('id', orgId).single()

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Stripe = require('stripe')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stripe = new Stripe(stripeKey) as any

  let customerId = org?.stripe_customer_id
  if (!customerId) {
    const customer = await stripe.customers.create({
      name:     org?.name ?? undefined,
      email:    (session.user as { email?: string }).email ?? undefined,
      metadata: { org_id: orgId },
    })
    customerId = customer.id
    await db.from('orgs').update({ stripe_customer_id: customerId }).eq('id', orgId)
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    customer:   customerId,
    mode:       'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXTAUTH_URL}/sales/billing?success=1`,
    cancel_url:  `${process.env.NEXTAUTH_URL}/sales/billing`,
    metadata:    { org_id: orgId, plan: parsed.data.plan },
  })

  return NextResponse.json({ url: checkoutSession.url })
}
