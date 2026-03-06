'use client'

import React, { useState, useMemo } from 'react'
import { ArrowRightLeft, Search, X } from 'lucide-react'
import { useOrgStore } from '@/store/useOrgStore'
import { api } from '@/lib/api'
import type { Struttura } from '@/types'

interface Props {
  strutture: (Struttura & { dipendenti_count: number })[]
  onClose: () => void
  onMoved: () => void
}

export default function MoveEmployeePanel({ strutture, onClose, onMoved }: Props) {
  const { dipendenti } = useOrgStore()
  const [search, setSearch] = useState('')
  const [pending, setPending] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)

  const strutMap = useMemo(
    () => new Map(strutture.map(s => [s.codice, s.descrizione ?? s.codice])),
    [strutture]
  )

  const strutList = useMemo(
    () => strutture
      .filter(s => !s.deleted_at)
      .sort((a, b) => (a.descrizione ?? '').localeCompare(b.descrizione ?? '')),
    [strutture]
  )

  const assigned = useMemo(() => {
    const lower = search.toLowerCase()
    return dipendenti
      .filter(d => !d.deleted_at && d.codice_struttura?.trim())
      .filter(d => {
        if (!lower) return true
        const strutNome = strutMap.get(d.codice_struttura)?.toLowerCase() ?? ''
        return (
          d.titolare?.toLowerCase().includes(lower) ||
          d.codice_fiscale.toLowerCase().includes(lower) ||
          d.codice_struttura.toLowerCase().includes(lower) ||
          strutNome.includes(lower)
        )
      })
      .sort((a, b) => (a.titolare ?? '').localeCompare(b.titolare ?? ''))
  }, [dipendenti, search, strutMap])

  const move = async (cf: string) => {
    const codice = pending[cf]
    if (!codice) return
    setSaving(cf)
    try {
      await api.dipendenti.update(cf, { codice_struttura: codice })
      setPending(p => { const n = { ...p }; delete n[cf]; return n })
      onMoved()
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="flex flex-col h-full w-72 flex-shrink-0 border-r border-gray-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-600" />
          <span className="text-xs font-semibold text-gray-700">Sposta dipendenti</span>
          <span className="text-xs bg-indigo-100 text-indigo-700 font-medium px-1.5 py-0.5 rounded-full tabular-nums">
            {assigned.length}
          </span>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-gray-100">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
          <input
            type="text"
            placeholder="Cerca per nome, CF o struttura…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-6 pr-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {assigned.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center px-4">
            <p className="text-xs text-gray-400">Nessun dipendente trovato</p>
          </div>
        ) : (
          <ul>
            {assigned.map(d => {
              const currentStrutNome = strutMap.get(d.codice_struttura)
              return (
                <li key={d.codice_fiscale} className="px-3 py-2.5 border-b border-gray-100 last:border-0">
                  <p className="text-xs font-medium text-gray-800 truncate mb-0.5">
                    {d.titolare || '—'}
                  </p>
                  <p className="text-[10px] text-gray-400 mb-1 font-mono">{d.codice_fiscale}</p>
                  {/* Current structure */}
                  <p className="text-[10px] text-indigo-600 mb-2 truncate" title={currentStrutNome}>
                    ↳ {currentStrutNome ?? d.codice_struttura}
                  </p>
                  {/* Move row */}
                  <div className="flex gap-1.5 items-center">
                    <select
                      value={pending[d.codice_fiscale] ?? ''}
                      onChange={e => setPending(p => ({ ...p, [d.codice_fiscale]: e.target.value }))}
                      className="flex-1 min-w-0 text-xs border border-gray-200 rounded px-1.5 py-1
                                 focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white text-gray-700"
                    >
                      <option value="">Sposta in…</option>
                      {strutList
                        .filter(s => s.codice !== d.codice_struttura)
                        .map(s => (
                          <option key={s.codice} value={s.codice}>
                            {s.descrizione} ({s.codice})
                          </option>
                        ))}
                    </select>
                    <button
                      onClick={() => move(d.codice_fiscale)}
                      disabled={!pending[d.codice_fiscale] || saving === d.codice_fiscale}
                      className="flex-shrink-0 text-xs px-2 py-1 bg-indigo-600 text-white rounded
                                 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      {saving === d.codice_fiscale ? '…' : 'Sposta'}
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
