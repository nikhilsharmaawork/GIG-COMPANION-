'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { EXPENSE_CATEGORIES, todayISO, type ExpenseCategory } from '@/lib/format'

const categoryIcons: Record<ExpenseCategory, string> = {
  Fuel: '⛽',
  Vehicle: '🛵',
  Phone: '📱',
  Food: '🍔',
  Maintenance: '🔧',
  Insurance: '🛡️',
  Other: '📎',
}

export default function ExpensePage() {
  const router = useRouter()
  const supabase = createClient()

  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<ExpenseCategory>('Fuel')
  const [note, setNote] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const valid = Number(amount) > 0

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!valid) return
    setError('')
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      router.push('/login')
      return
    }

    let photoPath: string | null = null
    if (photo) {
      const ext = photo.name.split('.').pop() || 'jpg'
      const path = `${user.id}/${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage.from('receipts').upload(path, photo)
      if (uploadErr) {
        // Photo upload failing shouldn't block saving the expense itself
        console.error('Receipt upload failed:', uploadErr.message)
      } else {
        photoPath = path
      }
    }

    const { error: err } = await supabase.from('expenses').insert({
      user_id: user.id,
      date: todayISO(),
      category,
      amount: Number(amount),
      note: note || null,
      photo_url: photoPath,
    })

    setLoading(false)

    if (err) {
      setError(err.message)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-10">
      <div className="flex items-center gap-3 px-6 pt-8 pb-4">
        <Link href="/dashboard" className="text-slate-400 text-xl">
          ←
        </Link>
        <div>
          <h1 className="text-lg font-bold text-slate-800">Add Expense</h1>
          <p className="text-sm text-slate-500">Log money spent for work</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-4 px-6">
        <div>
          <label className="mb-1 block text-sm text-slate-600">Amount (€)</label>
          <input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-lg font-semibold text-slate-800 outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm text-slate-600">Category</label>
          <div className="grid grid-cols-3 gap-2">
            {EXPENSE_CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`flex flex-col items-center gap-1 rounded-xl border py-3 text-xs font-medium transition-colors ${
                  category === c
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                <span className="text-lg">{categoryIcons[c]}</span>
                {c}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-600">Note (optional)</label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Full tank at Circle K"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-600">Receipt photo (optional)</label>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-6 text-sm text-slate-500">
            {photo ? `📷 ${photo.name}` : '📷 Tap to add a photo'}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={!valid || loading}
          className="mt-2 rounded-2xl bg-emerald-500 py-4 text-center font-semibold text-white active:bg-emerald-600 disabled:opacity-60"
        >
          {loading ? 'Saving...' : 'Save Expense'}
        </button>
      </form>
    </main>
  )
}
