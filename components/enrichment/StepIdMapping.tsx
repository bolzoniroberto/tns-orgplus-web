'use client'
import React, { useEffect, useState } from 'react'
import { api } from '@/lib/api'

interface Props {
  headers: string[]
  rows: Record<string, string>[]
  entityType: 'dipendente' | 'struttura'
  idColumn: string
  onChangeEntityType: (v: 'dipendente' | 'struttura') => void
  onChangeIdColumn: (v: string) => void
  onNext: () => void
  onBack: () => void
}

function suggestIdColumn(headers: string[]): string {
  const patterns = ['cf', 'fiscale', 'codice', 'id', 'matricola']
  for (const p of patterns) {
    const match = headers.find(h => h.toLowerCase().includes(p))
    if (match) return match
  }
  return headers[0] ?? ''
}

export default function StepIdMapping({
  headers,
  rows,
  entityType,
  idColumn,
  onChangeEntityType,
  onChangeIdColumn,
  onNext,
  onBack,
}: Props) {
  const [matchResult, setMatchResult] = useState<{ matched: number; total: number } | null>(null)
  const [loading, setLoading] = useState(false)

  // Auto-suggest id column on mount
  useEffect(() => {
    if (!idColumn && headers.length > 0) {
      onChangeIdColumn(suggestIdColumn(headers))
    }
  }, [])

  // Count matches whenever entityType or idColumn changes
  useEffect(() => {
    if (!idColumn || rows.length === 0) return
    setLoading(true)
    setMatchResult(null)
    api.enrich.countMatches(entityType, idColumn, rows)
      .then(r => setMatchResult(r))
      .catch(() => setMatchResult(null))
      .finally(() => setLoading(false))
  }, [entityType, idColumn])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Step 2 — Tipo entità e colonna ID</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Indica il tipo di record da arricchire e la colonna che contiene l&apos;identificatore univoco.
        </p>
      </div>

      {/* Entity type */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Tipo entità</label>
        <div className="flex gap-3">
          {([
            { value: 'dipendente', label: 'Dipendenti' },
            { value: 'struttura', label: 'Strutture' },
          ] as const).map(opt => (
            <button
              key={opt.value}
              onClick={() => onChangeEntityType(opt.value)}
              className={[
                'flex-1 py-2.5 text-sm rounded-lg border-2 font-medium transition-colors',
                entityType === opt.value
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                  : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300',
              ].join(' ')}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ID column selector */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Colonna ID nel file
          <span className="ml-1 text-gray-400 text-xs font-normal">
            ({entityType === 'dipendente' ? 'codice_fiscale' : 'codice'} nel DB)
          </span>
        </label>
        <select
          value={idColumn}
          onChange={e => onChangeIdColumn(e.target.value)}
          className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">— seleziona —</option>
          {headers.map(h => (
            <option key={h} value={h}>{h}</option>
          ))}
        </select>
      </div>

      {/* Match feedback */}
      {idColumn && (
        <div className={[
          'rounded-lg px-4 py-3 text-sm',
          matchResult
            ? matchResult.matched > 0
              ? 'bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
              : 'bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200'
            : 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500',
        ].join(' ')}>
          {loading ? 'Verifica corrispondenze…' : matchResult
            ? `${matchResult.matched} record trovati nel DB su ${matchResult.total} righe del file`
            : 'Seleziona una colonna ID per verificare le corrispondenze'}
        </div>
      )}

      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 transition-colors"
        >
          ← Indietro
        </button>
        <button
          onClick={onNext}
          disabled={!idColumn || !matchResult || matchResult.matched === 0}
          className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 disabled:opacity-40 font-medium transition-colors"
        >
          Avanti →
        </button>
      </div>
    </div>
  )
}
