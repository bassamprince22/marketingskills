# Cat Houses Egypt — Media Buying Master Plan
**Account:** Cat Houses Ad Account (945933914334729) | Currency: EGP | Date: 2026-04-09
**Strategy:** ABO Testing → Scale Winners | Target ROAS: 9x | Daily Budget: 4,000 EGP

---

## SAVING POINT — Long-Term Vision (Recall This Every Review)

> **Mission:** Build a consistent 9x ROAS machine on Meta for Cat Houses Egypt.
> Scale from 4,000 EGP/day → 10,000 EGP/day within 60 days by identifying 2-3 creative winners and one dominant audience structure.
>
> **North Star Metrics:**
> - ROAS target: 9x (proven achievable — data shows 10.98x and 13.46x already hit)
> - CPA target: <250 EGP (current best: 163-175 EGP)
> - AOV: ~2,000-2,200 EGP (don't discount — protect margin)
> - Scaling rule: +25% budget increase every 3 days on winners only
>
> **When user says "pull the data" → run:**
> 1. `get_performance(level='campaign')` — last 3 days
> 2. `get_performance(level='adset')` — filter active
> 3. `get_performance(level='ad')` — sort by ROAS desc
> 4. Compare against this plan's benchmarks and decision rules below
> 5. Report: what won, what died, what to scale, what to test next

---

## PHASE 1: DIAGNOSIS SUMMARY

### Active Campaigns (State on Apr 9, 2026)

| Campaign | Spend | Revenue | ROAS | CPA | Verdict |
|---|---|---|---|---|---|
| Andromida ABO | 40,290 | 213,829 | 5.31x | 468 | Mediocre — fix creative mix |
| Sales ABO 3 Adset | 8,694 | 66,094 | 7.60x | 280 | Good — AS5 is the star |
| MSGS CBO 500 | 8,001 | 0 | 0x | ∞ | **KILL — 500 EGP/day burned** |

### Root Causes of Underperformance
1. **MSGS campaign** — wrong objective (Engagement), 0 revenue, 0 purchases in 19 days
2. **Budget not following winners** — AS5 (ROAS 10.98) has 300 EGP while loser "1-Copy" (ROAS 5.33) runs uncapped
3. **Carousel winners are PAUSED** — ROAS 13.46 and 13.33 campaigns killed while mediocre ones run
4. **Funnel leaking** — Low ATC→Purchase conversion (detailed below)
5. **No creative refresh cycle** — old winners faded without remakes

### Funnel Analysis — Where Money Is Lost

From pixel data (last 7 days, primary pixel):
```
PageView:         9,591  (100%)
ViewContent:      6,090  (63%)  → -37% drop: landing page not engaging enough
AddToCart:          210  (2.2%) → Very low: product pages not converting browsers
InitiateCheckout:   185  (88% of ATC) → Good: those who add to cart intend to buy
Purchase:            62  (34% of IC) → Checkout abandonment is the final leak
```

**Funnel Problem #1 — ViewContent → ATC (63% → 2.2%):**
- Only 1 in 30 product page visitors adds to cart
- Fix: Product page needs stronger price anchor, urgency, and social proof
- Ad angle fix: Pre-qualify audience with price in ad (already working in carousels — keep doing it)
- Recommendation: Show "From 450 EGP" in creative to filter low-intent clicks

**Funnel Problem #2 — InitiateCheckout → Purchase (185 → 62 = 34% close rate):**
- 120 people abandoned at checkout — that's ~240,000 EGP in lost revenue/week
- Fix options: SMS/WhatsApp abandoned cart flow, COD reassurance on checkout page
- Ad fix: Add "دفع عند الاستلام" + "توصيل مجاني" in every creative CTA
- Retargeting: ATC audience exists (ID: 120236082907880401) — too small now but build it

**Funnel Problem #3 — Landing Page Engagement (PageView → VC drop 37%):**
- Visitors bounce before seeing product
- Creative must match landing page (congruence) — if ad shows Tower, land on Tower page not homepage
- Fix: Use specific product URLs per ad, not homepage

---

## PHASE 2: MASTER STRATEGY (Permanent Reference)

### Business Profile
- **Product:** Premium cat trees/towers/scratching posts (بيوت قطط)
- **AOV:** ~2,000–2,200 EGP
- **Price range:** 450 – 5,000 EGP
- **Market:** Egypt (Cairo + Alexandria primary)
- **Site:** cathouses-egy.com (Shopify + COD)
- **Target ROAS:** 9x
- **Max acceptable CPA:** 250 EGP
- **Daily budget:** 4,000 EGP

### Target Audience Hierarchy
1. **Broad Egypt** — 22-50, all genders, no interests → **Best performer in account**
2. **Interest stack** — cat owners + pet supplies + home decor (Egypt) → Test only
3. **Exclude always:** Buyers list (ID: 120241111178290401, 2,200-2,600 people)
4. **Retargeting (build toward):** ATC audience (currently too small — needs 3-4 weeks of traffic)

### Core Messaging Angles (Ranked by Proven ROAS)
| Rank | Angle | Hook Example | ROAS Proven |
|---|---|---|---|
| 1 | **Catalog + Price Range** | "ابتدي من 450 جنيه" + product carousel | 7.8-13.5x |
| 2 | **Cat Music / UGC Behavior** | Cat doing funny/natural thing with product | 7.4-11.2x |
| 3 | **Furniture Protection** | "الكنبة اللي بتحبها متتبهدلش" | 6.1-6.6x |
| 4 | **Before/After** | Couch scratched → cat using tower | 5.5-6.5x |
| 5 | **Social Proof** | Customer review / influencer | 2.0-4.2x (weak) |

### Winning Creative DNA
- **Format:** Carousel (product catalog) OR short Reels 15-30 sec
- **Language:** Egyptian Arabic عامية (natural, not scripted)
- **Always include in copy:** COD (دفع عند الاستلام) + fast delivery
- **Always include price:** Filter unqualified clicks, improves ROAS
- **CTA:** ORDER_NOW → specific product page (not homepage)

### Media Buying Strategy: "Test-Confirm-Scale" (ABO Model)
This account responds to **ABO (Ad Set Budget Optimization)** better than CBO:
- AS5 at 300 EGP/day hit ROAS 10.98 (CBO campaigns topped at 7.86x)
- ABO gives control — you choose which adsets survive

**Framework:**
```
Week 1: Launch 3 adsets × ~1,300 EGP/day = 4,000 EGP total
         → Test creatives, find winner
Week 2: Kill losers, scale winner +25% every 3 days
Week 3: Duplicate winning adset (new audience variation), test new creative
Week 4: Build retargeting as ATC audience grows
```

---

## PHASE 3: IMMEDIATE FIXES (Execute First)

### 1. Kill MSGS Campaign (Save 500 EGP/day)
```
change_entity_status(
  account_id='945933914334729',
  entity_type='campaign',
  entity_id='120242846328180401',
  action='pause'
)
```

### 2. Scale Star Adset AS5 (ROAS 10.98 → deserves more budget)
```
change_entity_budget(
  account_id='945933914334729',
  entity_type='adset',
  entity_id='<AS5_id_in_campaign_120243139560360401>',
  daily_budget=600
)
```
*(Lookup AS5 ID via list_adsets filtered to campaign 120243139560360401)*

### 3. Pause Weak Ad in Andromida
Pause ad "1 - Copy" (spend 18K, ROAS 5.33, CPA 552) — let carousel take budget.

---

## PHASE 4: OLD WINNERS — REMAKE & RETEST

These creatives previously proved the concept — remake them fresh and test again:

### Creatives to Remake (Priority Order)
| Original Creative | Why It Won | Remake Direction |
|---|---|---|
| "1 - Cat Music" (ROAS 11.24) | Organic cat behavior, relatable | New footage, same concept — cat playing naturally with tower |
| "2 - From 400 till 5000" carousel (ROAS 13.46) | Price range visible, product variety | Refresh product images, update prices if changed |
| "Adset2 - Al Product" (ROAS 13.33) | Full catalog, broad product show | Rebuild carousel with current inventory |
| "Int - Egypt - Copy" (ROAS 9.69, CPA 247) | Broad Egypt interest angle | Remake with fresh hook + same targeting |
| Before/After couch video (ROAS 6.5x range) | Problem/solution format works | New UGC: "قبل وبعد" with real customer footage |

### Remake Testing Protocol
- Each remake gets its own ad in a dedicated adset
- Budget: 500 EGP/day per remake adset
- Kill if no purchase after spending 2x CPA (500 EGP)
- If ROAS > 8x after 500 EGP: scale to 1,000 EGP/day

---

## PHASE 5: NEW 4,000 EGP/DAY CAMPAIGN STRUCTURE

### Campaign
- **Name:** `IG | Sales | ABO | 4K | Apr 9 Test`
- **Objective:** OUTCOME_SALES (Purchase)
- **Type:** ABO — 4 Ad Sets
- **Total:** 4,000 EGP/day

---

### Ad Set 1 — "Carousel Proven" (1,300 EGP/day)
- **Name:** `AS1 | Broad Egypt | Catalog Carousel`
- **Targeting:** Egypt, 22-50, Broad, exclude buyers list
- **Placement:** Instagram only (Feed + Reels)
- **Creatives:** Reuse top carousel (ROAS 13.46 "2 - From 400 till 5000")
- **Goal:** Anchor baseline with proven winner

---

### Ad Set 2 — "Cat Music Remake" (1,000 EGP/day)
- **Name:** `AS2 | Broad Egypt | Cat Music New`
- **Targeting:** Egypt, 22-50, Broad, exclude buyers list
- **Placement:** Instagram Reels only
- **Creatives:** Fresh remake of Cat Music UGC + original Cat Music (A/B)
- **Goal:** Validate remake holds ROAS of original (11.24x)

---

### Ad Set 3 — "New Hook Test A" (900 EGP/day)
- **Name:** `AS3 | Broad Egypt | Furniture Protection Hook`
- **Targeting:** Egypt, 22-50, Broad, exclude buyers list
- **Placement:** Instagram Reels
- **Script:**
```
Hook: "كنبتك ماتتبهدلش وانت عارف إزاي؟"
Body: قططي لقوا مكانهم الخاص... والكنبة اتنجت 😂
      برج من Cat Houses — يتحمل، وشكله يليق على أي أوضة
      ابتدي من 450 جنيه | دفع عند الاستلام | توصيل لكل مصر
CTA: اطلب دلوقتي
```

---

### Ad Set 4 — "New Hook Test B" (800 EGP/day)
- **Name:** `AS4 | Broad Egypt | Social Proof + Price Anchor`
- **Targeting:** Egypt, 22-50, Broad, exclude buyers list
- **Placement:** Instagram Reels
- **Script:**
```
Hook: "أكتر من 2000 قطة في مصر اختارت Cat Houses"
Body: مش مجرد بيت — ده مكان قطتك الخاص
      ابتدي من 450 جنيه ✓ توصيل لكل مصر ✓ دفع عند الاستلام
CTA: اطلب بيتها النهارده
```

---

## PHASE 6: SCALING RULES (Strict)

### Scale Trigger (every 3 days)
```
IF ROAS > 9x AND spend > 1,000 EGP:
  → Increase adset budget by 25%
  → Max increase per adset: 25% every 3 days (Meta learning phase protection)

IF ROAS 6-9x:
  → Hold budget, test new creative variation in same adset

IF ROAS 3-6x:
  → Reduce budget 50%, give 3 more days with new creative

IF ROAS < 3x OR 0 purchases after 2x CPA spend:
  → Kill adset immediately
  → Reallocate budget to winner
```

### Budget Ceiling & Scaling Path
```
Day 1-3:   4,000 EGP/day (launch)
Day 4-6:   5,000 EGP/day (if 1+ adset at 9x ROAS)
Day 7-9:   6,250 EGP/day (+25%)
Day 10-12: 7,800 EGP/day (+25%)
Day 13-15: 9,750 EGP/day (+25%)
Day 16+:   10,000 EGP/day (target ceiling, reassess)
```

---

## PHASE 7: 3-DAY REVIEW PROTOCOL

**When user says "pull the data" after 3 days:**

Step 1 — Recall this plan's benchmarks:
- Target ROAS: 9x | Max CPA: 250 EGP | Daily budget: 4,000 EGP
- Scaling rule: +25% every 3 days on winners

Step 2 — Run these MCP calls:
```
get_performance(account_id, level='campaign', date_from=<3 days ago>)
get_performance(account_id, level='adset', date_from=<3 days ago>)
get_performance(account_id, level='ad', date_from=<3 days ago>)
```

Step 3 — Decision matrix:
- Which adsets hit 9x? → Scale +25%
- Which adsets are 6-9x? → Hold, new creative
- Which adsets are dead? → Kill, reallocate
- Which remake creatives won? → Add to winners roster
- Funnel check: Is ATC audience growing? If >1,000 people → launch retargeting

Step 4 — Suggest next test based on gaps

---

## Pixel & Tracking Reference
- **Primary pixel:** 1682282089404045 (healthy — CAPI + browser, 62 purchases/week)
- **Use for all campaigns** — do not use pixel 592907990126734 (4 events/week, unreliable)
- **Key audiences available:**
  - Buyers list: 120241111178290401 (exclude from cold, seed for LAL when big enough)
  - ATC no purchase: 120236082907880401 (too small now, monitor)

## Execution Order
1. `change_entity_status` → Pause MSGS campaign
2. `change_entity_budget` → Scale AS5 to 600 EGP/day
3. `change_entity_status` → Pause weak "1-Copy" ad in Andromida
4. `list_adsets` → Get AS5 exact ID first
5. `create_campaign` → New 4K ABO campaign
6. `create_adset` × 4 → 4 adsets with budgets above
7. `create_ad` → Attach proven creatives to AS1 + AS2
8. `create_creative` + `create_ad` → New hook scripts for AS3 + AS4
9. `change_entity_status` × 4 → Resume all adsets
10. Verify delivery after 2 hours
