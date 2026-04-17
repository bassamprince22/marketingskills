// Email reporter — all sends are conditional on RESEND_API_KEY being set

const RESEND_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL = process.env.RESEND_FROM ?? 'noreply@fadaa.app'

async function send(to: string[], subject: string, html: string) {
  if (!RESEND_KEY) return
  try {
    const { Resend } = await import('resend')
    const resend = new Resend(RESEND_KEY)
    await resend.emails.send({ from: FROM_EMAIL, to, subject, html })
  } catch (e) {
    console.error('Email send failed:', e)
  }
}

export async function sendReportReminderEmail(
  managerEmails: string[],
  missingReps: { name: string; email: string }[],
  submittedCount: number,
) {
  if (!RESEND_KEY || managerEmails.length === 0) return

  const repList = missingReps.map(r => `<li>${r.name} (${r.email})</li>`).join('')
  const html = `
    <h2>Daily Report Reminder</h2>
    <p>${submittedCount} rep(s) have submitted today's report.</p>
    <p><strong>${missingReps.length} rep(s) have NOT submitted yet:</strong></p>
    <ul>${repList}</ul>
    <p>Please follow up with them to ensure they submit before end of day.</p>
  `
  await send(managerEmails, '📋 Daily Report Reminder', html)
}

export async function sendChallengeAnnouncementEmail(
  repEmails: string[],
  challenge: { title: string; description?: string | null; start_date: string; end_date?: string | null; target_amount?: number | null },
) {
  if (!RESEND_KEY || repEmails.length === 0) return

  const html = `
    <h2>🏆 New Sales Challenge: ${challenge.title}</h2>
    ${challenge.description ? `<p>${challenge.description}</p>` : ''}
    <p><strong>Start:</strong> ${challenge.start_date}</p>
    ${challenge.end_date ? `<p><strong>End:</strong> ${challenge.end_date}</p>` : ''}
    ${challenge.target_amount ? `<p><strong>Target:</strong> $${Number(challenge.target_amount).toLocaleString()}</p>` : ''}
    <p>Log in to see the leaderboard and compete for rewards!</p>
  `
  await send(repEmails, `🏆 New Challenge: ${challenge.title}`, html)
}

export async function sendRewardAchievedEmail(
  repEmail: string,
  repName: string,
  reward: { title: string; badge_emoji?: string; cash_amount?: number | null },
  challenge: { title: string },
) {
  if (!RESEND_KEY) return

  const html = `
    <h2>${reward.badge_emoji ?? '🏆'} Congratulations, ${repName}!</h2>
    <p>You've achieved <strong>${reward.title}</strong> in the <strong>${challenge.title}</strong> challenge!</p>
    ${reward.cash_amount ? `<p><strong>Cash reward: $${Number(reward.cash_amount).toLocaleString()}</strong></p>` : ''}
    <p>Log in to claim your reward.</p>
  `
  await send([repEmail], `🏆 You've earned ${reward.title}!`, html)
}
