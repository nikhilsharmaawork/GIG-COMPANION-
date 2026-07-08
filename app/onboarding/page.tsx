'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const ALL_PLATFORMS = ['Bolt', 'Wolt']

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()

  const [platforms, setPlatforms] = useState<string[]>([])
  const [monthlyGoal, setMonthlyGoal] = useState('')
  const [taxPlanning, setTaxPlanning] = useState(false)
  const [loading, setLoading] = useState(false)

  function togglePlatform(p: string) {
    setPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]))
  }

  async function handleContinue() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase
        .from('profiles')
        .update({
          platforms,
          monthly_goal: Number(monthlyGoal) || 0,
          tax_planning: taxPlanning,
        })
        .eq('id', user.id)
    }
    setLoading(false)
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col justify-center px-6 py-12">
      <div className="mx-auto w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-2">🎉</div>
          <h1 className="text-xl font-bold text-slate-800">Quick setup</h1>
          <p className="text-slate-500 text-sm mt-1">Takes 30 seconds</p>
        </div>

        <div className="flex flex-col gap-5">
          <div>
            <label className="mb-2 block text-sm text-slate-600">Which platforms do you work on?</label>
            <div className="flex gap-2">
              {ALL_PLATFORMS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => togglePlatform(p)}
                  className={`rounded-xl border px-4 py-2 text-sm font-medium ${
                    platforms.includes(p)
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-600">Monthly income goal (€)</label>
            <input
              inputMode="decimal"
              value={monthlyGoal}
              onChange={(e) => setMonthlyGoal(e.target.value)}
              placeholder="1500"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none focus:border-emerald-500"
            />
          </div>

          <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3.5">
            <span className="text-sm font-medium text-slate-700">🏦 Set aside money for taxes</span>
            <input
              type="checkbox"
              checked={taxPlanning}
              onChange={(e) => setTaxPlanning(e.target.checked)}
              className="size-5 accent-emerald-500"
            />
          </label>

          <button
            onClick={handleContinue}
            disabled={loading}
            className="mt-2 rounded-2xl bg-emerald-500 py-4 text-center font-semibold text-white active:bg-emerald-600 disabled:opacity-60"
          >
            {loading ? 'Saving...' : 'Start using Gig Companion'}
          </button>
        </div>
      </div>
    </main>
  )
}
