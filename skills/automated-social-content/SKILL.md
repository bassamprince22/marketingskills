---
name: automated-social-content
description: "Fully automated personal brand content pipeline. Use when the user wants to automate social media posting, generate trending content daily without manual work, auto-schedule across TikTok/Reels/YouTube Shorts/LinkedIn/Twitter/X/Instagram/Facebook, create AI-generated videos from scripts, build a personal brand on autopilot, or set up Zapier automation for social content. Covers Zapier automation setup, Claude API content generation, Higgsfield AI video creation (b-roll and avatar), Instagram and LinkedIn carousel design, LinkedIn articles, Buffer scheduling, and a Next.js dashboard with multi-workspace support. Trigger phrases: 'automate my social media,' 'post on autopilot,' 'automated content pipeline,' 'daily content without manual work,' 'AI video for social.' For manual one-off content creation, see social-content."
metadata:
  version: 1.0.0
---

# Automated Social Content

You are an expert marketing automation engineer and personal brand strategist. Your goal is to build a fully automated pipeline that researches trends daily, generates platform-native content, creates AI videos, and schedules everything via Buffer — with zero manual work per post.

## Before Starting

**Check for product marketing context first:**
If `.agents/product-marketing-context.md` exists, read it before asking questions.

Gather this context if not provided:
- Niche / topic area (e.g., Marketing/Growth + Entrepreneurship)
- Platforms to post on (TikTok, Instagram, LinkedIn, Twitter/X, YouTube Shorts, Facebook)
- Whether multiple brand workspaces are needed (one login, multiple brands)
- API access already provisioned: Claude API, Buffer, Zapier, Higgsfield AI

---

## System Overview

```
Daily 7am trigger
    → Zap 1: Scrape TikTok + Instagram trending posts
    → Claude: Analyze trends → 5 content angles
    → Supabase: Store trends (workspace-scoped)

Per trend (Zap 2)
    → Claude: Generate all platform content + carousel slides + video script
    → Supabase: Write to content_queue

Per queue row (Zap 3)
    → Higgsfield: Generate video (b-roll or avatar) OR carousel slide images
    → LinkedIn API: Publish article (bypasses Buffer, goes live immediately)
    → Supabase: status=ready

Per ready row (Zap 4)
    → Buffer API: Schedule across all platforms

Weekly Monday (Zap 5)
    → Buffer Analytics: Pull 7-day performance
    → Claude: Recommend pillar adjustments
    → Supabase: Update config
```

---

## Content Pillars

For Marketing/Growth + Entrepreneurship niche:

| Pillar | % | Topics |
|--------|---|--------|
| Growth Tactics | 25% | Frameworks, case studies, specific tactics |
| Building in Public | 25% | Journey, wins, failures, lessons learned |
| Industry Insights | 20% | Trends, analysis, predictions, data |
| Hot Takes | 20% | Bold opinions, debunking myths |
| Personal | 10% | Values, stories, behind the scenes |

Pillar weights are configurable per workspace via the dashboard `/control` page.

**For full pillar detail**: See [references/content-pillars.md](references/content-pillars.md)

---

## Content Types per Platform

| Platform | Types generated |
|----------|----------------|
| TikTok | Short-form video (30-60s script) → Higgsfield b-roll or avatar |
| Instagram Reels | Same video as TikTok (9:16 format) |
| YouTube Shorts | Same video as TikTok (9:16 format) |
| Instagram | Carousel (5-8 slides) → Higgsfield 4K image per slide |
| LinkedIn | Regular post + Long-form article + Document carousel (all three) |
| Twitter/X | 7-tweet thread |
| Facebook | Adapted from Instagram caption |

**LinkedIn article** publishes via LinkedIn API directly (not Buffer) — goes live at generation time.

**LinkedIn document carousel** = slide images → merged PDF → LinkedIn Document post.

---

## Video Types

Claude decides which type fits each trend best:

| Type | When | Higgsfield call |
|------|------|-----------------|
| `ai-broll` | Data, tips, frameworks | `type: "broll_captions"` |
| `ai-avatar` | Opinions, hot takes, building-in-public | `type: "talking_head"` |
| `real-video` | Personal stories, behind-the-scenes | User uploads footage (24h window) |

`real-video` slots send a notification (email/Slack) with the generated caption ready to use. Upload a Google Drive / Dropbox URL within 24h, or it auto-falls back to `ai-broll`.

**For full video setup**: See [references/video-pipeline.md](references/video-pipeline.md)

---

## Infrastructure

**Supabase (PostgreSQL)** — central data store with multi-workspace support.

Core tables:

| Table | Purpose |
|-------|---------|
| `workspaces` | Brand accounts with all API credentials (Supabase Vault encrypted) |
| `trends` | Daily trend research output |
| `content_queue` | All generated content with status lifecycle |
| `config` | Per-workspace automation settings |
| `analytics` | Weekly performance snapshots |

Every row is scoped by `workspace_id`. Switch brands in the dashboard without logging out.

**For step-by-step Zapier setup**: See [references/zapier-automation.md](references/zapier-automation.md)

---

## Dashboard (Next.js + Vercel)

Single-user, multi-workspace web app. Deploy to Vercel for free.

**Pages:**

| Route | Purpose |
|-------|---------|
| `/workspaces` | Create/edit/delete brand workspaces, store API keys |
| `/` | Overview: KPIs, pillar pie, recent posts, alerts |
| `/analytics` | Performance charts by platform and content type |
| `/schedule` | Buffer queue: cancel, reschedule, carousel preview |
| `/control` | Automation toggle, content mix sliders, hashtags, brand colors |
| `/uploads` | Real-video slots with 24h countdown |

**Workspace switcher** in top nav — all data re-fetches instantly on switch.

**Tech stack:** Next.js 14 (App Router), Tailwind CSS, Recharts, Supabase JS, Buffer REST API v1, NextAuth.js credentials.

---

## Claude Prompts

### Zap 1 — Trend Analysis

```
You are a personal brand strategist for the Marketing/Growth + Entrepreneurship niche.

Here are the top-performing TikTok videos from the last 24h:
[tiktok_data — video description, view_count, like_count, hashtags]

Here are the top-performing Instagram posts:
[instagram_data — caption, like_count, comments_count]

Identify 5 trending content angles. For each return:
1. trend_name: short label for the angle
2. why_resonating: hook style, emotional trigger, format used
3. our_angle: tailored version for our brand voice
4. pillar: one of Growth Tactics / Building in Public / Industry Insights / Hot Takes / Personal
5. opening_hook: first sentence for our post

Return a JSON array of 5 objects.
```

### Zap 2 — Content Generation (one call per trend)

```
You are a social media content creator for the Marketing/Growth + Entrepreneurship niche.

Trend angle: [our_angle]
Pillar: [pillar]
Opening hook: [opening_hook]

Generate all of the following. Return as JSON with these keys:

linkedin_post: Story or list format, 1200-1500 chars, strong hook, line breaks every 2 sentences
linkedin_article_title: Thought leadership title
linkedin_article_body: 600-2000 words, H2 sections, actionable and specific
linkedin_carousel_slides: Array of {slide_number, headline (max 8 words), body (max 25 words)}. 6-10 slides. Slide 1 = hook, last slide = CTA
instagram_carousel_slides: Array of {slide_number, headline, body}. 5-8 slides.
instagram_caption: Hook line + 3-5 sentence caption + 15 hashtags
twitter_thread: Array of 7 tweet strings. Tweet 1 = hook that works standalone.
tiktok_script: 30-60 second script, hook in first 2 seconds, spoken naturally
facebook_post: Adapted from instagram_caption, slightly longer
video_type: "ai-broll" or "ai-avatar" or "real-video" — choose based on content type
```

### Zap 5 — Weekly Performance Review

```
Analyze these social media metrics for the past 7 days: [metrics]

Identify:
1. Top 3 posts and why they worked (hook, format, emotional trigger)
2. Bottom 3 posts and why they underperformed
3. Pillar performance ranking (Growth Tactics / Building in Public / Industry Insights / Hot Takes / Personal)
4. Recommended pillar weight adjustments for next week (must sum to 100%)
5. One format to test more next week

Return JSON with: top_posts, bottom_posts, pillar_ranking, pillar_adjustments, format_test.
```

---

## Buffer Scheduling Targets

| Platform | Optimal times | Frequency |
|----------|--------------|-----------|
| TikTok | 7am, 7pm | Daily |
| Instagram Reels | 11am Mon/Wed | 2x/week |
| YouTube Shorts | 12pm Mon/Wed/Fri | 3x/week |
| LinkedIn | 7am or 12pm Tue/Thu | 2x/week |
| Twitter/X | 8am weekdays | Daily |
| Facebook | 1pm weekdays | Daily |

Buffer CLI reference: `tools/clis/buffer.js`

---

## One-Time Setup Checklist

- [ ] Create Supabase project → run schema migrations → get `SUPABASE_URL` + keys
- [ ] Apply for TikTok Research API at developers.tiktok.com → get `client_key` + `client_secret`
- [ ] Create Meta app → add Instagram Graph API → connect Instagram Business account → get long-lived token
- [ ] Create Higgsfield account → record your avatar (for talking-head videos) → get `api_key` + `avatar_id`
- [ ] Connect Buffer to all platform accounts → get `access_token`
- [ ] Get Claude API key from console.anthropic.com
- [ ] Deploy dashboard to Vercel → set env vars → create first workspace
- [ ] Build 5 Zapier Zaps (full instructions in `references/zapier-automation.md`)
- [ ] Run Zap 1 manually to test end-to-end flow before enabling daily schedule

---

## Related Skills

- **social-content**: Manual content creation for specific one-off posts
- **content-strategy**: High-level strategy, audience research, editorial planning
- **analytics-tracking**: GA4, Mixpanel, and other analytics setup
- **email-sequence**: Nurture social audience via email follow-up
