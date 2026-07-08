import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BottomNav } from '@/components/bottom-nav'
import { createClient } from '@/lib/supabase/server'
import { formatDateLabel, formatMoney } from '@/lib/format'

export default async function HistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: shifts }, { data: expenses }, { data: profile }] = await Promise.all([
    supabase
      .from('shifts')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(60),
    supabase
      .from('expenses')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(120),
    supabase.from('profiles').select('currency').eq('id', user.id).single(),
  ])

  const currency = profile?.currency || 'EUR'

  // Group everything by date
  const dates = new Set<string>()
  ;(shifts || []).forEach((s) => dates.add(s.date))
  ;(expenses || []).forEach((e) => dates.add(e.date))
  const sortedDates = Array.from(dates).sort((a, b) => (a < b ? 1 : -1))

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <div className="flex items-center gap-3 px-6 pt-8 pb-4">
        <Link href="/dashboard" className="text-slate-400 text-xl">
          ←
        </Link>
        <div>
          <h1 className="text-lg font-bold text-slate-800">History</h1>
          <p className="text-sm text-slate-500">Your past shifts and expenses</p>
        </div>
      </div>

      {sortedDates.length === 0 ? (
        <div className="px-6 py-16 text-center text-slate-400">
          <p className="text-3xl mb-2">📭</p>
          <p className="text-sm">No shifts or expenses logged yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-5 px-6">
          {sortedDates.map((date) => {
            const shift = (shifts || []).find((s) => s.date === date)
            const dayExpenses = (expenses || []).filter((e) => e.date === date)
            const income = shift
              ? Number(shift.bolt_income) + Number(shift.wolt_income) + Number(shift.other_income)
              : 0
            const expenseSum = dayExpenses.reduce((s, e) => s + Number(e.amount), 0)

            return (
              <div key={date}>
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-700">{formatDateLabel(date)}</h2>
                  <span className="text-xs font-medium text-slate-400">
                    Net {formatMoney(income - expenseSum, currency)}
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  {shift && (
                    <div className="rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700">🛵 Shift</span>
                        <span className="text-sm font-semibold text-emerald-600">
                          +{formatMoney(income, currency)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">
                        Bolt {formatMoney(Number(shift.bolt_income), currency)} · Wolt{' '}
                        {formatMoney(Number(shift.wolt_income), currency)}
                        {shift.hours_worked ? ` · ${shift.hours_worked}h` : ''}
                      </p>
                      {shift.notes && <p className="mt-1 text-xs text-slate-400">{shift.notes}</p>}
                    </div>
                  )}

                  {dayExpenses.map((e) => (
                    <div
                      key={e.id}
                      className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm"
                    >
                      <div>
                        <span className="text-sm font-medium text-slate-700">{e.category}</span>
                        {e.note && <p className="text-xs text-slate-400">{e.note}</p>}
                      </div>
                      <span className="text-sm font-semibold text-red-500">
                        -{formatMoney(Number(e.amount), currency)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <BottomNav />
    </main>
  )
}
