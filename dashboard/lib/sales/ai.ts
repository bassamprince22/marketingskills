import OpenAI from 'openai'
import { getServiceClient } from '@/lib/supabase'

let _client: OpenAI | null = null

function getClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured in Vercel environment variables.')
  }
  if (!_client) {
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return _client
}

export interface AiUsage {
  used:      number
  limit:     number
  remaining: number
  plan:      string
  isTrial:   boolean
}

export async function checkAndIncrementAiUsage(orgId: string): Promise<AiUsage> {
  const db = getServiceClient()
  const { data: org } = await db
    .from('orgs')
    .select('ai_calls_used, ai_calls_limit, plan')
    .eq('id', orgId)
    .single()

  if (!org) throw new Error('AI usage is not configured for this workspace. Make sure the orgs table exists and your user has an org_id.')

  const isTrial   = org.plan === 'trial'
  const remaining = org.ai_calls_limit - org.ai_calls_used

  if (remaining <= 0) {
    const err = Object.assign(
      new Error(
        isTrial
          ? `You've used all ${org.ai_calls_limit} free AI calls on your trial. Upgrade to continue.`
          : `Monthly AI call limit of ${org.ai_calls_limit} reached. Upgrade your plan for more.`
      ),
      { code: 'AI_LIMIT', isTrial }
    )
    throw err
  }

  await db
    .from('orgs')
    .update({ ai_calls_used: org.ai_calls_used + 1 })
    .eq('id', orgId)

  return {
    used:      org.ai_calls_used + 1,
    limit:     org.ai_calls_limit,
    remaining: remaining - 1,
    plan:      org.plan,
    isTrial,
  }
}

type ChatMessage = { role: 'system' | 'user'; content: string }

export async function callAi(messages: ChatMessage[]): Promise<string> {
  const client = getClient()
  const completion = await client.chat.completions.create({
    model:       'gpt-4o-mini',
    messages,
    max_tokens:  800,
    temperature: 0.4,
  })
  return completion.choices[0]?.message?.content ?? ''
}
