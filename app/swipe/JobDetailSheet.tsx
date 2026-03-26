'use client'

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
