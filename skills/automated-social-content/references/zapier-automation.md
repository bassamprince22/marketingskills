# Zapier Automation Reference

Step-by-step setup for all 5 Zaps. Each Zap uses Zapier's built-in app connections plus Webhooks for API calls not natively supported.

---

## Prerequisites

Gather these credentials before building any Zap:

| Service | Where to get |
|---------|-------------|
| TikTok Research API | developers.tiktok.com → apply for Research API → get `client_key` + `client_secret` |
| Instagram Graph API | developers.facebook.com → create app → add Instagram Graph API → connect Business account → generate long-lived token |
| Claude API key | console.anthropic.com → API keys |
| Higgsfield API key | app.higgsfield.ai → Settings → API |
| Higgsfield Avatar ID | app.higgsfield.ai → Avatars → copy ID after recording yourself |
| Buffer access token | buffer.com → Settings → API Access → generate token |
| Supabase URL + keys | supabase.com → project → Settings → API |
| LinkedIn access token | developers.linkedin.com → create app → OAuth2 → `r_liteprofile w_member_social` scopes |

Store all credentials as **Zapier Environment Variables** (Settings → Environment Variables) — reference them as `{{env.VARIABLE_NAME}}` in Zap actions.

---

## Zap 1 — Daily Trend Research

**Trigger:** Schedule by Zapier → Every day at 7:00 AM

### Step 1 — TikTok Research API: Get trending videos

Action: **Webhooks by Zapier → POST**

- URL: `https://open.tiktokapis.com/v2/video/query/`
- Headers:
  ```
  Authorization: Bearer {{env.TIKTOK_ACCESS_TOKEN}}
  Content-Type: application/json
  ```
- Body (raw JSON):
  ```json
  {
    "query": {
      "and": [{
        "operation": "IN",
        "field_name": "hashtag_name",
        "field_values": ["marketingtips","growthhacking","entrepreneurship","businesstips","digitalmarketing","startuptips"]
      }]
    },
    "start_date": "{{zap_meta_human_now | date:'YYYY-MM-DD' | date_add:-1,'day'}}",
    "end_date": "{{zap_meta_human_now | date:'YYYY-MM-DD'}}",
    "max_count": 20,
    "fields": "id,video_description,like_count,comment_count,share_count,view_count,hashtag_names"
  }
  ```
- Save output → use `data.videos` in later steps

**TikTok access token refresh:** TikTok client credentials tokens expire every 2 hours. Use a separate Zapier Scheduled Zap (every 90 min) that calls `https://open.tiktokapis.com/v2/oauth/token/` with `grant_type=client_credentials` and writes the new token to a Supabase `tokens` table. Reference it via a Supabase lookup step at the start of Zap 1.

### Step 2 — Instagram: Get hashtag IDs (run 4 times, one per hashtag)

Action: **Webhooks by Zapier → GET** (repeat for each hashtag)

- URL: `https://graph.facebook.com/v19.0/ig-hashtag-search?user_id={{env.IG_USER_ID}}&q=marketingstrategy&access_token={{env.IG_ACCESS_TOKEN}}`
- Repeat for: `entrepreneur`, `businesstips`, `contentmarketing`
- Save each hashtag ID from response

### Step 3 — Instagram: Get top media per hashtag (run 4 times)

Action: **Webhooks by Zapier → GET**

- URL: `https://graph.facebook.com/v19.0/{{step2_hashtag_id}}/top_media?user_id={{env.IG_USER_ID}}&fields=caption,like_count,comments_count,media_type,timestamp&access_token={{env.IG_ACCESS_TOKEN}}`
- Save `data` array from each response

### Step 4 — Claude: Analyze trends

Action: **Webhooks by Zapier → POST**

- URL: `https://api.anthropic.com/v1/messages`
- Headers:
  ```
  x-api-key: {{env.CLAUDE_API_KEY}}
  anthropic-version: 2023-06-01
  Content-Type: application/json
  ```
- Body:
  ```json
  {
    "model": "claude-opus-4-6",
    "max_tokens": 2000,
    "messages": [{
      "role": "user",
      "content": "You are a personal brand strategist for the Marketing/Growth + Entrepreneurship niche.\n\nTop TikTok videos (last 24h):\n{{step1_tiktok_videos}}\n\nTop Instagram posts:\n{{step3_instagram_posts}}\n\nIdentify 5 trending content angles. For each return:\n- trend_name\n- why_resonating\n- our_angle (tailored for a marketer/founder personal brand)\n- pillar: one of [Growth Tactics, Building in Public, Industry Insights, Hot Takes, Personal]\n- opening_hook\n\nReturn only a JSON array of 5 objects."
    }]
  }
  ```

### Step 5 — Supabase: Insert 5 trend rows

Action: **Supabase → Create Row** (use Loop by Zapier to iterate the 5-item array)

- Table: `trends`
- Fields:
  - `workspace_id`: `{{env.DEFAULT_WORKSPACE_ID}}`
  - `trend_name`: from Claude JSON
  - `our_angle`, `pillar`, `opening_hook`, `why_resonating`: from Claude JSON
  - `created_at`: now

---

## Zap 2 — Content Generation

**Trigger:** Supabase → New Row in `trends` table

### Step 1 — Claude: Generate all content

Action: **Webhooks by Zapier → POST** (same Claude endpoint as Zap 1)

- Body:
  ```json
  {
    "model": "claude-opus-4-6",
    "max_tokens": 8000,
    "messages": [{
      "role": "user",
      "content": "You are a social media content creator for the Marketing/Growth + Entrepreneurship niche.\n\nTrend angle: {{trigger_our_angle}}\nPillar: {{trigger_pillar}}\nOpening hook: {{trigger_opening_hook}}\n\nGenerate all content. Return JSON with these keys:\n- linkedin_post (1200-1500 chars)\n- linkedin_article_title\n- linkedin_article_body (600-2000 words, H2 sections)\n- linkedin_carousel_slides (array: [{slide_number, headline, body}], 6-10 slides)\n- instagram_carousel_slides (array: [{slide_number, headline, body}], 5-8 slides)\n- instagram_caption (hook + 3-5 sentences + 15 hashtags)\n- twitter_thread (array of 7 tweet strings)\n- tiktok_script (30-60s, hook in first 2 seconds)\n- facebook_post\n- video_type: 'ai-broll' or 'ai-avatar' or 'real-video'"
    }]
  }
  ```

### Step 2 — Supabase: Insert video row

Action: **Supabase → Create Row**

- Table: `content_queue`
- Fields: `workspace_id`, `content_type: "video"`, `video_type`, `video_script: tiktok_script`, `instagram_caption`, `facebook_post`, `twitter_thread`, `trend_id`, `status: "pending"`

### Step 3 — Supabase: Insert LinkedIn article row

Action: **Supabase → Create Row**

- Table: `content_queue`
- Fields: `workspace_id`, `content_type: "linkedin_article"`, `content: linkedin_article_body`, `title: linkedin_article_title`, `trend_id`, `status: "pending"`

### Step 4 — Supabase: Insert Instagram carousel row

Action: **Supabase → Create Row**

- Table: `content_queue`
- Fields: `workspace_id`, `content_type: "carousel"`, `platform: "instagram"`, `slide_data: instagram_carousel_slides (JSON)`, `caption: instagram_caption`, `trend_id`, `status: "pending"`

### Step 5 — Supabase: Insert LinkedIn carousel row

Action: **Supabase → Create Row**

- Table: `content_queue`
- Fields: `workspace_id`, `content_type: "carousel"`, `platform: "linkedin"`, `slide_data: linkedin_carousel_slides (JSON)`, `content: linkedin_post`, `trend_id`, `status: "pending"`

---

## Zap 3A — Video Generation (ai-broll / ai-avatar)

**Trigger:** Supabase → Updated Row in `content_queue` where `content_type = "video"` AND `status = "pending"`

### Step 1 — Higgsfield: Submit generation job

Action: **Webhooks by Zapier → POST**

- URL: `https://api.higgsfield.ai/v1/generate`
- Headers: `Authorization: Bearer {{env.HIGGSFIELD_API_KEY}}`
- Body (b-roll):
  ```json
  {
    "type": "broll_captions",
    "script": "{{trigger_video_script}}",
    "style": "cinematic",
    "resolution": "4k"
  }
  ```
- Body (avatar — use Zapier Filter to branch by `video_type`):
  ```json
  {
    "type": "talking_head",
    "script": "{{trigger_video_script}}",
    "avatar_id": "{{env.HIGGSFIELD_AVATAR_ID}}",
    "resolution": "4k"
  }
  ```

### Step 2 — Delay: Wait 3 minutes

Action: **Delay by Zapier → Delay For** → 3 minutes

### Step 3 — Higgsfield: Poll for completion

Action: **Webhooks by Zapier → GET**

- URL: `https://api.higgsfield.ai/v1/status/{{step1_job_id}}`
- Headers: `Authorization: Bearer {{env.HIGGSFIELD_API_KEY}}`

If `status != "complete"`, use **Zapier Looping** to retry up to 5 times with 2-minute delays.

### Step 4 — Supabase: Update row with video URL

Action: **Supabase → Update Row**

- Filter: `id = {{trigger_id}}`
- Updates: `video_url = {{step3_video_url}}`, `status = "ready"`

---

## Zap 3B — Carousel Slide Generation

**Trigger:** Supabase → New Row in `content_queue` where `content_type = "carousel"`

### Step 1 — Loop through slides

Action: **Loop by Zapier** → iterate `trigger_slide_data` JSON array

### Step 2 — Higgsfield: Generate one slide image

Action: **Webhooks by Zapier → POST**

- URL: `https://api.higgsfield.ai/v1/generate`
- Headers: `Authorization: Bearer {{env.HIGGSFIELD_API_KEY}}`
- Body:
  ```json
  {
    "type": "image",
    "model": "nano",
    "resolution": "4k",
    "template": "carousel_slide",
    "slide": {
      "headline": "{{loop_headline}}",
      "body": "{{loop_body}}",
      "brand_colors": "{{env.BRAND_COLORS}}",
      "slide_number": "{{loop_slide_number}}"
    }
  }
  ```

### Step 3 — Collect all slide URLs

Action: **Zapier Storage → Set Value** → append slide URL to a list keyed by `{{trigger_id}}`

### Step 4 — Supabase: Update row with slide URLs

Action: **Supabase → Update Row**

- Updates: `slide_urls = [collected array]`, `status = "ready"`

---

## Zap 3C — LinkedIn Article Publishing

**Trigger:** Supabase → New Row in `content_queue` where `content_type = "linkedin_article"`

### Step 1 — LinkedIn API: Publish article

Action: **Webhooks by Zapier → POST**

- URL: `https://api.linkedin.com/v2/ugcPosts`
- Headers:
  ```
  Authorization: Bearer {{env.LINKEDIN_ACCESS_TOKEN}}
  Content-Type: application/json
  X-Restli-Protocol-Version: 2.0.0
  ```
- Body:
  ```json
  {
    "author": "urn:li:person:{{env.LINKEDIN_PERSON_ID}}",
    "lifecycleState": "PUBLISHED",
    "specificContent": {
      "com.linkedin.ugc.ShareContent": {
        "shareCommentary": {
          "text": "{{trigger_content}}"
        },
        "shareMediaCategory": "NONE"
      }
    },
    "visibility": {
      "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
    }
  }
  ```

### Step 2 — Supabase: Update status

Action: **Supabase → Update Row**

- Updates: `status = "published"`, `published_url = {{step1_id}}`

---

## Zap 4 — Buffer Auto-Scheduling

**Trigger:** Supabase → Updated Row in `content_queue` where `status = "ready"`

Use **Zapier Filter** to branch by `content_type` and `platform`.

### Branch: video

Action: **Webhooks by Zapier → POST** × 4 (TikTok, Instagram Reels, YouTube Shorts, Twitter/X)

Buffer API endpoint: `https://api.bufferapp.com/1/updates/create.json`

```
POST https://api.bufferapp.com/1/updates/create.json
access_token={{env.BUFFER_ACCESS_TOKEN}}
profile_ids[]=<platform_profile_id>
text={{trigger_instagram_caption}}
media[video]={{trigger_video_url}}
scheduled_at=<next optimal slot>
```

Calculate `scheduled_at` using Zapier's date formatting:
- TikTok: next 7am or 7pm in user's timezone
- Instagram: next Mon or Wed at 11am
- YouTube Shorts: next Mon/Wed/Fri at 12pm
- Twitter/X thread: post tweet 1 now, schedule remaining 6 tweets 30 min apart

### Branch: carousel (Instagram)

Post each slide URL as a multi-image Buffer update. Buffer supports up to 10 media items.

```
media[photo][0]={{slide_url_1}}
media[photo][1]={{slide_url_2}}
...
```

### Branch: carousel (LinkedIn)

LinkedIn Document Post via LinkedIn API (not Buffer):

1. Upload each slide image to LinkedIn via `POST https://api.linkedin.com/v2/assets?action=registerUpload`
2. Assemble into a document share

### LinkedIn regular post via Buffer:

```
profile_ids[]=<linkedin_profile_id>
text={{trigger_content}}
scheduled_at=<next Tue or Thu at 7am or 12pm>
```

---

## Zap 5 — Weekly Performance Review

**Trigger:** Schedule by Zapier → Every week on Monday at 8:00 AM

### Step 1 — Buffer Analytics API: Get last 7 days

Action: **Webhooks by Zapier → GET**

- URL: `https://api.bufferapp.com/1/analytics/days/week.json?access_token={{env.BUFFER_ACCESS_TOKEN}}&start_date=<7 days ago>&end_date=<today>`

### Step 2 — Claude: Performance analysis

Action: **Webhooks by Zapier → POST** (Claude API)

Use the Zap 5 prompt from `SKILL.md`.

### Step 3 — Supabase: Update config

Action: **Supabase → Update Row**

- Table: `config`
- Filter: `workspace_id = {{env.DEFAULT_WORKSPACE_ID}}`
- Updates: `pillar_weights = {{step2_pillar_adjustments}}`

### Step 4 — (Optional) Slack notification

Action: **Slack → Send Channel Message**

- Message: Weekly insights summary from Claude output

---

## Error Handling

### General patterns

- **API rate limit (429):** Add a Delay step (60 seconds) + Zapier built-in retry
- **Higgsfield timeout:** If job not complete after 5 polls (10 min total) → set `status = "error"` in Supabase → dashboard shows alert
- **Real-video fallback:** Zapier Scheduled Zap runs every 30 min → check `content_queue` rows with `video_type = "real-video"` + `status = "pending"` + `created_at < 24h ago` → update to `video_type = "ai-broll"` → triggers Zap 3A automatically
- **Claude JSON parse error:** Wrap Claude response in a Code step with `JSON.parse(content[0].text)` + try/catch → log error to Supabase `errors` table

### Testing each Zap before enabling

1. Disable the daily trigger
2. Use "Test trigger" with sample Supabase row
3. Run each action step individually
4. Verify Supabase rows are created correctly
5. Check Buffer queue for scheduled posts
6. Enable trigger once end-to-end passes

---

## Supabase Schema

Run this SQL in Supabase SQL Editor before building Zaps:

```sql
-- Workspaces
create table workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tiktok_token text,
  instagram_token text,
  instagram_user_id text,
  linkedin_token text,
  linkedin_person_id text,
  buffer_token text,
  higgsfield_api_key text,
  higgsfield_avatar_id text,
  brand_colors text default '#6366f1,#8b5cf6',
  niche_hashtags_tiktok text[] default array['marketingtips','growthhacking','entrepreneurship'],
  niche_hashtags_instagram text[] default array['marketingstrategy','entrepreneur','businesstips'],
  content_mix_broll integer default 40,
  content_mix_avatar integer default 30,
  content_mix_real integer default 30,
  automation_enabled boolean default true,
  created_at timestamptz default now()
);

-- Trends
create table trends (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  trend_name text,
  our_angle text,
  pillar text,
  opening_hook text,
  why_resonating text,
  created_at timestamptz default now()
);

-- Content queue
create table content_queue (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  trend_id uuid references trends(id),
  content_type text, -- video | carousel | linkedin_article | linkedin_post | twitter_thread
  platform text,     -- tiktok | instagram | linkedin | twitter | youtube | facebook
  video_type text,   -- ai-broll | ai-avatar | real-video
  content text,
  title text,
  slide_data jsonb,
  slide_urls text[],
  video_script text,
  video_url text,
  instagram_caption text,
  twitter_thread jsonb,
  facebook_post text,
  published_url text,
  status text default 'pending', -- pending | ready | published | error | skip
  scheduled_at timestamptz,
  created_at timestamptz default now()
);

-- Config
create table config (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade unique,
  pillar_weights jsonb default '{"Growth Tactics":25,"Building in Public":25,"Industry Insights":20,"Hot Takes":20,"Personal":10}',
  posting_times jsonb,
  updated_at timestamptz default now()
);

-- Analytics snapshots
create table analytics (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  week_start date,
  platform_metrics jsonb,
  top_posts jsonb,
  pillar_performance jsonb,
  created_at timestamptz default now()
);

-- Row Level Security (single-user app — allow all for service role key)
alter table workspaces enable row level security;
alter table trends enable row level security;
alter table content_queue enable row level security;
alter table config enable row level security;
alter table analytics enable row level security;
```
