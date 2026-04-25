import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { checkAndIncrementAiUsage, callAi } from '@/lib/sales/ai'
import { checkRateLimit, AI_LIMIT } from '@/lib/rateLimit'
import { z } from 'zod'

const schema = z.object({
  action:  z.enum(['chat', 'score_lead', 'draft_followup', 'summarize_meeting', 'suggest_contract_terms', 'analyze_pipeline']),
  context: z.record(z.string(), z.unknown()),
})

const PROMPTS: Record<string, { system: string; userFn: (ctx: Record<string, unknown>) => string }> = {
  chat: {
    system: [
      'You are Fadaa AI Assistance, a CRM copilot for Fadaa sales teams.',
      'Help users with follow-ups, daily updates, lead prioritization, meeting prep, notes, reminders, proposal wording, and CRM workflow questions.',
      'Be practical, concise, and action-oriented. If the user writes Arabic, answer in Arabic. If they write English, answer in English.',
      'Do not pretend to perform database changes, send messages, or update CRM records unless a real tool/result is provided. Instead, draft the text or give exact next steps.',
      'When useful, structure the answer as: Quick answer, Suggested message, Next CRM step.',
    ].join(' '),
    userFn: (ctx) => {
      const messages = Array.isArray(ctx.messages) ? ctx.messages : []
      const recent = messages
        .slice(-10)
        .map((message) => {
          if (!message || typeof message !== 'object') return ''
          const role = 'role' in message ? String(message.role) : 'user'
          const content = 'content' in message ? String(message.content) : ''
          return `${role}: ${content}`
        })
        .filter(Boolean)
        .join('\n')

      return [
        `Current page: ${String(ctx.page ?? 'unknown')}`,
        `User role: ${String(ctx.role ?? 'unknown')}`,
        `Request context: ${JSON.stringify(ctx.context ?? {})}`,
        'Conversation:',
        recent,
      ].join('\n')
    },
  },
  score_lead: {
    system: 'You are a sales analyst. Score this lead 1-10 for conversion likelihood based on the provided data. Respond only with valid JSON: {"score": number, "reasons": string[], "next_action": string}',
    userFn: (ctx) => JSON.stringify(ctx),
  },
  draft_followup: {
    system: 'You are a sales rep assistant. Write a short, professional follow-up email in the same language suggested by the lead name or explicitly specified. Keep it under 150 words. Respond with plain text only — no subject line prefix, no JSON.',
    userFn: (ctx) => JSON.stringify(ctx),
  },
  summarize_meeting: {
    system: 'Summarize these meeting notes into three sections: "Key Points", "Action Items", and "Next Steps". Keep each section as a brief bullet list. Respond in plain text.',
    userFn: (ctx) => String(ctx.notes ?? JSON.stringify(ctx)),
  },
  suggest_contract_terms: {
    system: 'Based on this deal data, suggest appropriate contract terms, pricing structure, and payment schedule. Keep it concise and practical. Respond in plain text.',
    userFn: (ctx) => JSON.stringify(ctx),
  },
  analyze_pipeline: {
    system: 'You are a sales manager advisor. Analyze this pipeline data and identify: top risks, best opportunities, and recommended actions for this week. Respond in plain text with clear headers.',
    userFn: (ctx) => JSON.stringify(ctx),
  },
}

export async function POST(req: NextRequest) {
  const limited = checkRateLimit(req, AI_LIMIT)
  if (limited) return limited

  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { orgId } = session.user as { orgId: string }

  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const { action, context } = parsed.data
  const prompt = PROMPTS[action]

  let usage
  try {
    usage = await checkAndIncrementAiUsage(orgId)
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string; isTrial?: boolean }
    if (e?.code === 'AI_LIMIT') {
      return NextResponse.json({
        error:   e.message,
        code:    'AI_LIMIT',
        isTrial: e.isTrial ?? false,
        upgrade: '/sales/billing',
      }, { status: 402 })
    }
    return NextResponse.json({ error: e?.message ?? 'Failed to check AI usage' }, { status: 500 })
  }

  try {
    const result = await callAi([
      { role: 'system', content: prompt.system },
      { role: 'user',   content: prompt.userFn(context) },
    ])

    const baseResponse = {
      usage: {
        used:      usage.used,
        limit:     usage.limit,
        remaining: usage.remaining,
        isTrial:   usage.isTrial,
      },
    }

    if (action === 'score_lead') {
      try {
        return NextResponse.json({ ...baseResponse, result: JSON.parse(result) })
      } catch {
        return NextResponse.json({ ...baseResponse, result })
      }
    }

    return NextResponse.json({ ...baseResponse, result })
  } catch (err) {
    console.error('AI error:', err)
    const message = err instanceof Error ? err.message : 'AI request failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
