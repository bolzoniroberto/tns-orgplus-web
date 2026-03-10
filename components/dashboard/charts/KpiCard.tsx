'use client'
import type { StatsQueryResponse } from '@/types'

interface Props {
  data: StatsQueryResponse
}

export default function KpiCard({ data }: Props) {
  const total = data.data.reduce((sum, r) => sum + r.value, 0)
  const formatted = Number.isInteger(total) ? total.toLocaleString('it-IT') : total.toFixed(2)

  return (
    <div className="flex flex-col items-center justify-center h-full gap-1">
      <span className="text-5xl font-bold text-indigo-600 dark:text-indigo-400">{formatted}</span>
      <span className="text-sm text-gray-500 dark:text-gray-400">{data.entityLabel}</span>
    </div>
  )
}
