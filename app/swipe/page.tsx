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

  // Fetch user credits and plan
  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('credits, plan')
    .eq('clerk_id', userId)
    .single()

  const credits = profile?.credits ?? 0
  const plan = profile?.plan ?? 'free'

  // Get IDs of jobs already swiped by this user
  const { data: swipedRows } = await supabaseAdmin
    .from('job_swipes')
    .select('job_id')
    .eq('clerk_id', userId)

  const swipedIds = (swipedRows ?? []).map((r: { job_id: string }) => r.job_id)

  // Fetch unswiped jobs
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

  // Free plan: only show 5 cards
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
          initialJobs={visibleJobs.reverse()}
          initialCredits={credits}
        />
      </div>
    </div>
  )
}
