'use client'
import React, { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { EnrichmentConfig, EnrichmentDiff, FieldChange } from '@/types'

type StatusFilter = 'all' | 'changes' | 'notfound'

function getStatus(diff: EnrichmentDiff, change: FieldChange): 'aggiorna' | 'nuovo' | 'invariato' {
  if (change.newValue === (change.oldValue ?? '')) return 'invariato'
  if (change.isNew) return 'nuovo'
  return 'aggiorna'
}

const STATUS_STYLE: Record<string, string> = {
  aggiorna: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200',
  nuovo: 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200',
  invariato: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
  'non trovato': 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
}

interface Props {
  config: EnrichmentConfig
  rows: Record<string, string>[]
  onApplied: () => void
  onBack: () => void
}

export default function StepPreview({ config, rows, onApplied, onBack }: Props) {
  const [diffs, setDiffs] = useState<EnrichmentDiff[]>([])
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<StatusFilter>('changes')

  useEffect(() => {
    setLoading(true)
    setError(null)
    api.enrich.preview(config, rows)
      .then(r => setDiffs(r.diffs))
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [])

  // Flatten diffs into rows for display
  type FlatRow = {
    entityId: string
    entityLabel: string
    found: boolean
    field: string
    label: string
    oldValue: string | null
    newValue: string
    status: 'aggiorna' | 'nuovo' | 'invariato' | 'non trovato'
  }

  const flatRows: FlatRow[] = []
  for (const diff of diffs) {
    if (!diff.found) {
      flatRows.push({
        entityId: diff.entityId,
        entityLabel: diff.entityLabel,
        found: false,
        field: '',
        label: '—',
        oldValue: null,
        newValue: '',
        status: 'non trovato',
      })
    } else {
      for (const change of diff.changes) {
        flatRows.push({
          entityId: diff.entityId,
          entityLabel: diff.entityLabel,
          found: true,
          field: change.field,
          label: change.label,
          oldValue: change.oldValue,
          newValue: change.newValue,
          status: getStatus(diff, change),
        })
      }
    }
  }

  const visibleRows = flatRows.filter(r => {
    if (filter === 'changes') return r.status === 'aggiorna' || r.status === 'nuovo'
    if (filter === 'notfound') return r.status === 'non trovato'
    return true
  })

  const totalUpdates = flatRows.filter(r => r.status === 'aggiorna').length
  const totalNew = flatRows.filter(r => r.status === 'nuovo').length
  const totalNotFound = flatRows.filter(r => r.status === 'non trovato').length
  const hasChanges = totalUpdates + totalNew > 0

  // Diffs that have actual changes (for apply)
  const changedDiffs = diffs.filter(d =>
    d.found && d.changes.some(c => c.newValue !== (c.oldValue ?? ''))
  )

  const handleApply = async () => {
    setApplying(true)
    setError(null)
    try {
      const result = await api.enrich.apply(config, changedDiffs)
      if (result.errors.length > 0) {
        setError(result.errors.join('; '))
      } else {
        onApplied()
      }
    } catch (e) {
      setError(String(e))
    } finally {
      setApplying(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Step 4 — Anteprima modifiche</h2>
        <p className="text-sm text-gray-500">Calcolo differenze in corso…</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Step 4 — Anteprima modifiche</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Verifica le modifiche prima di applicarle. Solo le righe cambiate verranno scritte nel DB.
        </p>
      </div>

      {/* Summary */}
      <div className="flex gap-3 flex-wrap">
        {[
          { label: 'Aggiornamenti', count: totalUpdates, color: 'text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-700' },
          { label: 'Nuovi valori', count: totalNew, color: 'text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700' },
          { label: 'Non trovati', count: totalNotFound, color: 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700' },
        ].map(s => (
          <div key={s.label} className={`px-3 py-2 rounded-lg border text-sm font-medium ${s.color}`}>
            {s.count} {s.label}
          </div>
        ))}
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {/* Filter */}
      <div className="flex gap-2">
        {([
          { value: 'changes', label: 'Solo modifiche' },
          { value: 'all', label: 'Tutto' },
          { value: 'notfound', label: 'Non trovati' },
        ] as const).map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={[
              'px-3 py-1 text-xs rounded-full border transition-colors',
              filter === f.value
                ? 'bg-indigo-600 border-indigo-600 text-white'
                : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-400',
            ].join(' ')}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Diff table */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="overflow-auto max-h-96">
          <table className="min-w-full text-xs">
            <thead className="sticky top-0">
              <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <th className="px-3 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Entità</th>
                <th className="px-3 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Campo</th>
                <th className="px-3 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Valore attuale</th>
                <th className="px-3 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Nuovo valore</th>
                <th className="px-3 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Stato</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-gray-400 dark:text-gray-500">
                    Nessuna riga da mostrare
                  </td>
                </tr>
              ) : (
                visibleRows.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-3 py-2">
                      <div className="font-medium text-gray-800 dark:text-gray-200">{row.entityLabel}</div>
                      <div className="text-gray-400 font-mono">{row.entityId}</div>
                    </td>
                    <td className="px-3 py-2 font-mono text-gray-600 dark:text-gray-300">{row.label}</td>
                    <td className="px-3 py-2 text-gray-500 dark:text-gray-400 max-w-40 truncate">
                      {row.oldValue ?? <span className="italic text-gray-300">vuoto</span>}
                    </td>
                    <td className="px-3 py-2 text-gray-800 dark:text-gray-200 max-w-40 truncate">
                      {row.newValue || <span className="italic text-gray-300">vuoto</span>}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[row.status]}`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <button
          onClick={onBack}
          disabled={applying}
          className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 transition-colors disabled:opacity-40"
        >
          ← Indietro
        </button>
        <button
          onClick={handleApply}
          disabled={!hasChanges || applying}
          className="px-5 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-40 font-medium transition-colors"
        >
          {applying ? 'Applicazione in corso…' : `Applica ${totalUpdates + totalNew} modifiche`}
        </button>
      </div>
    </div>
  )
}
