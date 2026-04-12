export default function PrivacyPage() {
  return (
    <div style={{ background: '#0A0E1A', minHeight: '100vh', color: '#E2E8F0', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '60px 24px' }}>
        <p style={{ color: '#4F8EF7', fontWeight: 700, fontSize: 14, letterSpacing: '0.08em', marginBottom: 12 }}>✦ FADAA SALES</p>
        <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>Privacy Policy</h1>
        <p style={{ color: '#64748B', fontSize: 14, marginBottom: 40 }}>Last updated: April 12, 2026</p>

        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#4F8EF7', marginBottom: 12 }}>1. Overview</h2>
          <p style={{ color: '#94A3B8', lineHeight: 1.7 }}>
            Fadaa Sales ("we", "us", or "our") is an internal sales CRM system. This Privacy Policy explains how we collect,
            use, and protect information when you use our application, including when you connect external services such as
            Facebook Lead Ads via our Meta integration.
          </p>
        </section>

        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#4F8EF7', marginBottom: 12 }}>2. Information We Collect</h2>
          <ul style={{ color: '#94A3B8', lineHeight: 1.9, paddingLeft: 20 }}>
            <li>Name, email address, and phone number of sales leads submitted via Facebook Lead Ads forms</li>
            <li>Facebook Page access tokens for authorized pages (stored encrypted in our database)</li>
            <li>Lead ad names, form IDs, and submission timestamps</li>
            <li>User account information for internal team members (name, email, role)</li>
          </ul>
        </section>

        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#4F8EF7', marginBottom: 12 }}>3. How We Use Your Information</h2>
          <ul style={{ color: '#94A3B8', lineHeight: 1.9, paddingLeft: 20 }}>
            <li>To import and manage sales leads within our internal CRM</li>
            <li>To track pipeline progress, meetings, and deal status</li>
            <li>To communicate with leads as part of our sales process</li>
            <li>We do not sell, rent, or share your data with third parties</li>
          </ul>
        </section>

        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#4F8EF7', marginBottom: 12 }}>4. Meta / Facebook Integration</h2>
          <p style={{ color: '#94A3B8', lineHeight: 1.7 }}>
            When you connect your Facebook account, we request access to your Facebook Pages and lead generation data.
            We use this access solely to retrieve leads submitted through Facebook Lead Ad forms and import them into
            your CRM pipeline. We do not post on your behalf or access personal profile information beyond what is required
            for lead retrieval.
          </p>
        </section>

        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#4F8EF7', marginBottom: 12 }}>5. Data Retention</h2>
          <p style={{ color: '#94A3B8', lineHeight: 1.7 }}>
            Lead data is retained as long as your account is active. You may request deletion of your data at any time
            by contacting us or using the data deletion link below. Access tokens are invalidated immediately upon
            disconnecting the Facebook integration.
          </p>
        </section>

        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#4F8EF7', marginBottom: 12 }}>6. Security</h2>
          <p style={{ color: '#94A3B8', lineHeight: 1.7 }}>
            We use Supabase with Row-Level Security (RLS) to ensure data is only accessible to authorized team members.
            All data is transmitted over HTTPS. Access tokens are stored securely and never exposed to the client.
          </p>
        </section>

        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#4F8EF7', marginBottom: 12 }}>7. Contact</h2>
          <p style={{ color: '#94A3B8', lineHeight: 1.7 }}>
            For privacy-related questions or data deletion requests, contact us at:<br />
            <span style={{ color: '#4F8EF7' }}>admin@fadaa.app</span>
          </p>
        </section>

        <div style={{ borderTop: '1px solid #1E2D4A', paddingTop: 24, display: 'flex', gap: 24 }}>
          <a href="/terms" style={{ color: '#4F8EF7', fontSize: 13, textDecoration: 'none' }}>Terms of Service</a>
          <a href="/data-deletion" style={{ color: '#4F8EF7', fontSize: 13, textDecoration: 'none' }}>Data Deletion</a>
        </div>
      </div>
    </div>
  )
}
