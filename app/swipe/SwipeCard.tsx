'use client'
import { useSpring, animated } from '@react-spring/web'
import { useDrag } from '@use-gesture/react'

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
const SUPER_THRESHOLD = -80

export default function SwipeCard({ job, isTop, onSwipe, onTap }: SwipeCardProps) {
  const [{ x, y, rotate, scale }, api] = useSpring(() => ({
    x: 0, y: 0, rotate: 0, scale: 1,
    config: { tension: 300, friction: 30 }
  }))

  const bind = useDrag(({ active, movement: [mx, my], velocity: [vx], tap }) => {
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
      <div className="w-full h-full bg-white rounded-2xl shadow-xl border border-gray-100 p-4 sm:p-6 flex flex-col justify-between overflow-hidden">
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
