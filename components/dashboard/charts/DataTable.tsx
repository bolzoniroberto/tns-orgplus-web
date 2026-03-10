'use client'
import { useState } from 'react'
import type { StatsQueryResponse, StatsQueryRow } from '@/types'

interface Props {
  data: StatsQueryResponse
}

export default function DataTable({ data }: Props) {
  const [sortAsc, setSortAsc] = useState(false)

  const sorted = [...data.data].sort((a, b) => sortAsc ? a.value - b.value : b.value - a.value)

  return (
    <div className="overflow-auto h-full">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            <th className="text-left py-1 px-2 font-medium text-gray-600 dark:text-gray-400">
              {data.fieldLabel}
            </th>
            <th
              className="text-right py-1 px-2 font-medium text-gray-600 dark:text-gray-400 cursor-pointer select-none hover:text-gray-900 dark:hover:text-gray-100"
              onClick={() => setSortAsc(v => !v)}
            >
              Valore {sortAsc ? '↑' : '↓'}
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr key={i} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
              <td className="py-1 px-2 text-gray-700 dark:text-gray-300">{row.label}</td>
              <td className="py-1 px-2 text-right font-mono text-gray-900 dark:text-gray-100">
                {Number.isInteger(row.value) ? row.value.toLocaleString('it-IT') : row.value.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
