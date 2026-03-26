'use client'
import { useState, useCallback } from 'react'
import SwipeCard, { Job } from './SwipeCard'
import JobDetailSheet from './JobDetailSheet'
import SwipeControls from './SwipeControls'

interface SwipeStackProps {
  initialJobs: Job[]
  initialCredits: number
}

export default function SwipeStack({ initialJobs, initialCredits }: SwipeStackProps) {
  const [jobs, setJobs] = useState<Job[]>(initialJobs)
  const [credits, setCredits] = useState<number>(initialCredits)
  const [detailJob, setDetailJob] = useState<Job | null>(null)
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 2000)
  }

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
        setCredits(c => c - 1)
        showToast('Superliked! ★ Generating cover letter...')
        generateCoverLetter(job.id)
      }
    } catch {
      showToast('Something went wrong')
    }
  }, [jobs, credits])

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
