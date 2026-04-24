'use client'

import { useCallback, useEffect, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import { type ContractTemplate } from '@/lib/sales/contractHtml'

// Variable groups shown in the picker
const VARIABLE_GROUPS = [
  {
    label: 'Client',
    vars: ['company_name','contact_person','email','phone'],
  },
  {
    label: 'Deal',
    vars: ['service_type','estimated_value','deal_type','budget_range','marketing_package','software_scope','notes'],
  },
  {
    label: 'Dates',
    vars: ['contract_date','expected_close_date'],
  },
  {
    label: 'Rep',
    vars: ['sales_rep'],
  },
  {
    label: 'Brand',
    vars: ['brand_company_name','brand_address','brand_phone','brand_email'],
  },
]

function genId() { return Math.random().toString(36).slice(2, 10) }

function ToolbarBtn({ active, onClick, title, children }: { active?: boolean; onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        padding: '4px 8px', borderRadius: 5, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
        background: active ? 'rgba(79,142,247,0.25)' : 'transparent',
        color: active ? '#7EB3FF' : '#94A3B8',
        transition: 'all 0.1s',
      }}
    >
      {children}
    </button>
  )
}

interface Props {
  onSaved?: () => void
}

export function TemplateEditor({ onSaved }: Props) {
  const [templates,  setTemplates]  = useState<ContractTemplate[]>([])
  const [activeId,   setActiveId]   = useState<string | null>(null)
  const [name,       setName]       = useState('')
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [msg,        setMsg]        = useState('')
  const [msgOk,      setMsgOk]      = useState(true)
  const [showVars,   setShowVars]   = useState(true)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: '',
    editorProps: {
      attributes: {
        style: 'min-height:320px; padding:16px; outline:none; font-family:Arial,sans-serif; font-size:11pt; line-height:1.7; color:#E2E8F0;',
      },
    },
  })

  function flash(text: string, ok: boolean) {
    setMsg(text); setMsgOk(ok)
    setTimeout(() => setMsg(''), 3000)
  }

  // Load templates
  useEffect(() => {
    fetch('/api/sales/contracts/templates')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const list: ContractTemplate[] = d?.templates ?? []
        setTemplates(list)
        if (list.length > 0) loadTemplate(list[0], list)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function loadTemplate(t: ContractTemplate, list?: ContractTemplate[]) {
    setActiveId(t.id)
    setName(t.name)
    editor?.commands.setContent(t.content)
    const all = list ?? templates
    setTemplates(all.map(x => x.id === t.id ? { ...x, content: t.content } : x))
  }

  function newTemplate() {
    const id = genId()
    const t: ContractTemplate = {
      id, name: 'New Contract', content: '<p>Write your contract here...</p>',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    }
    const next = [...templates, t]
    setTemplates(next)
    loadTemplate(t, next)
  }

  function deleteActive() {
    if (!activeId || templates.length <= 1) return
    if (!confirm('Delete this template?')) return
    const next = templates.filter(t => t.id !== activeId)
    setTemplates(next)
    loadTemplate(next[0], next)
  }

  const save = useCallback(async () => {
    if (!activeId || !editor) return
    const content = editor.getHTML()
    const now     = new Date().toISOString()
    const next    = templates.map(t =>
      t.id === activeId ? { ...t, name, content, updatedAt: now } : t
    )
    setSaving(true)
    const res = await fetch('/api/sales/contracts/templates', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ templates: next }),
    })
    setSaving(false)
    if (res.ok) {
      setTemplates(next)
      flash('Template saved', true)
      onSaved?.()
    } else {
      flash('Failed to save', false)
    }
  }, [activeId, editor, name, templates, onSaved])

  function insertVariable(v: string) {
    editor?.chain().focus().insertContent(`{${v}}`).run()
  }

  async function openPreview() {
    const content = editor?.getHTML() ?? ''
    const res = await fetch('/api/sales/contracts/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: { company_name: 'Acme Corp', contact_person: 'John Smith', email: 'john@acme.com', estimated_value: '$5,000', sales_rep: 'Sales Rep', contract_date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) } }),
    })
    const d = await res.json()
    setPreviewHtml(buildQuickPreview(content, d.fields ?? {}, d.html))
  }

  function buildQuickPreview(content: string, fields: Record<string,string>, generatedHtml?: string) {
    const html = generatedHtml ?? content.replace(/\{([^{}]+)\}/g, (_,k) => fields[k] ?? `{${k}}`)
    return html
  }

  if (loading) return (
    <div className="fadaa-card" style={{ padding: '20px 24px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 38, borderRadius: 8 }} />)}
      </div>
    </div>
  )

  return (
    <>
      {/* Preview modal */}
      {previewHtml && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 800, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid #e5e7eb' }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: '#111' }}>Contract Preview (Sample Data)</span>
              <button onClick={() => setPreviewHtml(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 18, color: '#666' }}>✕</button>
            </div>
            <div style={{ overflow: 'auto', padding: '20px 32px', flex: 1 }}>
              <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
            </div>
          </div>
        </div>
      )}

      <div className="fadaa-card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h3 className="t-section-title">Contract Templates</h3>
            <p className="t-caption" style={{ marginTop: 3 }}>Build and edit contract templates. Use {'{'}<em>variable</em>{'}'} syntax for auto-filled fields.</p>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
            {msg && <span style={{ fontSize: 12, fontWeight: 500, color: msgOk ? '#4ADE80' : '#F87171' }}>{msgOk ? '✓' : '⚠'} {msg}</span>}
            <button className="fadaa-btn-ghost fadaa-btn-sm" onClick={openPreview}>Preview</button>
            <button className="fadaa-btn fadaa-btn-sm" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save Template'}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex' }}>
          {/* Template list sidebar */}
          <div style={{ width: 200, borderRight: '1px solid rgba(255,255,255,0.06)', padding: '12px 0', flexShrink: 0 }}>
            {templates.map(t => (
              <div
                key={t.id}
                onClick={() => loadTemplate(t)}
                style={{
                  padding: '9px 16px', cursor: 'pointer', fontSize: 13, fontWeight: activeId === t.id ? 600 : 400,
                  color: activeId === t.id ? '#E2E8F0' : 'var(--text-muted)',
                  background: activeId === t.id ? 'rgba(79,142,247,0.1)' : 'transparent',
                  borderLeft: `2px solid ${activeId === t.id ? '#4F8EF7' : 'transparent'}`,
                  transition: 'all 0.1s',
                }}
              >
                {t.name}
              </div>
            ))}
            <div style={{ padding: '8px 12px', display: 'flex', gap: 6, marginTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <button className="fadaa-btn fadaa-btn-sm" style={{ flex: 1, fontSize: 11 }} onClick={newTemplate}>+ New</button>
              {templates.length > 1 && (
                <button className="fadaa-btn-danger fadaa-btn-sm" style={{ fontSize: 11 }} onClick={deleteActive} title="Delete this template">✕</button>
              )}
            </div>
          </div>

          {/* Editor area */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Template name */}
            <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Template name"
                style={{
                  background: 'transparent', border: 'none', outline: 'none',
                  fontSize: 15, fontWeight: 700, color: '#E2E8F0', width: '100%',
                }}
              />
            </div>

            {/* Formatting toolbar */}
            <div style={{
              padding: '6px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
              background: 'rgba(255,255,255,0.02)',
            }}>
              <ToolbarBtn active={editor?.isActive('bold')} onClick={() => editor?.chain().focus().toggleBold().run()} title="Bold">B</ToolbarBtn>
              <ToolbarBtn active={editor?.isActive('italic')} onClick={() => editor?.chain().focus().toggleItalic().run()} title="Italic"><em>I</em></ToolbarBtn>
              <ToolbarBtn active={editor?.isActive('underline')} onClick={() => editor?.chain().focus().run()} title="Underline"><u>U</u></ToolbarBtn>
              <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
              <ToolbarBtn active={editor?.isActive('heading', { level: 1 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} title="Heading 1">H1</ToolbarBtn>
              <ToolbarBtn active={editor?.isActive('heading', { level: 2 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2">H2</ToolbarBtn>
              <ToolbarBtn active={editor?.isActive('paragraph')} onClick={() => editor?.chain().focus().setParagraph().run()} title="Paragraph">¶</ToolbarBtn>
              <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
              <ToolbarBtn active={editor?.isActive('bulletList')} onClick={() => editor?.chain().focus().toggleBulletList().run()} title="Bullet List">• —</ToolbarBtn>
              <ToolbarBtn active={editor?.isActive('orderedList')} onClick={() => editor?.chain().focus().toggleOrderedList().run()} title="Numbered List">1.</ToolbarBtn>
              <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
              <ToolbarBtn onClick={() => editor?.chain().focus().setTextAlign('left').run()} active={editor?.isActive({ textAlign: 'left' })} title="Align Left">⇤</ToolbarBtn>
              <ToolbarBtn onClick={() => editor?.chain().focus().setTextAlign('center').run()} active={editor?.isActive({ textAlign: 'center' })} title="Align Center">≡</ToolbarBtn>
              <ToolbarBtn onClick={() => editor?.chain().focus().setTextAlign('right').run()} active={editor?.isActive({ textAlign: 'right' })} title="Align Right">⇥</ToolbarBtn>
              <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
              <ToolbarBtn onClick={() => editor?.chain().focus().setHorizontalRule().run()} title="Divider" active={false}>—</ToolbarBtn>
              <div style={{ marginLeft: 'auto' }}>
                <button
                  type="button"
                  onClick={() => setShowVars(v => !v)}
                  style={{ fontSize: 11, padding: '3px 10px', borderRadius: 5, border: '1px solid rgba(79,142,247,0.35)', background: showVars ? 'rgba(79,142,247,0.15)' : 'transparent', color: '#7EB3FF', cursor: 'pointer' }}
                >
                  {showVars ? 'Hide' : 'Show'} Variables
                </button>
              </div>
            </div>

            <div style={{ display: 'flex' }}>
              {/* Editor */}
              <div style={{ flex: 1, background: 'rgba(255,255,255,0.01)', minWidth: 0 }}>
                <EditorContent editor={editor} />
              </div>

              {/* Variable picker */}
              {showVars && (
                <div style={{ width: 180, borderLeft: '1px solid rgba(255,255,255,0.06)', padding: '12px 8px', overflowY: 'auto', maxHeight: 440, flexShrink: 0 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-faint)', textTransform: 'uppercase', marginBottom: 10, paddingLeft: 6 }}>
                    Click to insert
                  </p>
                  {VARIABLE_GROUPS.map(g => (
                    <div key={g.label} style={{ marginBottom: 12 }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-faint)', paddingLeft: 6, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{g.label}</p>
                      {g.vars.map(v => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => insertVariable(v)}
                          style={{
                            display: 'block', width: '100%', textAlign: 'left',
                            padding: '4px 8px', borderRadius: 5, border: 'none', cursor: 'pointer',
                            fontSize: 11, color: '#60A5FA', background: 'transparent',
                            transition: 'background 0.1s', fontFamily: 'monospace',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(79,142,247,0.12)' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                        >
                          {'{' + v + '}'}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
