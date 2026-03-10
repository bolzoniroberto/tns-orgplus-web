'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { getSchemeColors } from '@/lib/dashboard/colorSchemes'
import type { StatsQueryResponse } from '@/types'

interface Props {
  data: StatsQueryResponse
  colorScheme?: string
}

export default function BarVerticalChart({ data, colorScheme }: Props) {
  const colors = getSchemeColors(colorScheme)
  const chartData = data.data.map(r => ({ name: r.label, value: r.value }))

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 40, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-gray-700" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: 'currentColor' }}
          className="text-gray-600 dark:text-gray-400"
          angle={-30}
          textAnchor="end"
          interval={0}
        />
        <YAxis tick={{ fontSize: 11, fill: 'currentColor' }} className="text-gray-600 dark:text-gray-400" />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 6 }}
          formatter={(v) => [typeof v === 'number' && Number.isInteger(v) ? v.toLocaleString('it-IT') : Number(v).toFixed(2), data.fieldLabel]}
        />
        <Bar dataKey="value" fill={colors[0]} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
