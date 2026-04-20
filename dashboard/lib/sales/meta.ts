import type { Lead } from './types'

type MetaPayload = NonNullable<Lead['meta_raw_payload']>

const META_INFO_KEYS = new Set(['ad', 'form', 'form id', 'form name', 'source'])

function isFilled(value: string | null | undefined): value is string {
  return Boolean(value?.trim())
}

function normalizeMetaKey(key: string) {
  return key
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '_')
    .replace(/^_+|_+$/g, '')
}

function firstFilled(values: Array<string | null | undefined>) {
  for (const value of values) {
    if (isFilled(value)) return value.trim()
  }
  return null
}

function getFieldValue(map: Map<string, string>, ...keys: string[]) {
  return firstFilled(keys.map((key) => map.get(key)))
}

function findFieldValue(
  map: Map<string, string>,
  matcher: (key: string) => boolean,
  exclude?: (key: string) => boolean
) {
  for (const [key, value] of map.entries()) {
    if (!isFilled(value)) continue
    if (exclude?.(key)) continue
    if (matcher(key)) return value.trim()
  }
  return null
}

export function parseMetaNotes(
  notes: string | null | undefined
): { fields: Record<string, string>; adName: string | null; formName: string | null } {
  const fields: Record<string, string> = {}
  let adName: string | null = null
  let formName: string | null = null

  if (!notes) return { fields, adName, formName }

  for (const line of notes.split('\n')) {
    const idx = line.indexOf(':')
    if (idx < 1) continue

    const rawKey = line.slice(0, idx).trim()
    const value = line.slice(idx + 1).trim()
    if (!isFilled(value)) continue

    const normalizedKey = normalizeMetaKey(rawKey)
    if (normalizedKey === 'ad') {
      adName = value
      continue
    }
    if (normalizedKey === 'form' || normalizedKey === 'form_name') {
      formName = value
      continue
    }
    if (META_INFO_KEYS.has(rawKey.toLowerCase())) continue

    fields[rawKey] = value
  }

  return { fields, adName, formName }
}

export function extractMetaLeadIdentity(input: {
  fields?: Record<string, string> | null
  notes?: string | null
}) {
  const noteData = parseMetaNotes(input.notes)
  const fieldMap = new Map<string, string>()

  for (const [key, value] of Object.entries(input.fields ?? {})) {
    if (isFilled(value)) fieldMap.set(normalizeMetaKey(key), value.trim())
  }
  for (const [key, value] of Object.entries(noteData.fields)) {
    if (isFilled(value) && !fieldMap.has(normalizeMetaKey(key))) {
      fieldMap.set(normalizeMetaKey(key), value.trim())
    }
  }

  const firstName = getFieldValue(fieldMap, 'first_name', 'firstname')
  const lastName = getFieldValue(fieldMap, 'last_name', 'lastname')
  const combinedName =
    isFilled(firstName) && isFilled(lastName) ? `${firstName} ${lastName}`.trim() : null

  const explicitCompany = firstFilled([
    getFieldValue(fieldMap, 'company_name', 'company', 'business_name', 'business', 'organization', 'organisation'),
    findFieldValue(
      fieldMap,
      (key) => key.includes('company') || key.includes('business') || key.includes('organization') || key.includes('organisation')
    ),
  ])

  const explicitName = firstFilled([
    getFieldValue(fieldMap, 'full_name', 'fullname', 'name', 'contact_name', 'contact_person'),
    combinedName,
    findFieldValue(
      fieldMap,
      (key) => key.includes('name'),
      (key) => key.includes('company') || key.includes('business') || key.includes('organization') || key.includes('organisation')
    ),
  ])

  const email = firstFilled([
    getFieldValue(fieldMap, 'email', 'email_address'),
    findFieldValue(fieldMap, (key) => key.includes('email')),
  ])

  const phone = firstFilled([
    getFieldValue(fieldMap, 'phone_number', 'phone', 'mobile_phone', 'mobile', 'whatsapp', 'telephone'),
    findFieldValue(
      fieldMap,
      (key) =>
        key.includes('phone') ||
        key.includes('mobile') ||
        key.includes('whatsapp') ||
        key.includes('telephone') ||
        key.includes('tel')
    ),
  ])

  const contactPerson = explicitName
  const companyName = explicitCompany ?? explicitName

  return {
    companyName,
    contactPerson,
    email,
    phone,
    fields: Object.keys(input.fields ?? {}).length > 0 ? input.fields ?? {} : noteData.fields,
    adName: noteData.adName,
    formName: noteData.formName,
  }
}

export function isUnknownLeadValue(value: string | null | undefined) {
  if (!isFilled(value)) return true
  const normalized = value.trim().toLowerCase()
  return normalized === 'unknown' || normalized === 'unknown lead'
}

export function hydrateMetaLead(lead: Lead): Lead {
  if (lead.lead_source !== 'meta') return lead

  const extracted = extractMetaLeadIdentity({
    fields: lead.meta_raw_payload?.fields ?? null,
    notes: lead.notes,
  })

  const companyName = isUnknownLeadValue(lead.company_name)
    ? extracted.companyName ?? lead.company_name
    : lead.company_name

  const contactPerson = isUnknownLeadValue(lead.contact_person)
    ? extracted.contactPerson ?? extracted.companyName ?? lead.contact_person
    : lead.contact_person

  const parsedMetaPayload: MetaPayload | null =
    Object.keys(extracted.fields).length > 0
      ? {
          fields: extracted.fields,
          ad_name: lead.meta_raw_payload?.ad_name ?? extracted.adName ?? null,
          form_id: lead.meta_raw_payload?.form_id ?? null,
          form_name: lead.meta_raw_payload?.form_name ?? extracted.formName ?? null,
        }
      : lead.meta_raw_payload ?? null

  return {
    ...lead,
    company_name: companyName ?? lead.company_name,
    contact_person: contactPerson ?? lead.contact_person,
    meta_raw_payload: parsedMetaPayload,
  }
}
