import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getDocuments, createDocument, updateDocument, logActivity } from '@/lib/sales/db'
import { getServiceClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, role } = session.user as { id: string; role: string }

  const sp = req.nextUrl.searchParams
  try {
    const documents = await getDocuments({
      leadId:     sp.get('leadId')     ?? undefined,
      uploadedBy: role === 'rep' ? id : undefined,
    })
    return NextResponse.json({ documents })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id: userId } = session.user as { id: string }

  try {
    // Expects multipart/form-data with file + metadata
    const formData = await req.formData()
    const file     = formData.get('file') as File | null
    const leadId   = formData.get('lead_id') as string
    const docType  = formData.get('doc_type') as string ?? 'quotation'
    const version  = formData.get('version')  as string ?? 'v1'
    const status   = formData.get('status')   as string ?? 'draft'
    const notes    = formData.get('notes')    as string ?? ''

    if (!file)   return NextResponse.json({ error: 'No file provided' },   { status: 400 })
    if (!leadId) return NextResponse.json({ error: 'lead_id required' },   { status: 400 })

    // Validate file type
    const ALLOWED = ['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','image/png','image/jpeg']
    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json({ error: 'File type not allowed. Use PDF, DOCX, XLSX, PNG, or JPG.' }, { status: 400 })
    }

    // Upload to Supabase Storage
    const db    = getServiceClient()
    const path  = `leads/${leadId}/${docType}s/${version}_${Date.now()}_${file.name}`
    const bytes = await file.arrayBuffer()
    const { data: upload, error: upErr } = await db.storage
      .from('sales-documents')
      .upload(path, bytes, { contentType: file.type, upsert: false })

    if (upErr) {
      console.error('Upload error:', upErr)
      return NextResponse.json({ error: `Storage error: ${upErr.message}` }, { status: 500 })
    }

    // Use signed URL (works with both public and private buckets)
    const { data: signedData } = await db.storage
      .from('sales-documents')
      .createSignedUrl(path, 60 * 60 * 24 * 365) // 1-year expiry for documents
    const fileUrl = signedData?.signedUrl ?? ''

    const doc = await createDocument({
      lead_id:     leadId,
      uploaded_by: userId,
      doc_type:    docType as any,
      status:      status  as any,
      version,
      file_url:    fileUrl,
      file_name:   file.name,
      file_size_kb: Math.round(file.size / 1024),
      notes: notes || null,
    })

    await logActivity({
      lead_id:     leadId,
      user_id:     userId,
      action_type: 'doc_uploaded',
      description: `Uploaded ${docType} (${version}): ${file.name}`,
    })

    return NextResponse.json({ document: doc }, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to upload document' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id, ...payload } = await req.json()
    const doc = await updateDocument(id, payload)
    return NextResponse.json({ document: doc })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update document' }, { status: 500 })
  }
}
