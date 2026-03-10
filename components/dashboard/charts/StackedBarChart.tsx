'use client'
import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts'
import { getSchemeColors } from '@/lib/dashboard/colorSchemes'
import type { StatsQueryResponse } from '@/types'

interface Props {
  data: StatsQueryResponse
  colorScheme?: string
}

export default function StackedBarChart({ data, colorScheme }: Props) {
  const colors = getSchemeColors(colorScheme)

  const { pivoted, group2Keys } = useMemo(() => {
    const acc: Record<string, unknown>[] = []
    for (const row of data.data) {
      const existing = acc.find(r => r.label === row.label) as Record<string, unknown> | undefined
      if (existing) {
        existing[row.group2!] = row.value
      } else {
        acc.push({ label: row.label, [row.group2!]: row.value })
      }
    }
    const keys = [...new Set(data.data.map(r => r.group2!))]
    return { pivoted: acc, group2Keys: keys }
  }, [data.data])

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={pivoted} margin={{ top: 4, right: 8, bottom: 40, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-gray-700" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: 'currentColor' }}
          className="text-gray-600 dark:text-gray-400"
          angle={-30}
          textAnchor="end"
          interval={0}
        />
        <YAxis tick={{ fontSize: 11, fill: 'currentColor' }} className="text-gray-600 dark:text-gray-400" />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
        <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
        {group2Keys.map((key, i) => (
          <Bar key={key} dataKey={key} stackId="a" fill={colors[i % colors.length]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
