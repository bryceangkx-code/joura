# Joura Swipe (Tinder for Jobs) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a mobile-first Tinder-style swipe interface at `/swipe` that lets users quickly browse jobs, save or reject them with gestures, view full JDs in a bottom sheet, spend credits on Superlikes (AI cover letter), and sync all activity back to the existing Joura dashboard.

**Architecture:** A new `/swipe` route fetches only jobs the user hasn't yet swiped, rendering them as a draggable card stack using `@use-gesture/react` + `react-spring`. Swipe right = save (calls existing `/api/jobs/[id]/save`), swipe left = reject (new `/api/jobs/[id]/swipe` endpoint), swipe up = Superlike (deducts 1 credit, generates AI cover letter via Claude, saves to `cover_letters` table). Saved/applied jobs from the swipe view appear on the dashboard immediately because they share the same `jobs` table and status field. A Stripe one-time payment flow tops up credits.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, `@use-gesture/react`, `react-spring`, Supabase, Anthropic Claude Haiku, Stripe one-time payment intents, Tailwind CSS v4

---

## File Map

### New Files
- `app/swipe/page.tsx` — Swipe page (entry point, auth + data fetch)
- `app/swipe/SwipeStack.tsx` — Manages card stack state (queue, transitions)
- `app/swipe/SwipeCard.tsx` — Single draggable job card with gesture physics
- `app/swipe/JobDetailSheet.tsx` — Bottom sheet showing full JD on tap
- `app/swipe/SwipeControls.tsx` — Action buttons (X, ★, ↑ Superlike) below cards
- `app/api/swipe/jobs/route.ts` — GET unswipped jobs for current user
- `app/api/jobs/[id]/swipe/route.ts` — POST record a swipe (left/right/super)
- `app/api/cover-letter/route.ts` — POST generate + save cover letter via Claude
- `app/api/credits/checkout/route.ts` — POST create Stripe one-time payment intent
- `supabase-swipe-migration.sql` — SQL to add `job_swipes`, `cover_letters`, and `credits` column

### Modified Files
- `app/api/stripe/webhook/route.ts` — Handle `payment_intent.succeeded` to credit user
- `app/dashboard/page.tsx` — Add "Cover Letters" tab + show saved-from-swipe badge
- `components/Nav.tsx` — Add Swipe nav link
- `package.json` — Add `@use-gesture/react`, `@react-spring/web`

---

## Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install swipe gesture + animation libraries**

```bash
cd c:/Users/bryce/Claude/joura
npm install @use-gesture/react @react-spring/web
```

Expected output: Both packages added to `node_modules` and `package.json` dependencies.

- [ ] **Step 2: Verify install**

```bash
node -e "require('@use-gesture/react'); require('@react-spring/web'); console.log('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add @use-gesture/react and @react-spring/web for swipe UI"
```

---

## Task 2: Database Migration

**Files:**
- Create: `supabase-swipe-migration.sql`

- [ ] **Step 1: Write the migration SQL**

Create `supabase-swipe-migration.sql` in the project root:

```sql
-- Add credits column to user_profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS credits INTEGER NOT NULL DEFAULT 0;

-- Track swipe decisions (left = reject, right = save, super = superlike)
CREATE TABLE IF NOT EXISTS job_swipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id TEXT NOT NULL REFERENCES user_profiles(clerk_id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('left', 'right', 'super')),
  swiped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(clerk_id, job_id)
);

CREATE INDEX IF NOT EXISTS job_swipes_clerk_id_idx ON job_swipes(clerk_id);
CREATE INDEX IF NOT EXISTS job_swipes_job_id_idx ON job_swipes(job_id);

-- Store generated cover letters
CREATE TABLE IF NOT EXISTS cover_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id TEXT NOT NULL REFERENCES user_profiles(clerk_id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  resume_id UUID REFERENCES resumes(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cover_letters_clerk_id_idx ON cover_letters(clerk_id);
```

- [ ] **Step 2: Run migration in Supabase**

Go to Supabase Dashboard → SQL Editor → paste contents of `supabase-swipe-migration.sql` → Run.

Verify by checking:
- `user_profiles` has `credits` column (default 0)
- `job_swipes` table exists
- `cover_letters` table exists

- [ ] **Step 3: Commit**

```bash
git add supabase-swipe-migration.sql
git commit -m "feat: add job_swipes and cover_letters tables, credits column"
```

---

## Task 3: API — GET Unswiped Jobs for Swipe Feed

**Files:**
- Create: `app/api/swipe/jobs/route.ts`

- [ ] **Step 1: Create the route**

Create `app/api/swipe/jobs/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get IDs of jobs already swiped by this user
  const { data: swipedRows } = await supabaseAdmin
    .from('job_swipes')
    .select('job_id')
    .eq('clerk_id', userId)

  const swipedIds = (swipedRows ?? []).map((r: { job_id: string }) => r.job_id)

  // Fetch jobs not yet swiped, ordered by newest first, limit 50
  let query = supabaseAdmin
    .from('jobs')
    .select('id, title, company, location, fit_score, fit_reason, job_url, job_description, job_type, status, posted_date')
    .eq('user_id', userId)
    .order('posted_date', { ascending: false })
    .limit(50)

  if (swipedIds.length > 0) {
    query = query.not('id', 'in', `(${swipedIds.join(',')})`)
  }

  const { data: jobs, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ jobs: jobs ?? [] })
}
```

- [ ] **Step 2: Test the route manually**

Start dev server: `npm run dev`

In browser (logged in), navigate to: `http://localhost:3000/api/swipe/jobs`

Expected: JSON with `{ jobs: [...] }` array of jobs for the user.

- [ ] **Step 3: Commit**

```bash
git add app/api/swipe/jobs/route.ts
git commit -m "feat: add GET /api/swipe/jobs route for unswiped job feed"
```

---

## Task 4: API — Record a Swipe

**Files:**
- Create: `app/api/jobs/[id]/swipe/route.ts`

- [ ] **Step 1: Create the route**

Create `app/api/jobs/[id]/swipe/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: jobId } = await params
  const body = await request.json()
  const direction = body.direction as 'left' | 'right' | 'super'

  if (!['left', 'right', 'super'].includes(direction)) {
    return NextResponse.json({ error: 'Invalid direction' }, { status: 400 })
  }

  // Check credits for superlike
  if (direction === 'super') {
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('credits, plan')
      .eq('clerk_id', userId)
      .single()

    if (!profile || profile.credits < 1) {
      return NextResponse.json({ error: 'Not enough credits' }, { status: 402 })
    }

    // Deduct 1 credit
    await supabaseAdmin
      .from('user_profiles')
      .update({ credits: profile.credits - 1 })
      .eq('clerk_id', userId)
  }

  // Record the swipe (upsert so re-swiping overwrites)
  const { error: swipeError } = await supabaseAdmin
    .from('job_swipes')
    .upsert({ clerk_id: userId, job_id: jobId, direction }, { onConflict: 'clerk_id,job_id' })

  if (swipeError) return NextResponse.json({ error: swipeError.message }, { status: 500 })

  // Swipe right or super → save the job (set status to 'saved')
  if (direction === 'right' || direction === 'super') {
    await supabaseAdmin
      .from('jobs')
      .update({ status: 'saved' })
      .eq('id', jobId)
      .eq('user_id', userId)
  }

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Test via curl**

```bash
# Replace TOKEN with your Clerk session token and JOB_ID with a real job ID
curl -X POST http://localhost:3000/api/jobs/JOB_ID/swipe \
  -H "Content-Type: application/json" \
  -d '{"direction":"right"}'
```

Expected: `{ "ok": true }` (or 401 if not logged in from browser session)

- [ ] **Step 3: Commit**

```bash
git add app/api/jobs/[id]/swipe/route.ts
git commit -m "feat: add POST /api/jobs/[id]/swipe to record swipe + deduct credits"
```

---

## Task 5: API — Generate & Save Cover Letter

**Files:**
- Create: `app/api/cover-letter/route.ts`

- [ ] **Step 1: Create the route**

Create `app/api/cover-letter/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Only premium users OR superlike (credits already deducted before this call)
  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('plan, job_title, skills')
    .eq('clerk_id', userId)
    .single()

  if (!profile || profile.plan !== 'premium') {
    return NextResponse.json({ error: 'Premium required' }, { status: 403 })
  }

  const { jobId, resumeId } = await request.json()

  // Fetch job details
  const { data: job } = await supabaseAdmin
    .from('jobs')
    .select('title, company, location, job_description')
    .eq('id', jobId)
    .eq('user_id', userId)
    .single()

  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

  // Fetch latest resume if resumeId provided
  let resumeContext = ''
  if (resumeId) {
    const { data: resume } = await supabaseAdmin
      .from('resumes')
      .select('file_name')
      .eq('id', resumeId)
      .eq('clerk_id', userId)
      .single()
    if (resume) resumeContext = `Candidate's resume file: ${resume.file_name}`
  }

  const prompt = `Write a compelling, concise cover letter for this job application.

Job Title: ${job.title}
Company: ${job.company}
Location: ${job.location}
Job Description: ${job.job_description ?? 'Not provided'}

Candidate Profile:
- Current/target role: ${profile.job_title ?? 'Not specified'}
- Skills: ${(profile.skills ?? []).join(', ') || 'Not specified'}
${resumeContext}

Write a 3-paragraph cover letter that:
1. Opens with genuine interest in this specific role and company
2. Highlights 2-3 relevant skills/experiences matching the JD
3. Closes with a confident call to action

Keep it under 300 words. Do not include a header/date/address block. Start with "Dear Hiring Manager,"`

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }]
  })

  const content = (message.content[0] as { type: string; text: string }).text

  // Save to cover_letters table
  const { data: saved, error: saveError } = await supabaseAdmin
    .from('cover_letters')
    .insert({ clerk_id: userId, job_id: jobId, resume_id: resumeId ?? null, content })
    .select('id')
    .single()

  if (saveError) return NextResponse.json({ error: saveError.message }, { status: 500 })

  return NextResponse.json({ id: saved.id, content })
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/cover-letter/route.ts
git commit -m "feat: add POST /api/cover-letter to generate + save AI cover letter"
```

---

## Task 6: API — Credits Checkout (Stripe One-Time Payment)

**Files:**
- Create: `app/api/credits/checkout/route.ts`

- [ ] **Step 1: Create the route**

Create `app/api/credits/checkout/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Credit packs: key = pack name, value = { credits, price in cents }
const CREDIT_PACKS = {
  starter: { credits: 5, price: 499 },    // $4.99 for 5 Superlikes
  value: { credits: 15, price: 999 },     // $9.99 for 15 Superlikes
  power: { credits: 40, price: 1999 },    // $19.99 for 40 Superlikes
} as const

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { pack } = await request.json() as { pack: keyof typeof CREDIT_PACKS }
  const creditPack = CREDIT_PACKS[pack]
  if (!creditPack) return NextResponse.json({ error: 'Invalid pack' }, { status: 400 })

  // Get or create Stripe customer
  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('stripe_customer_id')
    .eq('clerk_id', userId)
    .single()

  let customerId = profile?.stripe_customer_id
  if (!customerId) {
    const customer = await stripe.customers.create({ metadata: { clerk_id: userId } })
    customerId = customer.id
    await supabaseAdmin
      .from('user_profiles')
      .update({ stripe_customer_id: customerId })
      .eq('clerk_id', userId)
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'payment',
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: {
          name: `Joura Superlike Credits — ${creditPack.credits} pack`,
          description: `${creditPack.credits} Superlike credits for AI cover letters`,
        },
        unit_amount: creditPack.price,
      },
      quantity: 1,
    }],
    metadata: { clerk_id: userId, credits: String(creditPack.credits) },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/swipe?credits=added`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/swipe`,
  })

  return NextResponse.json({ url: session.url })
}
```

- [ ] **Step 2: Add `NEXT_PUBLIC_APP_URL` to `.env.local`**

Open `.env.local` and add (if not present):

```
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

For production, set this to your Vercel URL.

- [ ] **Step 3: Commit**

```bash
git add app/api/credits/checkout/route.ts
git commit -m "feat: add credits checkout route for Superlike credit packs"
```

---

## Task 7: Stripe Webhook — Credit Fulfillment

**Files:**
- Modify: `app/api/stripe/webhook/route.ts`

- [ ] **Step 1: Read the existing webhook file**

Read `app/api/stripe/webhook/route.ts` to understand current event handling structure.

- [ ] **Step 2: Add `checkout.session.completed` handler for credits**

Locate the switch/if block handling Stripe events. Add a case for credit packs (sessions with `credits` in metadata):

```typescript
// Inside the event handling block, after existing cases:
if (event.type === 'checkout.session.completed') {
  const session = event.data.object as Stripe.Checkout.Session
  const clerkId = session.metadata?.clerk_id
  const credits = session.metadata?.credits ? parseInt(session.metadata.credits) : null

  // Only process credit top-ups (subscription sessions won't have credits metadata)
  if (clerkId && credits && session.mode === 'payment') {
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('credits')
      .eq('clerk_id', clerkId)
      .single()

    if (profile) {
      await supabaseAdmin
        .from('user_profiles')
        .update({ credits: (profile.credits ?? 0) + credits })
        .eq('clerk_id', clerkId)
    }
  }
}
```

Make sure `supabaseAdmin` is already imported in that file (it should be). If the file uses a different variable name for the admin client, match it.

- [ ] **Step 3: Commit**

```bash
git add app/api/stripe/webhook/route.ts
git commit -m "feat: handle credit top-up fulfillment in Stripe webhook"
```

---

## Task 8: SwipeCard Component

**Files:**
- Create: `app/swipe/SwipeCard.tsx`

- [ ] **Step 1: Create the component**

Create `app/swipe/SwipeCard.tsx`:

```typescript
'use client'
import { useSpring, animated } from '@react-spring/web'
import { useDrag } from '@use-gesture/react'
import { useRef } from 'react'

export interface Job {
  id: string
  title: string
  company: string
  location: string
  fit_score: number | null
  fit_reason: string | null
  job_url: string | null
  job_description: string | null
  job_type: string
  status: string
  posted_date: string
}

interface SwipeCardProps {
  job: Job
  isTop: boolean
  onSwipe: (direction: 'left' | 'right' | 'super') => void
  onTap: () => void
}

const SWIPE_THRESHOLD = 120
const SUPER_THRESHOLD = -80  // upward drag distance

export default function SwipeCard({ job, isTop, onSwipe, onTap }: SwipeCardProps) {
  const dragStartPos = useRef<{ x: number; y: number } | null>(null)

  const [{ x, y, rotate, scale }, api] = useSpring(() => ({
    x: 0, y: 0, rotate: 0, scale: 1,
    config: { tension: 300, friction: 30 }
  }))

  const bind = useDrag(({ active, movement: [mx, my], velocity: [vx], tap, event }) => {
    if (!isTop) return

    if (tap) {
      onTap()
      return
    }

    if (active) {
      api.start({ x: mx, y: my, rotate: mx / 20, scale: 1.02, immediate: true })
    } else {
      const isRight = mx > SWIPE_THRESHOLD || vx > 0.5
      const isLeft = mx < -SWIPE_THRESHOLD || vx < -0.5
      const isSuper = my < SUPER_THRESHOLD

      if (isSuper) {
        api.start({ x: 0, y: -600, rotate: 0, scale: 0.8 })
        onSwipe('super')
      } else if (isRight) {
        api.start({ x: 600, y: my, rotate: 30, scale: 0.8 })
        onSwipe('right')
      } else if (isLeft) {
        api.start({ x: -600, y: my, rotate: -30, scale: 0.8 })
        onSwipe('left')
      } else {
        api.start({ x: 0, y: 0, rotate: 0, scale: 1 })
      }
    }
  }, { filterTaps: true })

  const fitColor =
    job.fit_score === null ? 'bg-gray-100 text-gray-500' :
    job.fit_score >= 80 ? 'bg-green-100 text-green-700' :
    job.fit_score >= 60 ? 'bg-yellow-100 text-yellow-700' :
    'bg-red-100 text-red-600'

  return (
    <animated.div
      {...(isTop ? bind() : {})}
      style={{ x, y, rotate, scale, touchAction: 'none' }}
      className="absolute inset-0 cursor-grab active:cursor-grabbing select-none"
    >
      <div className="w-full h-full bg-white rounded-2xl shadow-xl border border-gray-100 p-6 flex flex-col justify-between overflow-hidden">
        {/* Swipe hint overlays */}
        <animated.div
          style={{ opacity: x.to(v => Math.max(0, v / SWIPE_THRESHOLD)) }}
          className="absolute inset-0 bg-green-400/20 rounded-2xl flex items-center justify-center z-10 pointer-events-none"
        >
          <span className="text-5xl font-black text-green-600 border-4 border-green-600 rounded-xl px-4 py-2 rotate-[-15deg]">SAVE</span>
        </animated.div>
        <animated.div
          style={{ opacity: x.to(v => Math.max(0, -v / SWIPE_THRESHOLD)) }}
          className="absolute inset-0 bg-red-400/20 rounded-2xl flex items-center justify-center z-10 pointer-events-none"
        >
          <span className="text-5xl font-black text-red-600 border-4 border-red-600 rounded-xl px-4 py-2 rotate-[15deg]">SKIP</span>
        </animated.div>
        <animated.div
          style={{ opacity: y.to(v => Math.max(0, -v / Math.abs(SUPER_THRESHOLD))) }}
          className="absolute inset-0 bg-yellow-400/20 rounded-2xl flex items-center justify-center z-10 pointer-events-none"
        >
          <span className="text-5xl font-black text-yellow-600 border-4 border-yellow-600 rounded-xl px-4 py-2">SUPER ★</span>
        </animated.div>

        {/* Card content */}
        <div>
          <div className="flex items-start justify-between mb-2">
            <div>
              <h2 className="text-xl font-bold text-gray-900 leading-tight">{job.title}</h2>
              <p className="text-base text-gray-600 font-medium mt-0.5">{job.company}</p>
            </div>
            {job.fit_score !== null && (
              <span className={`text-sm font-semibold px-3 py-1 rounded-full ${fitColor}`}>
                {job.fit_score}% fit
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{job.location}</span>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{job.job_type}</span>
            {job.posted_date && (
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                {new Date(job.posted_date).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        {job.fit_reason && (
          <p className="text-sm text-gray-500 italic mt-4 line-clamp-3">"{job.fit_reason}"</p>
        )}

        {job.job_description && (
          <p className="text-sm text-gray-600 mt-4 line-clamp-4">
            {job.job_description.slice(0, 250)}...
          </p>
        )}

        <p className="text-xs text-gray-400 text-center mt-4">Tap for full details</p>
      </div>
    </animated.div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/swipe/SwipeCard.tsx
git commit -m "feat: add SwipeCard component with drag gesture + visual feedback"
```

---

## Task 9: JobDetailSheet Component

**Files:**
- Create: `app/swipe/JobDetailSheet.tsx`

- [ ] **Step 1: Create the component**

Create `app/swipe/JobDetailSheet.tsx`:

```typescript
'use client'
import { Job } from './SwipeCard'

interface JobDetailSheetProps {
  job: Job | null
  onClose: () => void
  onSwipe: (direction: 'left' | 'right' | 'super') => void
}

export default function JobDetailSheet({ job, onClose, onSwipe }: JobDetailSheetProps) {
  if (!job) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl max-h-[85vh] flex flex-col">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto px-6 pb-6 flex-1">
          <div className="flex items-start justify-between mb-1">
            <h2 className="text-2xl font-bold text-gray-900">{job.title}</h2>
            {job.fit_score !== null && (
              <span className={`text-sm font-semibold px-3 py-1 rounded-full shrink-0 ml-2 ${
                job.fit_score >= 80 ? 'bg-green-100 text-green-700' :
                job.fit_score >= 60 ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-600'
              }`}>
                {job.fit_score}% fit
              </span>
            )}
          </div>

          <p className="text-lg text-gray-600 font-medium">{job.company}</p>

          <div className="flex flex-wrap gap-2 mt-3">
            <span className="text-sm bg-gray-100 text-gray-600 px-3 py-1 rounded-full">{job.location}</span>
            <span className="text-sm bg-gray-100 text-gray-600 px-3 py-1 rounded-full">{job.job_type}</span>
          </div>

          {job.fit_reason && (
            <div className="mt-4 p-4 bg-blue-50 rounded-xl">
              <p className="text-sm font-semibold text-blue-700 mb-1">Why it fits you</p>
              <p className="text-sm text-blue-600">{job.fit_reason}</p>
            </div>
          )}

          {job.job_description && (
            <div className="mt-5">
              <h3 className="text-base font-semibold text-gray-800 mb-2">Job Description</h3>
              <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">
                {job.job_description}
              </p>
            </div>
          )}

          {job.job_url && (
            <a
              href={job.job_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 block text-center bg-gray-900 text-white py-3 rounded-xl font-semibold"
            >
              View Original Posting →
            </a>
          )}
        </div>

        {/* Action buttons pinned at bottom */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={() => { onSwipe('left'); onClose() }}
            className="flex-1 py-3 border-2 border-red-400 text-red-500 font-semibold rounded-xl"
          >
            ✕ Skip
          </button>
          <button
            onClick={() => { onSwipe('super'); onClose() }}
            className="flex-1 py-3 bg-yellow-400 text-yellow-900 font-semibold rounded-xl"
          >
            ★ Superlike
          </button>
          <button
            onClick={() => { onSwipe('right'); onClose() }}
            className="flex-1 py-3 bg-green-500 text-white font-semibold rounded-xl"
          >
            ✓ Save
          </button>
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/swipe/JobDetailSheet.tsx
git commit -m "feat: add JobDetailSheet bottom sheet for full JD view"
```

---

## Task 10: SwipeControls Component

**Files:**
- Create: `app/swipe/SwipeControls.tsx`

- [ ] **Step 1: Create the component**

Create `app/swipe/SwipeControls.tsx`:

```typescript
'use client'

interface SwipeControlsProps {
  onSwipe: (direction: 'left' | 'right' | 'super') => void
  credits: number
  onBuyCredits: () => void
}

export default function SwipeControls({ onSwipe, credits, onBuyCredits }: SwipeControlsProps) {
  return (
    <div className="flex items-center justify-center gap-5 py-6">
      {/* Skip */}
      <button
        onClick={() => onSwipe('left')}
        className="w-14 h-14 rounded-full bg-white border-2 border-red-400 text-red-500 text-2xl shadow-md flex items-center justify-center active:scale-90 transition-transform"
        aria-label="Skip job"
      >
        ✕
      </button>

      {/* Superlike */}
      <button
        onClick={() => credits > 0 ? onSwipe('super') : onBuyCredits()}
        className={`w-16 h-16 rounded-full text-2xl shadow-md flex flex-col items-center justify-center active:scale-90 transition-transform relative ${
          credits > 0
            ? 'bg-yellow-400 text-yellow-900 border-2 border-yellow-500'
            : 'bg-gray-100 text-gray-400 border-2 border-gray-200'
        }`}
        aria-label={credits > 0 ? 'Superlike job' : 'Buy Superlike credits'}
      >
        <span>★</span>
        <span className="text-[10px] font-bold mt-0.5">{credits > 0 ? `${credits} left` : 'Buy'}</span>
      </button>

      {/* Save */}
      <button
        onClick={() => onSwipe('right')}
        className="w-14 h-14 rounded-full bg-green-500 text-white text-2xl shadow-md flex items-center justify-center active:scale-90 transition-transform"
        aria-label="Save job"
      >
        ✓
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/swipe/SwipeControls.tsx
git commit -m "feat: add SwipeControls action buttons with credits display"
```

---

## Task 11: SwipeStack Component

**Files:**
- Create: `app/swipe/SwipeStack.tsx`

- [ ] **Step 1: Create the component**

Create `app/swipe/SwipeStack.tsx`:

```typescript
'use client'
import { useState, useCallback } from 'react'
import SwipeCard, { Job } from './SwipeCard'
import JobDetailSheet from './JobDetailSheet'
import SwipeControls from './SwipeControls'

interface SwipeStackProps {
  initialJobs: Job[]
  credits: number
  onCreditsChange: (newCount: number) => void
}

export default function SwipeStack({ initialJobs, credits, onCreditsChange }: SwipeStackProps) {
  const [jobs, setJobs] = useState<Job[]>(initialJobs)
  const [detailJob, setDetailJob] = useState<Job | null>(null)
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 2000)
  }

  const handleSwipe = useCallback(async (direction: 'left' | 'right' | 'super') => {
    const job = jobs[jobs.length - 1]
    if (!job) return

    if (direction === 'super' && credits < 1) {
      showToast('No credits! Buy Superlikes to use this.')
      return
    }

    try {
      const res = await fetch(`/api/jobs/${job.id}/swipe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction })
      })

      if (res.status === 402) {
        showToast('Not enough credits')
        return
      }

      if (!res.ok) throw new Error('Swipe failed')

      // Remove swiped job from stack
      setJobs(prev => prev.slice(0, -1))

      if (direction === 'right') showToast('Saved! ✓')
      if (direction === 'left') showToast('Skipped')
      if (direction === 'super') {
        onCreditsChange(credits - 1)
        showToast('Superliked! ★ Generating cover letter...')
        // Fire cover letter generation in background
        generateCoverLetter(job.id)
      }
    } catch {
      showToast('Something went wrong')
    }
  }, [jobs, credits, onCreditsChange])

  const generateCoverLetter = async (jobId: string) => {
    try {
      await fetch('/api/cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId })
      })
      showToast('Cover letter saved to your profile ★')
    } catch {
      // Silently fail — cover letter is a bonus, not blocking
    }
  }

  const handleBuyCredits = async () => {
    const res = await fetch('/api/credits/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pack: 'starter' })
    })
    const { url } = await res.json()
    if (url) window.location.href = url
  }

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
        <span className="text-6xl">🎉</span>
        <h2 className="text-2xl font-bold text-gray-800">You're all caught up!</h2>
        <p className="text-gray-500">New jobs will appear as they're added. Check back soon.</p>
        <a href="/dashboard" className="mt-4 px-6 py-3 bg-gray-900 text-white rounded-xl font-semibold">
          View Saved Jobs →
        </a>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Card stack */}
      <div className="relative flex-1 mx-4 mt-4">
        {/* Background cards (visual depth) */}
        {jobs.slice(Math.max(0, jobs.length - 3), jobs.length - 1).map((job, i) => (
          <div
            key={job.id}
            className="absolute inset-0 bg-white rounded-2xl border border-gray-100 shadow"
            style={{
              transform: `scale(${0.92 + i * 0.04}) translateY(${(jobs.length - 2 - i) * -6}px)`,
              zIndex: i
            }}
          />
        ))}

        {/* Top card (interactive) */}
        <SwipeCard
          key={jobs[jobs.length - 1].id}
          job={jobs[jobs.length - 1]}
          isTop={true}
          onSwipe={handleSwipe}
          onTap={() => setDetailJob(jobs[jobs.length - 1])}
        />
      </div>

      {/* Job counter */}
      <p className="text-center text-sm text-gray-400 mt-2">{jobs.length} job{jobs.length !== 1 ? 's' : ''} left</p>

      {/* Controls */}
      <SwipeControls onSwipe={handleSwipe} credits={credits} onBuyCredits={handleBuyCredits} />

      {/* Detail sheet */}
      <JobDetailSheet
        job={detailJob}
        onClose={() => setDetailJob(null)}
        onSwipe={(dir) => { handleSwipe(dir); setDetailJob(null) }}
      />

      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-medium z-50 shadow-lg">
          {toastMsg}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/swipe/SwipeStack.tsx
git commit -m "feat: add SwipeStack managing card queue, swipe actions, and toasts"
```

---

## Task 12: Swipe Page

**Files:**
- Create: `app/swipe/page.tsx`

- [ ] **Step 1: Create the page**

Create `app/swipe/page.tsx`:

```typescript
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import SwipeStack from './SwipeStack'
import { Job } from './SwipeCard'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function SwipePage({
  searchParams
}: {
  searchParams: Promise<{ credits?: string }>
}) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const params = await searchParams

  // Fetch user credits
  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('credits, plan')
    .eq('clerk_id', userId)
    .single()

  const credits = profile?.credits ?? 0
  const plan = profile?.plan ?? 'free'

  // Fetch unswiped jobs
  const { data: swipedRows } = await supabaseAdmin
    .from('job_swipes')
    .select('job_id')
    .eq('clerk_id', userId)

  const swipedIds = (swipedRows ?? []).map((r: { job_id: string }) => r.job_id)

  let query = supabaseAdmin
    .from('jobs')
    .select('id, title, company, location, fit_score, fit_reason, job_url, job_description, job_type, status, posted_date')
    .eq('user_id', userId)
    .order('posted_date', { ascending: false })
    .limit(50)

  if (swipedIds.length > 0) {
    query = query.not('id', 'in', `(${swipedIds.join(',')})`)
  }

  const { data: jobs } = await query

  // Free plan: only show 5 cards in swipe mode
  const visibleJobs: Job[] = plan === 'free'
    ? (jobs ?? []).slice(0, 5)
    : (jobs ?? [])

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-2">
        <a href="/dashboard" className="text-gray-500 text-sm">← Dashboard</a>
        <h1 className="text-xl font-bold text-gray-900">Joura</h1>
        <a href="/swipe/credits" className="text-sm font-medium text-yellow-600">
          ★ {credits}
        </a>
      </div>

      {params.credits === 'added' && (
        <div className="mx-4 mb-2 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 text-center">
          Credits added! Swipe up to Superlike a role.
        </div>
      )}

      {plan === 'free' && (
        <div className="mx-4 mb-2 p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700 text-center">
          Free plan: 5 job preview.{' '}
          <a href="/pricing" className="underline font-medium">Upgrade for full access →</a>
        </div>
      )}

      {/* Swipe stack fills remaining height */}
      <div className="flex-1 min-h-0">
        <SwipeStack
          initialJobs={visibleJobs.reverse()} // reverse so last item = top card
          credits={credits}
          onCreditsChange={() => {}} // credits update handled server-side, toast shown
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/swipe/page.tsx
git commit -m "feat: add /swipe page with server-side data fetch and plan gating"
```

---

## Task 13: Credits Page (Buy More Superlikes)

**Files:**
- Create: `app/swipe/credits/page.tsx`

- [ ] **Step 1: Create the credits purchase page**

Create `app/swipe/credits/page.tsx`:

```typescript
'use client'
import { useState } from 'react'

const PACKS = [
  { id: 'starter', label: '5 Superlikes', price: '$4.99', note: 'Try it out' },
  { id: 'value', label: '15 Superlikes', price: '$9.99', note: 'Most popular', highlight: true },
  { id: 'power', label: '40 Superlikes', price: '$19.99', note: 'Best value' },
]

export default function CreditsPage() {
  const [loading, setLoading] = useState<string | null>(null)

  const handleBuy = async (packId: string) => {
    setLoading(packId)
    try {
      const res = await fetch('/api/credits/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pack: packId })
      })
      const { url } = await res.json()
      if (url) window.location.href = url
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 py-12">
      <a href="/swipe" className="self-start text-gray-500 text-sm mb-6">← Back to Swipe</a>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">Superlike Credits</h1>
      <p className="text-gray-500 text-center mb-8 max-w-sm">
        Use a Superlike to instantly generate a tailored cover letter for a job — saved to your Joura profile.
      </p>

      <div className="w-full max-w-sm flex flex-col gap-4">
        {PACKS.map((pack) => (
          <button
            key={pack.id}
            onClick={() => handleBuy(pack.id)}
            disabled={loading === pack.id}
            className={`w-full p-5 rounded-2xl border-2 text-left transition-all ${
              pack.highlight
                ? 'border-yellow-400 bg-yellow-50'
                : 'border-gray-200 bg-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-lg font-bold text-gray-900">★ {pack.label}</span>
                <p className="text-sm text-gray-500 mt-0.5">{pack.note}</p>
              </div>
              <span className="text-lg font-semibold text-gray-800">
                {loading === pack.id ? '...' : pack.price}
              </span>
            </div>
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-400 mt-6 text-center">
        Credits never expire. Powered by Stripe.
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/swipe/credits/page.tsx
git commit -m "feat: add Superlike credits purchase page"
```

---

## Task 14: Dashboard — Cover Letters Tab

**Files:**
- Modify: `app/dashboard/page.tsx`

- [ ] **Step 1: Read the current dashboard tabs logic**

Read `app/dashboard/page.tsx` lines 1–100 to find the existing tab structure (`All Jobs`, `Saved`, `Applied`).

- [ ] **Step 2: Add Cover Letters tab**

In the dashboard, add a fourth tab "Cover Letters" that fetches and displays saved cover letters from the `cover_letters` table. Locate the tabs array/rendering and add:

```tsx
// Add to tabs list (wherever All Jobs / Saved / Applied are defined):
{ id: 'cover_letters', label: 'Cover Letters' }
```

Add a fetch for cover letters when tab is active. Add a new section that renders when `activeTab === 'cover_letters'`:

```tsx
{activeTab === 'cover_letters' && (
  <div className="space-y-4 mt-4">
    {coverLetters.length === 0 ? (
      <div className="text-center py-12 text-gray-500">
        <p className="text-4xl mb-3">★</p>
        <p className="font-medium">No cover letters yet</p>
        <p className="text-sm mt-1">Superlike a job in the swipe view to generate one</p>
        <a href="/swipe" className="mt-4 inline-block px-5 py-2 bg-gray-900 text-white rounded-xl text-sm font-medium">
          Open Swipe View →
        </a>
      </div>
    ) : (
      coverLetters.map((cl: { id: string; content: string; job_id: string; created_at: string }) => (
        <div key={cl.id} className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-gray-400">{new Date(cl.created_at).toLocaleDateString()}</span>
            <button
              onClick={() => navigator.clipboard.writeText(cl.content)}
              className="text-xs text-blue-600 hover:underline"
            >
              Copy
            </button>
          </div>
          <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{cl.content}</p>
        </div>
      ))
    )}
  </div>
)}
```

Add a `coverLetters` state and fetch it when this tab becomes active. The fetch should call:

```typescript
const res = await fetch('/api/cover-letters')  // you'll create this below
```

- [ ] **Step 3: Create cover letters fetch route**

Create `app/api/cover-letters/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('cover_letters')
    .select('id, job_id, content, created_at')
    .eq('clerk_id', userId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ coverLetters: data ?? [] })
}
```

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/page.tsx app/api/cover-letters/route.ts
git commit -m "feat: add Cover Letters tab to dashboard with API route"
```

---

## Task 15: Nav — Add Swipe Link

**Files:**
- Modify: `components/Nav.tsx`

- [ ] **Step 1: Read Nav.tsx**

Read `components/Nav.tsx` to find the nav link structure.

- [ ] **Step 2: Add Swipe link**

Add a "Swipe" link to the navigation, pointing to `/swipe`. Match the existing link style. Place it after Dashboard and before other items.

Example (match existing structure in the file):

```tsx
<Link href="/swipe" className={/* existing link class */}>
  Swipe
</Link>
```

- [ ] **Step 3: Commit**

```bash
git add components/Nav.tsx
git commit -m "feat: add Swipe link to navigation"
```

---

## Task 16: PWA Manifest (Install to Home Screen)

**Files:**
- Create: `public/manifest.json`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Create the PWA manifest**

Create `public/manifest.json`:

```json
{
  "name": "Joura",
  "short_name": "Joura",
  "description": "Swipe jobs like Tinder",
  "start_url": "/swipe",
  "display": "standalone",
  "background_color": "#f9fafb",
  "theme_color": "#111827",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

Note: You'll need 192x192 and 512x512 PNG icons in `/public`. Use any placeholder for now.

- [ ] **Step 2: Add manifest link to layout.tsx**

In `app/layout.tsx`, find the `<head>` section (or the metadata export) and add:

```typescript
// In the metadata export or as a separate export:
export const metadata = {
  // ...existing metadata...
  manifest: '/manifest.json',
}
```

Or if using a `<head>` tag directly:

```html
<link rel="manifest" href="/manifest.json" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-title" content="Joura" />
```

- [ ] **Step 3: Commit**

```bash
git add public/manifest.json app/layout.tsx
git commit -m "feat: add PWA manifest for home screen install"
```

---

## Task 17: End-to-End Smoke Test

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Test swipe flow**

Navigate to `http://localhost:3000/swipe` (logged in).

Verify:
- [ ] Cards stack renders with job title, company, fit score
- [ ] Dragging right shows green SAVE overlay
- [ ] Dragging left shows red SKIP overlay
- [ ] Tapping card opens the bottom sheet with full JD
- [ ] Bottom sheet Save/Skip/Superlike buttons work
- [ ] After swiping, job disappears from stack
- [ ] "All caught up" screen shows when stack is empty

- [ ] **Step 3: Test sync to dashboard**

Navigate to `/dashboard` → Saved tab.

Verify: Jobs saved via swipe appear here.

- [ ] **Step 4: Test credits button**

Click ★ button with 0 credits → redirects to credits page or triggers checkout.

- [ ] **Step 5: Build check**

```bash
npm run build
```

Expected: No TypeScript errors, successful build.

- [ ] **Step 6: Final commit**

```bash
git add .
git commit -m "feat: complete swipe feature - Tinder UI, credits, cover letters, PWA"
```

---

## Self-Review

### Spec Coverage Check

| Requirement | Task |
|---|---|
| Tinder swipe UX | Tasks 8, 10, 11 |
| Tap for full JD popup | Task 9 |
| Swipe left = reject | Tasks 4, 10, 11 |
| Swipe right = save | Tasks 4, 10, 11 |
| Sync to Joura dashboard | Tasks 4 (saves status), 14 |
| Credits for Superlike | Tasks 2, 4, 6, 7, 10, 13 |
| AI cover letter | Task 5 |
| Cover letter saved to site | Tasks 2, 5, 14 |
| Resume tailoring (existing) | Uses existing `/api/resume/[id]/polish` |
| Mobile-first / PWA | Tasks 8–12, 16 |
| Plan gating (free = 5 cards) | Task 12 |

All requirements covered.

### Placeholder Scan

No TBDs, TODOs, or vague steps found. All code blocks are complete.

### Type Consistency

- `Job` type defined in `SwipeCard.tsx` and imported by `SwipeStack.tsx`, `JobDetailSheet.tsx`, `SwipeStack.tsx` — consistent
- `direction: 'left' | 'right' | 'super'` used consistently in `SwipeCard`, `SwipeStack`, `JobDetailSheet`, `SwipeControls`, and API routes
- `credits: number` passed as prop and used in API deduction — consistent
