import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BottomNav } from '@/components/bottom-nav'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string }>
}) {
  const { demo } = await searchParams
  const isDemo = demo === '1'

  if (isDemo) {
    return <DashboardView
      name="Guest"
      streak={9}
      todayIncome={120}
      todayExpense={25}
      todayProfit={95}
      monthlyGoal={1500}
      monthlyProfit={765}
      isDemo
    />
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const today = todayISO()
  const { data: todayShift } = await supabase
    .from('shifts')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', today)
    .maybeSingle()

  const { data: todayExpenses } = await supabase
    .from('expenses')
    .select('amount')
    .eq('user_id', user.id)
    .eq('date', today)

  const monthStart = today.slice(0, 8) + '01'
  const { data: monthShifts } = await supabase
    .from('shifts')
    .select('bolt_income, wolt_income, other_income, date')
    .eq('user_id', user.id)
    .gte('date', monthStart)

  const { data: monthExpenses } = await supabase
    .from('expenses')
    .select('amount')
    .eq('user_id', user.id)
    .gte('date', monthStart)

  const todayIncome = (todayShift?.bolt_income || 0) + (todayShift?.wolt_income || 0) + (todayShift?.other_income || 0)
  const todayExpenseSum = (todayExpenses || []).reduce((s, e) => s + Number(e.amount), 0)
  const monthIncome = (monthShifts || []).reduce((s, sh) => s + Number(sh.bolt_income) + Number(sh.wolt_income) + Number(sh.other_income), 0)
  const monthExpenseSum = (monthExpenses || []).reduce((s, e) => s + Number(e.amount), 0)
  const monthProfit = monthIncome - monthExpenseSum

  // streak calc: count consecutive days with a shift ending today or yesterday
  const { data: allShiftDates } = await supabase
    .from('shifts')
    .select('date')
    .eq('user_id', user.id)
    .order('date', { ascending: false })

  let streak = 0
  if (allShiftDates && allShiftDates.length > 0) {
    const dates = new Set(allShiftDates.map((d) => d.date))
    const cursor = new Date()
    // allow streak to still count if today not logged yet, start check from today, else yesterday
    if (!dates.has(today)) cursor.setDate(cursor.getDate() - 1)
    while (dates.has(cursor.toISOString().slice(0, 10))) {
      streak++
      cursor.setDate(cursor.getDate() - 1)
    }
  }

  return (
    <DashboardView
      name={profile?.name?.split(' ')[0] || 'there'}
      streak={streak}
      todayIncome={todayIncome}
      todayExpense={todayExpenseSum}
      todayProfit={todayIncome - todayExpenseSum}
      monthlyGoal={profile?.monthly_goal || 0}
      monthlyProfit={monthProfit}
      shiftDone={!!todayShift}
    />
  )
}

function DashboardView({
  name,
  streak,
  todayIncome,
  todayExpense,
  todayProfit,
  monthlyGoal,
  monthlyProfit,
  shiftDone,
  isDemo,
}: {
  name: string
  streak: number
  todayIncome: number
  todayExpense: number
  todayProfit: number
  monthlyGoal: number
  monthlyProfit: number
  shiftDone?: boolean
  isDemo?: boolean
}) {
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening'
  const goalPct = monthlyGoal > 0 ? Math.min(100, Math.round((monthlyProfit / monthlyGoal) * 100)) : 0

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      {isDemo && (
        <div className="bg-amber-100 text-amber-800 text-center text-sm py-2 font-medium">
          Demo Mode — Your changes won&apos;t be saved.
        </div>
      )}

      <div className="px-6 pt-8 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-800">{greeting}, {name} 👋</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              {shiftDone ? 'Great job! Today\u2019s shift is complete. 🎉' : 'Ready to finish today\u2019s shift?'}
            </p>
          </div>
          <div className="text-right">
            <div className="text-xl">🔥</div>
            <div className="text-xs font-semibold text-slate-600">{streak}-day</div>
          </div>
        </div>
      </div>

      <div className="px-6 grid grid-cols-2 gap-3">
        <Card label="Today's Income" value={`€${todayIncome.toFixed(0)}`} color="text-emerald-600" icon="💰" />
        <Card label="Today's Expenses" value={`€${todayExpense.toFixed(0)}`} color="text-red-500" icon="💸" />
        <Card label="Today's Profit" value={`€${todayProfit.toFixed(0)}`} color="text-blue-600" icon="📈" />
        <Card label="Monthly Goal" value={`${goalPct}%`} color="text-amber-600" icon="🎯" />
      </div>

      <div className="px-6 mt-6 space-y-3">
        <Link href="/shift" className="block rounded-2xl bg-emerald-500 text-white text-center py-4 font-semibold active:bg-emerald-600">
          ➕ Finish Today&apos;s Shift
        </Link>
        <Link href="/expense" className="block rounded-2xl bg-white border border-slate-200 text-slate-700 text-center py-4 font-semibold active:bg-slate-50">
          ⛽ Add Expense
        </Link>
        <Link href="/history" className="block rounded-2xl bg-white border border-slate-200 text-slate-700 text-center py-4 font-semibold active:bg-slate-50">
          📊 View History
        </Link>
      </div>

      <BottomNav />
    </main>
  )
}

function Card({ label, value, color, icon }: { label: string; value: string; color: string; icon: string }) {
  return (
    <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-4">
      <div className="text-lg mb-1">{icon}</div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
    </div>
  )
}
