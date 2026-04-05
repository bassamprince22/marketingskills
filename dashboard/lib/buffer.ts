// Buffer REST API v1 client

export interface BufferProfile {
  id: string
  service: string
  service_username: string
  default_profile: boolean
}

export interface BufferUpdate {
  id: string
  status: 'buffer' | 'sent' | 'failed'
  text: string
  scheduled_at: number
  profile_id: string
  profile_service: string
  media?: { photo?: string; video?: string; thumbnail?: string }
  sent_at?: number
  statistics?: { impressions: number; reach: number; clicks: number; retweets: number; favorites: number }
}

export interface BufferAnalyticsDays {
  profiles: Array<{
    id: string
    service: string
    days: Array<{
      date: string
      statistics: { impressions: number; reach: number; clicks: number; favorites: number }
    }>
  }>
}

function bufferBase(token: string) {
  return {
    async get(path: string) {
      const url = `https://api.bufferapp.com/1${path}.json?access_token=${token}`
      const res = await fetch(url)
      if (!res.ok) throw new Error(`Buffer API error ${res.status}: ${await res.text()}`)
      return res.json()
    },
    async post(path: string, body: Record<string, string | string[]>) {
      const params = new URLSearchParams({ access_token: token })
      for (const [k, v] of Object.entries(body)) {
        if (Array.isArray(v)) {
          v.forEach((item, i) => params.append(`${k}[${i}]`, item))
        } else {
          params.set(k, v)
        }
      }
      const res = await fetch(`https://api.bufferapp.com/1${path}.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      })
      if (!res.ok) throw new Error(`Buffer API error ${res.status}: ${await res.text()}`)
      return res.json()
    },
  }
}

export async function getProfiles(token: string): Promise<BufferProfile[]> {
  const client = bufferBase(token)
  const data = await client.get('/profiles')
  return data
}

export async function getPendingUpdates(token: string, profileId: string): Promise<BufferUpdate[]> {
  const client = bufferBase(token)
  const data = await client.get(`/profiles/${profileId}/updates/pending`)
  return data.updates ?? []
}

export async function getSentUpdates(token: string, profileId: string, count = 10): Promise<BufferUpdate[]> {
  const client = bufferBase(token)
  const data = await client.get(`/profiles/${profileId}/updates/sent?count=${count}`)
  return data.updates ?? []
}

export async function destroyUpdate(token: string, updateId: string) {
  const client = bufferBase(token)
  return client.post(`/updates/${updateId}/destroy`, {})
}

export async function scheduleUpdate(
  token: string,
  profileIds: string[],
  text: string,
  scheduledAt: string,
  mediaUrl?: string,
  mediaType?: 'photo' | 'video'
) {
  const client = bufferBase(token)
  const body: Record<string, string | string[]> = {
    'profile_ids[]': profileIds,
    text,
    scheduled_at: scheduledAt,
    shorten: 'false',
  }
  if (mediaUrl && mediaType === 'photo') body['media[photo]'] = mediaUrl
  if (mediaUrl && mediaType === 'video') body['media[video]'] = mediaUrl
  return client.post('/updates/create', body)
}

export async function getAnalytics(token: string): Promise<BufferAnalyticsDays> {
  const client = bufferBase(token)
  const end = new Date().toISOString().split('T')[0]
  const start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  return client.get(`/analytics/days/week?start_date=${start}&end_date=${end}`)
}

// Merge all pending updates across all profiles for a given Buffer token
export async function getAllPendingUpdates(token: string): Promise<Array<BufferUpdate & { profile_service: string }>> {
  const profiles = await getProfiles(token)
  const results = await Promise.all(
    profiles.map(async (p) => {
      const updates = await getPendingUpdates(token, p.id)
      return updates.map((u) => ({ ...u, profile_service: p.service }))
    })
  )
  return results.flat().sort((a, b) => a.scheduled_at - b.scheduled_at)
}
