'use client'

import React, { useState, useMemo } from 'react'
import { Users, X } from 'lucide-react'
import { useOrgStore } from '@/store/useOrgStore'
import { api } from '@/lib/api'
import type { Struttura } from '@/types'

interface Props {
  strutture: (Struttura & { dipendenti_count: number })[]
  onClose: () => void
  onAssigned: () => void
}

export default function UnassignedPanel({ strutture, onClose, onAssigned }: Props) {
  const { dipendenti } = useOrgStore()
  const [pending, setPending] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)

  const unassigned = useMemo(
    () => dipendenti.filter(d => !d.deleted_at && !d.codice_struttura?.trim()),
    [dipendenti]
  )

  const strutList = useMemo(
    () => strutture
      .filter(s => !s.deleted_at)
      .sort((a, b) => (a.descrizione ?? '').localeCompare(b.descrizione ?? '')),
    [strutture]
  )

  const assign = async (cf: string) => {
    const codice = pending[cf]
    if (!codice) return
    setSaving(cf)
    try {
      await api.dipendenti.update(cf, { codice_struttura: codice })
      setPending(p => { const n = { ...p }; delete n[cf]; return n })
      onAssigned()
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="flex flex-col h-full w-72 flex-shrink-0 border-r border-gray-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <Users className="w-3.5 h-3.5 text-amber-600" />
          <span className="text-xs font-semibold text-gray-700">Senza struttura</span>
          {unassigned.length > 0 && (
            <span className="text-xs bg-amber-100 text-amber-700 font-medium px-1.5 py-0.5 rounded-full tabular-nums">
              {unassigned.length}
            </span>
          )}
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {unassigned.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center px-4">
            <span className="text-2xl mb-1">✓</span>
            <p className="text-xs text-gray-400">Tutti i dipendenti hanno una struttura assegnata</p>
          </div>
        ) : (
          <ul>
            {unassigned.map(d => (
              <li key={d.codice_fiscale} className="px-3 py-2.5 border-b border-gray-100 last:border-0">
                {/* Name */}
                <p className="text-xs font-medium text-gray-800 truncate mb-0.5">
                  {d.titolare || '—'}
                </p>
                <p className="text-[10px] text-gray-400 mb-2 font-mono">{d.codice_fiscale}</p>
                {/* Assignment row */}
                <div className="flex gap-1.5 items-center">
                  <select
                    value={pending[d.codice_fiscale] ?? ''}
                    onChange={e => setPending(p => ({ ...p, [d.codice_fiscale]: e.target.value }))}
                    className="flex-1 min-w-0 text-xs border border-gray-200 rounded px-1.5 py-1
                               focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white text-gray-700"
                  >
                    <option value="">Scegli struttura…</option>
                    {strutList.map(s => (
                      <option key={s.codice} value={s.codice}>
                        {s.descrizione} ({s.codice})
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => assign(d.codice_fiscale)}
                    disabled={!pending[d.codice_fiscale] || saving === d.codice_fiscale}
                    className="flex-shrink-0 text-xs px-2 py-1 bg-indigo-600 text-white rounded
                               hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {saving === d.codice_fiscale ? '…' : 'Assegna'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
