'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { todayISO } from '@/lib/format'

export default function ShiftPage() {
  const router = useRouter()
  const supabase = createClient()

  const [boltIncome, setBoltIncome] = useState('')
  const [woltIncome, setWoltIncome] = useState('')
  const [otherIncome, setOtherIncome] = useState('')
  const [hoursWorked, setHoursWorked] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingExisting, setLoadingExisting] = useState(true)
  const [error, setError] = useState('')

  // If today's shift already exists, load it so the user can edit instead of duplicate
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('shifts')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', todayISO())
        .maybeSingle()

      if (data) {
        setBoltIncome(String(data.bolt_income ?? ''))
        setWoltIncome(String(data.wolt_income ?? ''))
        setOtherIncome(String(data.other_income ?? ''))
        setHoursWorked(data.hours_worked != null ? String(data.hours_worked) : '')
        setNotes(data.notes ?? '')
      }
      setLoadingExisting(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      router.push('/login')
      return
    }

    const { error: err } = await supabase.from('shifts').upsert(
      {
        user_id: user.id,
        date: todayISO(),
        bolt_income: Number(boltIncome) || 0,
        wolt_income: Number(woltIncome) || 0,
        other_income: Number(otherIncome) || 0,
        hours_worked: hoursWorked ? Number(hoursWorked) : null,
        notes: notes || null,
      },
      { onConflict: 'user_id,date' },
    )

    setLoading(false)

    if (err) {
      setError(err.message)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  if (loadingExisting) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-400 text-sm">Loading...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-10">
      <div className="flex items-center gap-3 px-6 pt-8 pb-4">
        <Link href="/dashboard" className="text-slate-400 text-xl">
          ←
        </Link>
        <div>
          <h1 className="text-lg font-bold text-slate-800">Finish Today&apos;s Shift</h1>
          <p className="text-sm text-slate-500">Enter what you earned today</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-4 px-6">
        <Field label="Bolt income (€)" value={boltIncome} onChange={setBoltIncome} icon="🟢" />
        <Field label="Wolt income (€)" value={woltIncome} onChange={setWoltIncome} icon="🔵" />
        <Field label="Other income (€)" value={otherIncome} onChange={setOtherIncome} icon="💶" />
        <Field label="Hours worked" value={hoursWorked} onChange={setHoursWorked} icon="⏱️" optional />

        <div>
          <label className="mb-1 block text-sm text-slate-600">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none focus:border-emerald-500"
            placeholder="Busy day, rain bonus, etc."
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-2xl bg-emerald-500 py-4 text-center font-semibold text-white active:bg-emerald-600 disabled:opacity-60"
        >
          {loading ? 'Saving...' : 'Save Shift'}
        </button>
      </form>
    </main>
  )
}

function Field({
  label,
  value,
  onChange,
  icon,
  optional,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  icon: string
  optional?: boolean
}) {
  return (
    <div>
      <label className="mb-1 block text-sm text-slate-600">
        {icon} {label} {optional && <span className="text-slate-400">(optional)</span>}
      </label>
      <input
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none focus:border-emerald-500"
      />
    </div>
  )
}
