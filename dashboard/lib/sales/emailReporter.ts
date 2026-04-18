// Email reporter — all sends are conditional on RESEND_API_KEY being set

function getKey()  { return process.env.RESEND_API_KEY }
function getFrom() { return process.env.RESEND_FROM ?? 'onboarding@resend.dev' }

/* ── Shared HTML wrapper ─────────────────────────────────────────────── */
function wrapHtml(body: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0A0E1A;font-family:'Segoe UI',Arial,sans-serif;color:#E2E8F0;">
  <div style="max-width:600px;margin:0 auto;padding:32px 20px;">
    <div style="text-align:center;margin-bottom:28px;">
      <span style="font-size:22px;font-weight:900;letter-spacing:0.06em;background:linear-gradient(90deg,#4F8EF7,#7C3AED);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">
        ◈ FADAA SALES
      </span>
    </div>
    <div style="background:#0F1629;border:1px solid #1E2D4A;border-radius:16px;padding:28px 32px;">
      ${body}
    </div>
    <p style="text-align:center;color:#64748B;font-size:11px;margin-top:24px;">
      This is an automated notification from your Fadaa Sales CRM.
    </p>
  </div>
</body>
</html>`
}

/* ── Core sender ─────────────────────────────────────────────────────── */
async function send(to: string[], subject: string, html: string) {
  const key = getKey()
  if (!key || to.length === 0) return
  try {
    const { Resend } = await import('resend')
    const resend = new Resend(key)
    const result = await resend.emails.send({
      from: `Fadaa Sales <${getFrom()}>`,
      to,
      subject,
      html: wrapHtml(html),
    })
    if (result.error) {
      console.error('Resend error:', result.error)
    }
  } catch (e) {
    console.error('Email send failed:', e)
  }
}

/* ── Report reminder ─────────────────────────────────────────────────── */
export async function sendReportReminderEmail(
  managerEmails: string[],
  missingReps: { name: string; email?: string | null }[],
  submittedCount: number,
) {
  if (!getKey() || managerEmails.length === 0) return

  const repRows = missingReps
    .map(r => `<tr>
      <td style="padding:8px 12px;color:#E2E8F0;font-size:13px;">${r.name}</td>
      <td style="padding:8px 12px;color:#64748B;font-size:13px;">${r.email ?? '—'}</td>
      <td style="padding:8px 12px;">
        <span style="color:#F59E0B;background:rgba(245,158,11,0.1);padding:2px 10px;border-radius:999px;font-size:11px;font-weight:700;">PENDING</span>
      </td>
    </tr>`)
    .join('')

  const html = `
    <h2 style="color:#E2E8F0;font-size:20px;font-weight:700;margin:0 0 6px;">📋 Daily Report Reminder</h2>
    <p style="color:#64748B;font-size:13px;margin:0 0 24px;">${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>

    <div style="display:flex;gap:16px;margin-bottom:24px;">
      <div style="flex:1;background:rgba(74,222,128,0.08);border:1px solid rgba(74,222,128,0.2);border-radius:10px;padding:14px 18px;text-align:center;">
        <p style="color:#4ADE80;font-size:28px;font-weight:800;margin:0;">${submittedCount}</p>
        <p style="color:#64748B;font-size:11px;margin:4px 0 0;">Submitted</p>
      </div>
      <div style="flex:1;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);border-radius:10px;padding:14px 18px;text-align:center;">
        <p style="color:#F59E0B;font-size:28px;font-weight:800;margin:0;">${missingReps.length}</p>
        <p style="color:#64748B;font-size:11px;margin:4px 0 0;">Not Submitted</p>
      </div>
    </div>

    <p style="color:#94A3B8;font-size:13px;margin:0 0 12px;font-weight:600;">Reps who haven't submitted yet:</p>
    <table style="width:100%;border-collapse:collapse;border-radius:10px;overflow:hidden;">
      <thead>
        <tr style="background:rgba(255,255,255,0.04);">
          <th style="padding:8px 12px;text-align:left;color:#64748B;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;">Name</th>
          <th style="padding:8px 12px;text-align:left;color:#64748B;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;">Email</th>
          <th style="padding:8px 12px;text-align:left;color:#64748B;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;">Status</th>
        </tr>
      </thead>
      <tbody>${repRows}</tbody>
    </table>

    <p style="color:#64748B;font-size:12px;margin:20px 0 0;line-height:1.6;">
      Please follow up with these reps to ensure they submit their daily report before end of day.
    </p>
  `

  await send(managerEmails, `📋 Daily Report Reminder — ${missingReps.length} pending`, html)
}

/* ── Challenge announcement ──────────────────────────────────────────── */
export async function sendChallengeAnnouncementEmail(
  repEmails: string[],
  challenge: {
    title: string
    description?: string | null
    start_date: string
    end_date?: string | null
    target_amount?: number | null
  },
) {
  if (!getKey() || repEmails.length === 0) return

  const html = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:52px;margin-bottom:8px;">🏆</div>
      <h2 style="color:#E2E8F0;font-size:22px;font-weight:800;margin:0 0 6px;">New Challenge Live!</h2>
      <p style="color:#4F8EF7;font-size:16px;font-weight:700;margin:0;">${challenge.title}</p>
    </div>

    ${challenge.description ? `<p style="color:#94A3B8;font-size:14px;line-height:1.6;text-align:center;margin:0 0 24px;">${challenge.description}</p>` : ''}

    <div style="background:rgba(79,142,247,0.06);border:1px solid rgba(79,142,247,0.2);border-radius:12px;padding:18px 20px;margin-bottom:24px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:6px 0;color:#64748B;font-size:12px;width:40%;">START DATE</td>
          <td style="padding:6px 0;color:#E2E8F0;font-size:13px;font-weight:600;">${challenge.start_date}</td>
        </tr>
        ${challenge.end_date ? `<tr>
          <td style="padding:6px 0;color:#64748B;font-size:12px;">END DATE</td>
          <td style="padding:6px 0;color:#E2E8F0;font-size:13px;font-weight:600;">${challenge.end_date}</td>
        </tr>` : ''}
        ${challenge.target_amount ? `<tr>
          <td style="padding:6px 0;color:#64748B;font-size:12px;">TARGET</td>
          <td style="padding:6px 0;color:#4ADE80;font-size:14px;font-weight:800;">$${Number(challenge.target_amount).toLocaleString()}</td>
        </tr>` : ''}
      </table>
    </div>

    <p style="color:#64748B;font-size:13px;text-align:center;margin:0;">
      Log in to your Fadaa dashboard to view the leaderboard and start competing!
    </p>
  `

  await send(repEmails, `🏆 New Challenge: ${challenge.title}`, html)
}

/* ── Reward achieved ─────────────────────────────────────────────────── */
export async function sendRewardAchievedEmail(
  repEmail: string,
  repName: string,
  reward: { title: string; badge_emoji?: string; cash_amount?: number | null },
  challenge: { title: string },
) {
  if (!getKey() || !repEmail) return

  const html = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:64px;margin-bottom:8px;">${reward.badge_emoji ?? '🏆'}</div>
      <h2 style="color:#E2E8F0;font-size:22px;font-weight:800;margin:0 0 6px;">Congratulations, ${repName}!</h2>
      <p style="color:#64748B;font-size:14px;margin:0;">You've earned a reward in <strong style="color:#4F8EF7;">${challenge.title}</strong></p>
    </div>

    <div style="background:rgba(124,58,237,0.08);border:1px solid rgba(124,58,237,0.25);border-radius:12px;padding:20px 24px;text-align:center;margin-bottom:24px;">
      <p style="color:#A78BFA;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 8px;">Your Reward</p>
      <p style="color:#E2E8F0;font-size:18px;font-weight:700;margin:0 0 8px;">${reward.title}</p>
      ${reward.cash_amount ? `<p style="color:#4ADE80;font-size:28px;font-weight:800;margin:0;">+$${Number(reward.cash_amount).toLocaleString()}</p>` : ''}
    </div>

    <p style="color:#64748B;font-size:13px;text-align:center;margin:0;line-height:1.6;">
      Log in to your Fadaa dashboard to claim your reward and see your ranking on the leaderboard.
    </p>
  `

  await send([repEmail], `${reward.badge_emoji ?? '🏆'} You've earned: ${reward.title}!`, html)
}
