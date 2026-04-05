import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side client with service role (bypasses RLS) — only use in API routes
export function getServiceClient() {
  return createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  })
}

// Types
export interface Workspace {
  id: string
  name: string
  tiktok_token: string | null
  instagram_token: string | null
  instagram_user_id: string | null
  linkedin_token: string | null
  linkedin_person_id: string | null
  buffer_token: string | null
  higgsfield_api_key: string | null
  higgsfield_avatar_id: string | null
  brand_colors: string
  niche_hashtags_tiktok: string[]
  niche_hashtags_instagram: string[]
  content_mix_broll: number
  content_mix_avatar: number
  content_mix_real: number
  automation_enabled: boolean
  created_at: string
}

export interface Trend {
  id: string
  workspace_id: string
  trend_name: string
  our_angle: string
  pillar: string
  opening_hook: string
  why_resonating: string
  created_at: string
}

export interface ContentQueueRow {
  id: string
  workspace_id: string
  trend_id: string | null
  content_type: 'video' | 'carousel' | 'linkedin_article' | 'linkedin_post' | 'twitter_thread'
  platform: string | null
  video_type: 'ai-broll' | 'ai-avatar' | 'real-video' | null
  content: string | null
  title: string | null
  slide_data: SlideData[] | null
  slide_urls: string[] | null
  video_script: string | null
  video_url: string | null
  instagram_caption: string | null
  twitter_thread: string[] | null
  facebook_post: string | null
  published_url: string | null
  status: 'pending' | 'ready' | 'published' | 'error' | 'skip'
  scheduled_at: string | null
  created_at: string
}

export interface SlideData {
  slide_number: number
  headline: string
  body: string
}

export interface Config {
  id: string
  workspace_id: string
  pillar_weights: Record<string, number>
  posting_times: Record<string, string> | null
  updated_at: string
}

export interface AnalyticsSnapshot {
  id: string
  workspace_id: string
  week_start: string
  platform_metrics: Record<string, { views: number; likes: number; comments: number }>
  top_posts: Array<{ id: string; platform: string; views: number; pillar: string }>
  pillar_performance: Record<string, number>
  created_at: string
}

// Query helpers
export async function getWorkspaces() {
  const { data, error } = await supabase
    .from('workspaces')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data as Workspace[]
}

export async function getTrends(workspaceId: string, limit = 20) {
  const { data, error } = await supabase
    .from('trends')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data as Trend[]
}

export async function getContentQueue(workspaceId: string, status?: string) {
  let query = supabase
    .from('content_queue')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) throw error
  return data as ContentQueueRow[]
}

export async function getPendingRealVideo(workspaceId: string) {
  const { data, error } = await supabase
    .from('content_queue')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('video_type', 'real-video')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data as ContentQueueRow[]
}

export async function getConfig(workspaceId: string) {
  const { data, error } = await supabase
    .from('config')
    .select('*')
    .eq('workspace_id', workspaceId)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return data as Config | null
}

export async function getLatestAnalytics(workspaceId: string) {
  const { data, error } = await supabase
    .from('analytics')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('week_start', { ascending: false })
    .limit(4)
  if (error) throw error
  return data as AnalyticsSnapshot[]
}
