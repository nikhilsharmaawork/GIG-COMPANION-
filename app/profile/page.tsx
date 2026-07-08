'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { BottomNav } from '@/components/bottom-nav'
import { createClient } from '@/lib/supabase/client'

const ALL_PLATFORMS = ['Bolt', 'Wolt']

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [monthlyGoal, setMonthlyGoal] = useState('')
  const [platforms, setPlatforms] = useState<string[]>([])
  const [currency, setCurrency] = useState('EUR')
  const [taxPlanning, setTaxPlanning] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) {
        setName(data.name || '')
        setEmail(data.email || user.email || '')
        setMonthlyGoal(data.monthly_goal != null ? String(data.monthly_goal) : '')
        setPlatforms(data.platforms || [])
        setCurrency(data.currency || 'EUR')
        setTaxPlanning(!!data.tax_planning)
      }
      setLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function togglePlatform(p: string) {
    setPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]))
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('profiles')
      .update({
        name,
        monthly_goal: Number(monthlyGoal) || 0,
        platforms,
        currency,
        tax_planning: taxPlanning,
      })
      .eq('id', user.id)

    setSaving(false)
    setSaved(true)
    router.refresh()
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-400">Loading...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <div className="flex items-center gap-3 px-6 pt-8 pb-4">
        <Link href="/dashboard" className="text-slate-400 text-xl">
          ←
        </Link>
        <div>
          <h1 className="text-lg font-bold text-slate-800">Profile</h1>
          <p className="text-sm text-slate-500">{email}</p>
        </div>
      </div>

      <div className="flex flex-col gap-4 px-6">
        <div>
          <label className="mb-1 block text-sm text-slate-600">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none focus:border-emerald-500"
          />
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

        <div>
          <label className="mb-2 block text-sm text-slate-600">Platforms you work on</label>
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
          <label className="mb-1 block text-sm text-slate-600">Currency</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none focus:border-emerald-500"
          >
            <option value="EUR">EUR (€)</option>
            <option value="USD">USD ($)</option>
          </select>
        </div>

        <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3.5">
          <span className="text-sm font-medium text-slate-700">🏦 Tax reserve planning</span>
          <input
            type="checkbox"
            checked={taxPlanning}
            onChange={(e) => setTaxPlanning(e.target.checked)}
            className="size-5 accent-emerald-500"
          />
        </label>

        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-2 rounded-2xl bg-emerald-500 py-4 text-center font-semibold text-white active:bg-emerald-600 disabled:opacity-60"
        >
          {saving ? 'Saving...' : saved ? 'Saved ✓' : 'Save changes'}
        </button>

        <button
          onClick={handleLogout}
          className="rounded-2xl border border-red-200 bg-red-50 py-4 text-center font-semibold text-red-600"
        >
          Log out
        </button>
      </div>

      <BottomNav />
    </main>
  )
}
