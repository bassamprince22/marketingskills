'use client'

import type { Meeting } from '@/lib/sales/types'
import Link from 'next/link'

interface Props { meetings: Meeting[] }

const AVATAR_PALETTE = ['#8B5CF6','#3B82F6','#10B981','#F59E0B','#EC4899','#14B8A6','#EF4444']
function avatarColor(name: string) {
  return AVATAR_PALETTE[name.charCodeAt(0) % AVATAR_PALETTE.length]
}

function fmtTime(dateStr: string) {
  const d = new Date(dateStr)
  let h = d.getHours()
  const m = String(d.getMinutes()).padStart(2, '0')
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return { hour: `${h}:${m}`, period: ampm }
}

function todayLabel() {
  return new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export function TodaysOrbit({ meetings }: Props) {
  return (
    <div
      className="fadaa-card"
      style={{
        background: 'linear-gradient(160deg, rgba(10,12,30,0.98) 0%, rgba(14,18,40,0.98) 100%)',
        border: '1px solid rgba(99,102,241,0.15)',
      }}
    >
      <div style={{ padding: '18px 20px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 }}>Today&apos;s Orbit</h2>
        <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>{todayLabel()}</span>
      </div>

      {meetings.length === 0 ? (
        <div style={{ padding: '28px 20px', textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: 'var(--text-faint)' }}>No meetings scheduled today</p>
        </div>
      ) : (
        <div style={{ padding: '8px 0' }}>
          {meetings.map((m, i) => {
            const { hour, period } = fmtTime(m.meeting_date)
            const lead     = (m as Meeting & { lead?: { company_name?: string; id?: string } }).lead
            const rep      = (m as Meeting & { rep?: { name?: string } }).rep
            const repName  = rep?.name ?? '—'
            const color    = avatarColor(repName)
            const typeStr  = m.meeting_type.replace(/_/g, ' ')

            return (
              <Link
                key={m.id}
                href={lead?.id ? `/sales/leads/${lead.id}` : '/sales/meetings'}
                style={{ textDecoration: 'none', display: 'block' }}
              >
                <div
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '12px 20px',
                    borderBottom: i < meetings.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                >
                  {/* Time */}
                  <div style={{ textAlign: 'right', minWidth: 44, flexShrink: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#E2E8F0', lineHeight: 1.1 }}>{hour}</p>
                    <p style={{ fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase' }}>{period}</p>
                  </div>

                  {/* Left accent */}
                  <div style={{ width: 3, height: 36, borderRadius: 99, background: color, flexShrink: 0 }} />

                  {/* Details */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#E2E8F0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {lead?.company_name ?? '—'}
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>
                      {typeStr} · {repName}
                    </p>
                  </div>

                  {/* Rep avatar */}
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                    background: `${color}22`, border: `2px solid ${color}55`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, color,
                  }}>
                    {repName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
