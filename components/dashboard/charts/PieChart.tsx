'use client'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { getSchemeColors } from '@/lib/dashboard/colorSchemes'
import type { StatsQueryResponse } from '@/types'

interface Props {
  data: StatsQueryResponse
  colorScheme?: string
}

export default function PieChartWidget({ data, colorScheme }: Props) {
  const colors = getSchemeColors(colorScheme)
  const chartData = data.data.map(r => ({ name: r.label, value: r.value }))

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="45%"
          outerRadius="60%"
          label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
          labelLine={true}
        >
          {chartData.map((_, i) => (
            <Cell key={i} fill={colors[i % colors.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 6 }}
          formatter={(v) => [typeof v === 'number' && Number.isInteger(v) ? v.toLocaleString('it-IT') : Number(v).toFixed(2)]}
        />
        <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  )
}
