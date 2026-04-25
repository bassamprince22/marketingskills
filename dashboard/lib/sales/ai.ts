import OpenAI from 'openai'
import { getServiceClient } from '@/lib/supabase'

let _client: OpenAI | null = null

function getClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return _client
}

export async function checkAndIncrementAiUsage(orgId: string): Promise<void> {
  const db = getServiceClient()
  const { data: org } = await db
    .from('orgs')
    .select('ai_calls_used, ai_calls_limit')
    .eq('id', orgId)
    .single()

  if (!org) throw new Error('Org not found')
  if (org.ai_calls_used >= org.ai_calls_limit) {
    throw Object.assign(new Error('AI call limit reached'), { code: 'AI_LIMIT' })
  }

  await db
    .from('orgs')
    .update({ ai_calls_used: org.ai_calls_used + 1 })
    .eq('id', orgId)
}

type ChatMessage = { role: 'system' | 'user'; content: string }

export async function callAi(messages: ChatMessage[]): Promise<string> {
  const client = getClient()
  const completion = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    max_tokens: 800,
    temperature: 0.4,
  })
  return completion.choices[0]?.message?.content ?? ''
}
