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
