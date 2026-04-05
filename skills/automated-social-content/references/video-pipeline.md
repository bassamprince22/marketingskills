# Video Pipeline Reference

Setup guide for Higgsfield AI video generation, avatar creation, and per-platform video specs.

---

## Higgsfield AI Overview

Higgsfield generates two types of content for this pipeline:

| Type | API call | Output |
|------|----------|--------|
| B-roll with captions | `type: "broll_captions"` | Cinematic stock-style footage + animated text overlays |
| Talking head (avatar) | `type: "talking_head"` | Your AI avatar speaking the script |
| Carousel slide image | `type: "image"` | Branded static image (4K) |

All calls return a `job_id`. Poll `/v1/status/{job_id}` until `status == "complete"`, then read `video_url` or `image_url`.

---

## Avatar Setup (One-time)

1. Log in to app.higgsfield.ai
2. Go to **Avatars** → **Create Avatar**
3. Record 2-5 minutes of yourself speaking clearly in a well-lit space (follow their recording guide)
4. Upload — processing takes 30-60 minutes
5. Copy your `avatar_id` from the avatar detail page
6. Store as `HIGGSFIELD_AVATAR_ID` in Zapier environment variables and in your workspace row in Supabase

You only need one avatar. The same avatar is used across all workspaces by default. To support multiple avatars per workspace, store `higgsfield_avatar_id` per workspace row in Supabase.

---

## Higgsfield API Reference

### Base URL
`https://api.higgsfield.ai/v1`

### Auth
All requests: `Authorization: Bearer {api_key}`

### Generate B-roll Video

```http
POST /v1/generate
Content-Type: application/json

{
  "type": "broll_captions",
  "script": "Your spoken script here. Keep it conversational.",
  "style": "cinematic",
  "resolution": "4k",
  "aspect_ratio": "9:16",
  "caption_style": "bold_bottom"
}
```

### Generate Talking Head Video

```http
POST /v1/generate
Content-Type: application/json

{
  "type": "talking_head",
  "script": "Your spoken script here.",
  "avatar_id": "your-avatar-id",
  "resolution": "4k",
  "aspect_ratio": "9:16",
  "background": "gradient"
}
```

### Generate Carousel Slide Image

```http
POST /v1/generate
Content-Type: application/json

{
  "type": "image",
  "model": "nano",
  "resolution": "4k",
  "template": "carousel_slide",
  "slide": {
    "headline": "Short punchy headline",
    "body": "Supporting context, 1-2 lines max",
    "brand_colors": "#6366f1,#8b5cf6",
    "slide_number": 1,
    "total_slides": 8
  }
}
```

### Check Job Status

```http
GET /v1/status/{job_id}
```

Response:
```json
{
  "job_id": "abc123",
  "status": "complete",
  "video_url": "https://cdn.higgsfield.ai/...",
  "image_url": null,
  "duration_seconds": 45,
  "created_at": "2026-04-05T07:03:00Z"
}
```

Status values: `queued` → `processing` → `complete` | `error`

Typical processing times:
- B-roll: 3-6 minutes
- Talking head: 4-8 minutes
- Carousel image: 30-90 seconds

---

## Video Specs by Platform

| Platform | Aspect ratio | Resolution | Max length | File format |
|----------|-------------|------------|------------|-------------|
| TikTok | 9:16 | 1080×1920 | 10 min | MP4 H.264 |
| Instagram Reels | 9:16 | 1080×1920 | 90 sec | MP4 H.264 |
| YouTube Shorts | 9:16 | 1080×1920 | 60 sec | MP4 H.264 |
| Facebook Reels | 9:16 | 1080×1920 | 60 sec | MP4 H.264 |
| LinkedIn video | 4:5 or 16:9 | 1080px min | 10 min | MP4 H.264 |

All Higgsfield 9:16 4K output is compatible with TikTok, Reels, and Shorts without re-encoding.

---

## Choosing Video Type (How Claude Decides)

Claude picks `video_type` based on content type in the generation prompt. The mapping:

| Content angle | Best type | Why |
|--------------|-----------|-----|
| Data, stats, frameworks, tips | `ai-broll` | B-roll + text overlays visualize abstract concepts |
| Hot takes, opinions | `ai-avatar` | First-person delivery feels more authentic |
| Building in public, personal | `real-video` | Actual you is more credible for personal stories |
| Industry insights, analysis | `ai-broll` | Research-backed content suits cinematic style |
| Growth tactic walkthroughs | `ai-broll` | Step-by-step suits text overlay format |

**Content mix target** (configurable per workspace in dashboard `/control`):
- `ai-broll`: 40%
- `ai-avatar`: 30%
- `real-video`: 30%

---

## Real Video Workflow (Semi-Automated)

When Claude assigns `video_type = "real-video"`:

1. Zap 3A detects `video_type = "real-video"` and skips Higgsfield
2. Zapier sends you a **notification** (Slack or email) containing:
   - The trend angle (what to film)
   - The generated TikTok script (use it or riff on it)
   - The ready-to-use caption + hashtags
   - A direct link to the dashboard `/uploads` page
3. Film your video (30-90 seconds, 9:16 on your phone)
4. Upload to Google Drive or Dropbox → paste the shareable link into the dashboard
5. Dashboard writes the URL to Supabase → `status` → `ready` → Zap 4 fires → Buffer schedules

**24-hour fallback:** A Zapier Scheduled Zap runs every 30 minutes. If a `real-video` row is older than 24 hours and still `status = "pending"`, it automatically flips `video_type` to `ai-broll` so the queue never stalls.

---

## Carousel to LinkedIn PDF

For LinkedIn document carousel posts, the pipeline converts slide images to PDF:

1. Higgsfield returns an array of slide image URLs
2. A Zapier Code step fetches each image and assembles a PDF using `pdf-lib` (Node.js):

```javascript
const { PDFDocument } = require('pdf-lib');
const fetch = require('node-fetch');

const pdfDoc = await PDFDocument.create();

for (const imageUrl of slideUrls) {
  const imageBytes = await fetch(imageUrl).then(r => r.arrayBuffer());
  const image = await pdfDoc.embedJpg(imageBytes);
  const page = pdfDoc.addPage([image.width, image.height]);
  page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
}

const pdfBytes = await pdfDoc.save();
// Upload pdfBytes to a temporary CDN (e.g., Cloudflare R2 or Supabase Storage)
// Return the PDF URL for the LinkedIn Document post
```

3. LinkedIn API: Register upload → upload PDF → create Document share

**Alternative:** Use Zapier's built-in **PDF Generator by Zapier** app (paid add-on) if you want to avoid the Code step.

---

## Script Writing Tips for Short-Form Video

### Hook (first 2 seconds)
- Start mid-sentence: "Here's why 90% of marketers are doing X wrong..."
- State a counterintuitive result: "We doubled revenue by posting less."
- Visual intrigue: Script something that creates an unexpected opening image

### Structure (30-60 seconds)
1. Hook (0-3s)
2. Credibility / context (3-10s)
3. Main value (10-45s) — 3 points max
4. CTA (45-60s) — one action only

### Dos and Don'ts
- **Do:** Write at 5th-grade reading level (spoken word, not blog)
- **Do:** Use numbers ("3 things," "87% of," "in 4 weeks")
- **Do:** Pause naturally — add `[pause]` markers for avatar scripts
- **Don't:** Include URLs or handles in the script (add to caption instead)
- **Don't:** Write longer than 60 seconds unless going on TikTok only

### Caption Formula
```
[Hook line — same as video opener]

[2-3 sentence expansion of the main point]

[1-line CTA: Follow for more X]

[Hashtags on separate lines — 15 for Instagram, 3-5 for LinkedIn]
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Higgsfield job stuck in `processing` | Cancel and resubmit. Rare — usually resolves in <10 min |
| Avatar lip sync off | Re-record avatar with slower, clearer speech |
| B-roll irrelevant to script | Add more specific nouns/contexts to the script |
| Carousel slide text overflows | Limit headline to 8 words, body to 25 words |
| LinkedIn PDF rejected | Ensure PDF is ≤100MB and has ≤300 pages |
