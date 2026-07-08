import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BottomNav } from '@/components/bottom-nav'
import { createClient } from '@/lib/supabase/server'
import { formatMoney } from '@/lib/format'

function monthKey(dateStr: string) {
  return dateStr.slice(0, 7) // YYYY-MM
}

function monthLabel(key: string) {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short' })
}

export default async function ReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
  sixMonthsAgo.setDate(1)
  const startDate = sixMonthsAgo.toISOString().slice(0, 10)

  const [{ data: shifts }, { data: expenses }, { data: profile }] = await Promise.all([
    supabase.from('shifts').select('date, bolt_income, wolt_income, other_income').eq('user_id', user.id).gte('date', startDate),
    supabase.from('expenses').select('date, amount').eq('user_id', user.id).gte('date', startDate),
    supabase.from('profiles').select('currency, tax_planning, planning_profile').eq('id', user.id).single(),
  ])

  const currency = profile?.currency || 'EUR'

  // Build 6 month buckets, oldest first
  const buckets: { key: string; income: number; expense: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - i)
    buckets.push({ key: d.toISOString().slice(0, 7), income: 0, expense: 0 })
  }

  for (const s of shifts || []) {
    const key = monthKey(s.date)
    const bucket = buckets.find((b) => b.key === key)
    if (bucket) bucket.income += Number(s.bolt_income) + Number(s.wolt_income) + Number(s.other_income)
  }
  for (const e of expenses || []) {
    const key = monthKey(e.date)
    const bucket = buckets.find((b) => b.key === key)
    if (bucket) bucket.expense += Number(e.amount)
  }

  const thisMonth = buckets[buckets.length - 1]
  const monthProfit = thisMonth.income - thisMonth.expense
  const maxVal = Math.max(...buckets.map((b) => Math.max(b.income, b.expense)), 1)

  // Simple tax reserve estimate: a flat percentage of profit, based on the
  // planning profile chosen in onboarding/profile. This is a rough guide,
  // not tax advice.
  const taxRatePct = profile?.planning_profile === 'aggressive' ? 15 : profile?.planning_profile === 'safe' ? 25 : 20
  const totalProfit6mo = buckets.reduce((s, b) => s + (b.income - b.expense), 0)
  const taxReserve = profile?.tax_planning ? Math.max(0, totalProfit6mo) * (taxRatePct / 100) : null

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <div className="flex items-center gap-3 px-6 pt-8 pb-4">
        <Link href="/dashboard" className="text-slate-400 text-xl">
          ←
        </Link>
        <div>
          <h1 className="text-lg font-bold text-slate-800">Reports</h1>
          <p className="text-sm text-slate-500">Last 6 months</p>
        </div>
      </div>

      <div className="px-6 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">This month income</p>
          <p className="text-xl font-bold text-emerald-600">{formatMoney(thisMonth.income, currency)}</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">This month profit</p>
          <p className={`text-xl font-bold ${monthProfit >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
            {formatMoney(monthProfit, currency)}
          </p>
        </div>
      </div>

      <div className="px-6 mt-4">
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="mb-3 text-sm font-semibold text-slate-700">Income vs expenses</p>
          <div className="flex items-end gap-2" style={{ height: 130 }}>
            {buckets.map((b) => (
              <div key={b.key} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="flex h-full w-full items-end gap-0.5">
                  <div
                    className="flex-1 rounded-t bg-emerald-400"
                    style={{ height: `${Math.max((b.income / maxVal) * 100, b.income > 0 ? 4 : 0)}%` }}
                  />
                  <div
                    className="flex-1 rounded-t bg-red-300"
                    style={{ height: `${Math.max((b.expense / maxVal) * 100, b.expense > 0 ? 4 : 0)}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-400">{monthLabel(b.key)}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-emerald-400" /> Income</span>
            <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-red-300" /> Expenses</span>
          </div>
        </div>
      </div>

      {profile?.tax_planning && (
        <div className="px-6 mt-4">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-800">🏦 Estimated tax reserve</p>
            <p className="text-xl font-bold text-amber-700 mt-1">{formatMoney(taxReserve || 0, currency)}</p>
            <p className="mt-1 text-xs text-amber-700/80">
              Rough estimate at {taxRatePct}% of your last 6 months profit. This is not tax advice — check with Latvia&apos;s VID or a local accountant for your real rate.
            </p>
          </div>
        </div>
      )}

      <BottomNav />
    </main>
  )
}
