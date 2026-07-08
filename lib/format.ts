export function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export function formatMoney(amount: number, currency = 'EUR') {
  const symbol = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : currency + ' '
  return `${symbol}${amount.toFixed(0)}`
}

export function formatDateLabel(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  const today = todayISO()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yISO = yesterday.toISOString().slice(0, 10)

  if (iso === today) return 'Today'
  if (iso === yISO) return 'Yesterday'
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

export const EXPENSE_CATEGORIES = [
  'Fuel',
  'Vehicle',
  'Phone',
  'Food',
  'Maintenance',
  'Insurance',
  'Other',
] as const

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]
