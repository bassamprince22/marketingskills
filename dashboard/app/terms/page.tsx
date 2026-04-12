export default function TermsPage() {
  return (
    <div style={{ background: '#0A0E1A', minHeight: '100vh', color: '#E2E8F0', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '60px 24px' }}>
        <p style={{ color: '#4F8EF7', fontWeight: 700, fontSize: 14, letterSpacing: '0.08em', marginBottom: 12 }}>✦ FADAA SALES</p>
        <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>Terms of Service</h1>
        <p style={{ color: '#64748B', fontSize: 14, marginBottom: 40 }}>Last updated: April 12, 2026</p>

        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#4F8EF7', marginBottom: 12 }}>1. Acceptance of Terms</h2>
          <p style={{ color: '#94A3B8', lineHeight: 1.7 }}>
            By accessing and using Fadaa Sales ("the Application"), you agree to be bound by these Terms of Service.
            This is an internal CRM system intended for authorized team members only. Unauthorized access is prohibited.
          </p>
        </section>

        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#4F8EF7', marginBottom: 12 }}>2. Use of the Application</h2>
          <ul style={{ color: '#94A3B8', lineHeight: 1.9, paddingLeft: 20 }}>
            <li>The Application is for internal sales team use only</li>
            <li>You must not share your login credentials with anyone outside the team</li>
            <li>You are responsible for all activity that occurs under your account</li>
            <li>You must not attempt to access data belonging to other users without authorization</li>
          </ul>
        </section>

        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#4F8EF7', marginBottom: 12 }}>3. Meta / Facebook Integration</h2>
          <p style={{ color: '#94A3B8', lineHeight: 1.7 }}>
            Connecting a Facebook account to this Application grants us permission to access your Facebook Pages
            and retrieve leads from Lead Ad forms. You may revoke this access at any time from within the Application
            or directly through your Facebook account settings. We use this integration solely for the purpose of
            importing sales leads into your CRM pipeline.
          </p>
        </section>

        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#4F8EF7', marginBottom: 12 }}>4. Data Ownership</h2>
          <p style={{ color: '#94A3B8', lineHeight: 1.7 }}>
            All lead data, customer information, and business data entered into the Application remains the property
            of your organization. We do not claim ownership over any data you input or that is imported via integrations.
          </p>
        </section>

        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#4F8EF7', marginBottom: 12 }}>5. Limitation of Liability</h2>
          <p style={{ color: '#94A3B8', lineHeight: 1.7 }}>
            The Application is provided "as is." We are not liable for any loss of data, missed leads, or business
            interruption arising from the use or inability to use this Application. Always maintain backups of
            critical business data.
          </p>
        </section>

        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#4F8EF7', marginBottom: 12 }}>6. Modifications</h2>
          <p style={{ color: '#94A3B8', lineHeight: 1.7 }}>
            We reserve the right to update these Terms at any time. Continued use of the Application after changes
            constitutes acceptance of the new Terms.
          </p>
        </section>

        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#4F8EF7', marginBottom: 12 }}>7. Contact</h2>
          <p style={{ color: '#94A3B8', lineHeight: 1.7 }}>
            Questions about these Terms? Contact us at:<br />
            <span style={{ color: '#4F8EF7' }}>admin@fadaa.app</span>
          </p>
        </section>

        <div style={{ borderTop: '1px solid #1E2D4A', paddingTop: 24, display: 'flex', gap: 24 }}>
          <a href="/privacy" style={{ color: '#4F8EF7', fontSize: 13, textDecoration: 'none' }}>Privacy Policy</a>
          <a href="/data-deletion" style={{ color: '#4F8EF7', fontSize: 13, textDecoration: 'none' }}>Data Deletion</a>
        </div>
      </div>
    </div>
  )
}
