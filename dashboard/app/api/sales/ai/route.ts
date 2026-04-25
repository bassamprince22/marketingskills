import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { checkAndIncrementAiUsage, callAi } from '@/lib/sales/ai'
import { checkRateLimit, AI_LIMIT } from '@/lib/rateLimit'
import { z } from 'zod'

const schema = z.object({
  action:  z.enum(['score_lead', 'draft_followup', 'summarize_meeting', 'suggest_contract_terms', 'analyze_pipeline']),
  context: z.record(z.string(), z.unknown()),
})

const PROMPTS: Record<string, { system: string; userFn: (ctx: Record<string, unknown>) => string }> = {
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

  try {
    await checkAndIncrementAiUsage(orgId)
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string }
    if (e?.code === 'AI_LIMIT') {
      return NextResponse.json({ error: 'AI call limit reached. Upgrade your plan for more calls.' }, { status: 402 })
    }
    return NextResponse.json({ error: 'Failed to check AI usage' }, { status: 500 })
  }

  try {
    const result = await callAi([
      { role: 'system', content: prompt.system },
      { role: 'user',   content: prompt.userFn(context) },
    ])

    if (action === 'score_lead') {
      try {
        const json = JSON.parse(result)
        return NextResponse.json({ result: json })
      } catch {
        return NextResponse.json({ result })
      }
    }

    return NextResponse.json({ result })
  } catch (err) {
    console.error('AI error:', err)
    return NextResponse.json({ error: 'AI request failed' }, { status: 500 })
  }
}
