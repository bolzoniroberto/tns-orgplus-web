'use client'
import React, { useEffect } from 'react'
import { slugify } from '@/lib/enrichment/parseFile'
import type { EnrichmentColumnMapping } from '@/types'

// Known DB fields (excluding ID fields and system fields)
const DIPENDENTE_MAPPABLE = [
  'titolare', 'livello', 'unita_organizzativa', 'cdc_costo', 'codice_struttura',
  'codice_nel_file', 'ruoli_oltre_v', 'ruoli', 'viaggiatore', 'segr_redaz',
  'approvatore', 'cassiere', 'visualizzatori', 'segretario', 'controllore',
  'amministrazione', 'segr_red_assistita', 'segretario_assistito',
  'controllore_assistito', 'ruoli_afc', 'ruoli_hr', 'altri_ruoli',
  'sede_tns', 'gruppo_sind',
]

const STRUTTURA_MAPPABLE = [
  'descrizione', 'codice_padre', 'cdc_costo', 'titolare', 'livello',
  'unita_organizzativa', 'ruoli_oltre_v', 'ruoli', 'viaggiatore', 'segr_redaz',
  'approvatore', 'cassiere', 'visualizzatori', 'segretario', 'controllore',
  'amministrazione', 'segr_red_assistita', 'segretario_assistito',
  'controllore_assistito', 'ruoli_afc', 'ruoli_hr', 'altri_ruoli',
  'sede_tns', 'gruppo_sind',
]

function autoMatch(header: string, entityType: 'dipendente' | 'struttura'): Partial<EnrichmentColumnMapping> {
  const fields = entityType === 'dipendente' ? DIPENDENTE_MAPPABLE : STRUTTURA_MAPPABLE
  const h = header.toLowerCase().replace(/[^a-z0-9]/g, '_')
  const match = fields.find(f => f === h || f.includes(h) || h.includes(f))
  if (match) return { action: 'map', targetField: match }
  return { action: 'skip' }
}

interface Props {
  headers: string[]
  rows: Record<string, string>[]
  idColumn: string
  entityType: 'dipendente' | 'struttura'
  columnMappings: EnrichmentColumnMapping[]
  onChange: (mappings: EnrichmentColumnMapping[]) => void
  onNext: () => void
  onBack: () => void
}

export default function StepColMapping({
  headers,
  rows,
  idColumn,
  entityType,
  columnMappings,
  onChange,
  onNext,
  onBack,
}: Props) {
  const availableFields = entityType === 'dipendente' ? DIPENDENTE_MAPPABLE : STRUTTURA_MAPPABLE
  const dataColumns = headers.filter(h => h !== idColumn)

  // Initialize mappings with auto-match when columns change
  useEffect(() => {
    if (columnMappings.length !== dataColumns.length) {
      const mappings = dataColumns.map(col => {
        const existing = columnMappings.find(m => m.fileColumn === col)
        if (existing) return existing
        return { fileColumn: col, ...autoMatch(col, entityType) } as EnrichmentColumnMapping
      })
      onChange(mappings)
    }
  }, [dataColumns.join(','), entityType])

  function updateMapping(fileColumn: string, patch: Partial<EnrichmentColumnMapping>) {
    onChange(columnMappings.map(m =>
      m.fileColumn === fileColumn ? { ...m, ...patch } : m
    ))
  }

  const hasActions = columnMappings.some(m => m.action !== 'skip')

  const sampleValue = (col: string) => rows[0]?.[col] ?? ''

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Step 3 — Mapping colonne</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Per ogni colonna del file scegli cosa fare: salta, mappa su un campo esistente o crea una nuova variabile personalizzata.
        </p>
      </div>

      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Colonna file</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Valore esempio</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Azione</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Campo / Label</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {columnMappings.map(mapping => (
              <tr key={mapping.fileColumn} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                {/* Column name */}
                <td className="px-4 py-2.5 font-mono text-gray-800 dark:text-gray-200 text-xs whitespace-nowrap">
                  {mapping.fileColumn}
                </td>

                {/* Sample value */}
                <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 text-xs max-w-32 truncate">
                  {sampleValue(mapping.fileColumn) || <span className="italic text-gray-300">vuoto</span>}
                </td>

                {/* Action selector */}
                <td className="px-4 py-2.5">
                  <select
                    value={mapping.action}
                    onChange={e => {
                      const action = e.target.value as 'skip' | 'map' | 'new'
                      if (action === 'new') {
                        updateMapping(mapping.fileColumn, {
                          action,
                          targetField: undefined,
                          newLabel: mapping.fileColumn,
                          newKey: slugify(mapping.fileColumn),
                        })
                      } else if (action === 'map') {
                        updateMapping(mapping.fileColumn, {
                          action,
                          targetField: availableFields[0],
                          newLabel: undefined,
                          newKey: undefined,
                        })
                      } else {
                        updateMapping(mapping.fileColumn, { action, targetField: undefined, newLabel: undefined, newKey: undefined })
                      }
                    }}
                    className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="skip">Salta</option>
                    <option value="map">Mappa su campo esistente</option>
                    <option value="new">Crea nuova variabile</option>
                  </select>
                </td>

                {/* Field/label input */}
                <td className="px-4 py-2.5">
                  {mapping.action === 'map' && (
                    <select
                      value={mapping.targetField ?? ''}
                      onChange={e => updateMapping(mapping.fileColumn, { targetField: e.target.value })}
                      className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      {availableFields.map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  )}
                  {mapping.action === 'new' && (
                    <div className="flex flex-col gap-1">
                      <input
                        type="text"
                        placeholder="Label (es. Indennità Mensa)"
                        value={mapping.newLabel ?? ''}
                        onChange={e => updateMapping(mapping.fileColumn, {
                          newLabel: e.target.value,
                          newKey: slugify(e.target.value),
                        })}
                        className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-48"
                      />
                      {mapping.newKey && (
                        <span className="text-xs text-gray-400 font-mono">key: {mapping.newKey}</span>
                      )}
                    </div>
                  )}
                  {mapping.action === 'skip' && (
                    <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 transition-colors"
        >
          ← Indietro
        </button>
        <button
          onClick={onNext}
          disabled={!hasActions}
          className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 disabled:opacity-40 font-medium transition-colors"
        >
          Anteprima modifiche →
        </button>
      </div>
    </div>
  )
}
