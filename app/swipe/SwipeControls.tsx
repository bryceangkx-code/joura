'use client'

interface SwipeControlsProps {
  onSwipe: (direction: 'left' | 'right' | 'super') => void
  credits: number
  onBuyCredits: () => void
}

export default function SwipeControls({ onSwipe, credits, onBuyCredits }: SwipeControlsProps) {
  return (
    <div className="flex items-center justify-center gap-5 py-3" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
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
