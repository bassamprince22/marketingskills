export default function DataDeletionPage() {
  return (
    <div style={{ background: '#0A0E1A', minHeight: '100vh', color: '#E2E8F0', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '60px 24px' }}>
        <p style={{ color: '#4F8EF7', fontWeight: 700, fontSize: 14, letterSpacing: '0.08em', marginBottom: 12 }}>✦ FADAA SALES</p>
        <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>Data Deletion Request</h1>
        <p style={{ color: '#64748B', fontSize: 14, marginBottom: 40 }}>Facebook Data Deletion Instructions</p>

        <div style={{ background: '#0F1629', border: '1px solid #1E2D4A', borderRadius: 12, padding: 28, marginBottom: 36 }}>
          <p style={{ color: '#4ADE80', fontWeight: 600, fontSize: 15, marginBottom: 8 }}>✓ Your data deletion request will be honored</p>
          <p style={{ color: '#94A3B8', lineHeight: 1.7, fontSize: 14 }}>
            If you have connected your Facebook account to Fadaa Sales and wish to have your data removed,
            follow the steps below. We will delete all associated lead data, page tokens, and activity logs
            within 30 days of receiving your request.
          </p>
        </div>

        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#4F8EF7', marginBottom: 16 }}>Option 1 — Disconnect from Facebook Settings</h2>
          <ol style={{ color: '#94A3B8', lineHeight: 2, paddingLeft: 20 }}>
            <li>Go to <strong style={{ color: '#E2E8F0' }}>Facebook Settings</strong> → <strong style={{ color: '#E2E8F0' }}>Apps and Websites</strong></li>
            <li>Find <strong style={{ color: '#E2E8F0' }}>Fadaa Sales</strong> in the list</li>
            <li>Click <strong style={{ color: '#E2E8F0' }}>Remove</strong></li>
            <li>Facebook will notify us and we will delete all associated data within 30 days</li>
          </ol>
        </section>

        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#4F8EF7', marginBottom: 16 }}>Option 2 — Disconnect from the Application</h2>
          <ol style={{ color: '#94A3B8', lineHeight: 2, paddingLeft: 20 }}>
            <li>Log in to <strong style={{ color: '#E2E8F0' }}>Fadaa Sales</strong></li>
            <li>Go to <strong style={{ color: '#E2E8F0' }}>Integrations</strong></li>
            <li>Click <strong style={{ color: '#E2E8F0' }}>Disconnect</strong> on the Meta Lead Ads card</li>
            <li>Your page tokens and integration data will be deleted immediately</li>
          </ol>
        </section>

        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#4F8EF7', marginBottom: 16 }}>Option 3 — Email Deletion Request</h2>
          <p style={{ color: '#94A3B8', lineHeight: 1.7 }}>
            Send an email to <span style={{ color: '#4F8EF7' }}>admin@fadaa.app</span> with the subject line
            <strong style={{ color: '#E2E8F0' }}> "Data Deletion Request"</strong> and include:
          </p>
          <ul style={{ color: '#94A3B8', lineHeight: 1.9, paddingLeft: 20, marginTop: 12 }}>
            <li>Your full name</li>
            <li>The Facebook account email you used to connect</li>
            <li>The Facebook Page name(s) that were connected</li>
          </ul>
          <p style={{ color: '#94A3B8', lineHeight: 1.7, marginTop: 12 }}>
            We will confirm deletion within 7 business days and complete all data removal within 30 days.
          </p>
        </section>

        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#4F8EF7', marginBottom: 12 }}>What Data We Delete</h2>
          <ul style={{ color: '#94A3B8', lineHeight: 1.9, paddingLeft: 20 }}>
            <li>Facebook Page access tokens</li>
            <li>Integration configuration and connection records</li>
            <li>Webhook activity logs associated with your account</li>
            <li>Lead records imported from your Facebook Pages (upon request)</li>
          </ul>
        </section>

        <div style={{ background: 'rgba(79,142,247,0.06)', border: '1px solid rgba(79,142,247,0.15)', borderRadius: 8, padding: '16px 20px', marginBottom: 36 }}>
          <p style={{ color: '#94A3B8', fontSize: 13, lineHeight: 1.6 }}>
            <strong style={{ color: '#E2E8F0' }}>Note:</strong> Disconnecting the integration stops future lead imports immediately.
            Existing lead records already in the CRM can be deleted upon request. We do not retain copies of your
            Facebook data after deletion.
          </p>
        </div>

        <div style={{ borderTop: '1px solid #1E2D4A', paddingTop: 24, display: 'flex', gap: 24 }}>
          <a href="/privacy" style={{ color: '#4F8EF7', fontSize: 13, textDecoration: 'none' }}>Privacy Policy</a>
          <a href="/terms" style={{ color: '#4F8EF7', fontSize: 13, textDecoration: 'none' }}>Terms of Service</a>
        </div>
      </div>
    </div>
  )
}
