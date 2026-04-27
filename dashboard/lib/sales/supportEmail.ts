function getKey() {
  return process.env.RESEND_API_KEY
}

function getFrom() {
  return process.env.RESEND_FROM ?? 'onboarding@resend.dev'
}

function getSupportEmail() {
  return process.env.SUPPORT_EMAIL ?? process.env.FADAA_SUPPORT_EMAIL
}

function escapeHtml(value: string | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function wrapSupportHtml(body: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0A0E1A;font-family:'Segoe UI',Arial,sans-serif;color:#E2E8F0;">
  <div style="max-width:640px;margin:0 auto;padding:32px 20px;">
    <div style="text-align:center;margin-bottom:28px;">
      <span style="font-size:22px;font-weight:900;letter-spacing:0.06em;color:#E2E8F0;">FADAA SUPPORT</span>
    </div>
    <div style="background:#0F1629;border:1px solid #1E2D4A;border-radius:18px;padding:28px 32px;">
      ${body}
    </div>
    <p style="text-align:center;color:#64748B;font-size:11px;margin-top:24px;">
      This ticket was sent from the Fadaa SaaS support widget.
    </p>
  </div>
</body>
</html>`
}

export async function sendSupportTicketEmail(ticket: {
  ticketId: string
  subject: string
  category: string
  priority: string
  orgName: string
  requesterName: string
  requesterEmail?: string | null
  message: string
  appUrl?: string
}) {
  const key = getKey()
  const supportEmail = getSupportEmail()
  if (!key || !supportEmail) return false

  const priorityColor = ticket.priority === 'urgent' ? '#F87171' : '#7CB9FC'
  const html = wrapSupportHtml(`
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:48px;margin-bottom:10px;">?</div>
      <h2 style="color:#E2E8F0;font-size:22px;font-weight:800;margin:0 0 6px;">New Customer Support Ticket</h2>
      <p style="color:#7CB9FC;font-size:14px;font-weight:700;margin:0;">${escapeHtml(ticket.orgName)}</p>
    </div>

    <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:18px 20px;margin-bottom:18px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:6px 0;color:#64748B;font-size:12px;width:36%;">TICKET</td><td style="padding:6px 0;color:#E2E8F0;font-size:13px;font-weight:700;">#${escapeHtml(ticket.ticketId.slice(0, 8))}</td></tr>
        <tr><td style="padding:6px 0;color:#64748B;font-size:12px;">SUBJECT</td><td style="padding:6px 0;color:#E2E8F0;font-size:13px;font-weight:700;">${escapeHtml(ticket.subject)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748B;font-size:12px;">REQUESTER</td><td style="padding:6px 0;color:#E2E8F0;font-size:13px;font-weight:600;">${escapeHtml(ticket.requesterName)} &lt;${escapeHtml(ticket.requesterEmail ?? 'no email')}&gt;</td></tr>
        <tr><td style="padding:6px 0;color:#64748B;font-size:12px;">CATEGORY</td><td style="padding:6px 0;color:#E2E8F0;font-size:13px;font-weight:600;">${escapeHtml(ticket.category)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748B;font-size:12px;">PRIORITY</td><td style="padding:6px 0;color:${priorityColor};font-size:13px;font-weight:800;text-transform:uppercase;">${escapeHtml(ticket.priority)}</td></tr>
      </table>
    </div>

    <div style="background:rgba(79,142,247,0.06);border:1px solid rgba(79,142,247,0.18);border-radius:12px;padding:18px 20px;margin-bottom:18px;">
      <p style="color:#94A3B8;font-size:12px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 10px;">Message</p>
      <p style="color:#E2E8F0;font-size:14px;line-height:1.7;margin:0;white-space:pre-wrap;">${escapeHtml(ticket.message)}</p>
    </div>

    <p style="color:#64748B;font-size:12px;text-align:center;margin:0;line-height:1.6;">
      Reply to the requester by email, or open the customer workspace support inbox when platform support tools are enabled.
      ${ticket.appUrl ? `<br><span style="color:#7CB9FC;">${escapeHtml(ticket.appUrl)}</span>` : ''}
    </p>
  `)

  try {
    const { Resend } = await import('resend')
    const resend = new Resend(key)
    const result = await resend.emails.send({
      from: `Fadaa Support <${getFrom()}>`,
      to: [supportEmail],
      replyTo: ticket.requesterEmail ? ticket.requesterEmail : undefined,
      subject: `[Fadaa Support] ${ticket.priority === 'urgent' ? 'URGENT: ' : ''}${ticket.orgName} - ${ticket.subject}`,
      html,
    })
    if (result.error) {
      console.error('Support email resend error:', result.error)
      return false
    }
    return true
  } catch (error) {
    console.error('Support email send failed:', error)
    return false
  }
}
