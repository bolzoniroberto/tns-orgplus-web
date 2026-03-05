'use client'
import React, { memo } from 'react'
import { Handle, Position, useStore } from '@xyflow/react'
import { ChevronRight, Users } from 'lucide-react'
import type { Struttura } from '@/types'

interface OrgNodeData {
  struttura: Struttura & { dipendenti_count: number }
  collapsed: boolean
  hasChildren: boolean
  childrenCount: number
  depth: number
  isOverflowed: boolean    // showing fewer than all children (overflow mode)
  hiddenCount: number      // how many children are currently hidden
  colorScheme?: { border: string; bg: string }
  alertNoTitolare?: boolean
  alertNoDipendenti?: boolean
  entranceDelay?: number   // ms delay for staggered entrance animation
  compact?: boolean
  onExpand: () => void
  onExpandOverflow: () => void
  onOpenDrawer: () => void
}

interface OrgNodeProps {
  data: OrgNodeData
  selected: boolean
}

const OrgNode = memo(function OrgNode({ data, selected }: OrgNodeProps) {
  const {
    struttura, collapsed, hasChildren, childrenCount, depth,
    isOverflowed, hiddenCount, colorScheme, alertNoTitolare, alertNoDipendenti,
    entranceDelay, compact,
    onExpand, onExpandOverflow, onOpenDrawer
  } = data
  const isRoot = depth === 0

  // Discrete LOD selector — re-renders only at threshold changes, not every zoom frame
  const lod = useStore(s => {
    const z = s.transform[2]
    return z <= 0.4 ? 'macro' : z <= 0.8 ? 'standard' : 'micro'
  })

  const entranceStyle: React.CSSProperties = entranceDelay !== undefined
    ? { animation: `nodeEnter 250ms cubic-bezier(0.4,0,0.2,1) ${entranceDelay}ms both` }
    : {}

  const colorStyles: React.CSSProperties = {
    borderLeftColor: colorScheme?.border,
    borderLeftWidth: colorScheme ? 4 : undefined,
    backgroundColor: colorScheme?.bg ?? '#ffffff'
  }

  const containerClasses = [
    'relative rounded-lg shadow-sm select-none transition-all duration-150',
    isRoot ? 'border-2 border-indigo-300' : 'border border-gray-200',
    selected ? 'ring-2 ring-indigo-500 shadow-md' : 'hover:shadow-md hover:border-gray-300'
  ].join(' ')

  // Expand button — shared across all LOD levels (absolutely positioned)
  const expandButton = hasChildren ? (
    collapsed ? (
      // State 1 — collapsed: show "+N" to expand to overflow mode
      <button
        onClick={(e) => { e.stopPropagation(); onExpand() }}
        className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded hover:bg-gray-200 transition-colors border border-gray-200"
        style={{ fontSize: 11 }}
      >
        +{childrenCount}
      </button>
    ) : isOverflowed ? (
      // State 2 — overflow: show "···+N" to expand to full view
      <button
        onClick={(e) => { e.stopPropagation(); onExpandOverflow() }}
        className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-amber-50 text-amber-600 text-xs px-2 py-0.5 rounded hover:bg-amber-100 transition-colors border border-amber-200 whitespace-nowrap"
        style={{ fontSize: 11 }}
        title={`Mostra altri ${hiddenCount} riporti`}
      >
        ···+{hiddenCount}
      </button>
    ) : (
      // State 3 — fully expanded: show "−" to collapse
      <button
        onClick={(e) => { e.stopPropagation(); onExpand() }}
        className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-indigo-50 text-indigo-400 text-xs px-2 py-0.5 rounded hover:bg-indigo-100 transition-colors border border-indigo-100"
        style={{ fontSize: 11 }}
      >
        −
      </button>
    )
  ) : null

  // ── Compact mode: ultra-slim 160×50 chip (high node-count + zoomed out) ───
  if (compact) {
    return (
      <div
        className={containerClasses}
        style={{ width: 160, height: 50, ...colorStyles, ...entranceStyle }}
      >
        <Handle type="target" position={Position.Top} className="!bg-gray-300 !w-1.5 !h-1.5" />
        <div className="px-2 py-1 flex items-center gap-1.5 h-full">
          <span
            className="font-medium text-gray-800 overflow-hidden flex-1"
            style={{ fontSize: 10, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
          >
            {struttura.descrizione}
          </span>
          {alertNoTitolare && <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />}
        </div>
        <Handle type="source" position={Position.Bottom} className="!bg-gray-300 !w-1.5 !h-1.5" />
        {expandButton}
      </div>
    )
  }

  // ── Macro LOD: ultra-compact chip ──────────────────────────────────────────
  if (lod === 'macro') {
    return (
      <div
        className={containerClasses}
        style={{ width: 220, minHeight: 60, ...colorStyles, ...entranceStyle }}
      >
        <Handle type="target" position={Position.Top} className="!bg-gray-300 !w-2 !h-2" />
        <div className="px-3 py-2 flex items-center gap-2 h-full">
          <span
            className="font-medium text-gray-800 overflow-hidden"
            style={{ fontSize: 11, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
          >
            {struttura.descrizione}
          </span>
          {alertNoTitolare && <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />}
        </div>
        <Handle type="source" position={Position.Bottom} className="!bg-gray-300 !w-2 !h-2" />
        {expandButton}
      </div>
    )
  }

  // ── Standard + Micro LOD: full content ────────────────────────────────────
  return (
    <div
      className={containerClasses}
      style={{ width: 220, minHeight: 90, ...colorStyles, ...entranceStyle }}
    >
      <Handle type="target" position={Position.Top} className="!bg-gray-300 !w-2 !h-2" />

      {(alertNoTitolare || alertNoDipendenti) && (
        <div className="absolute top-2 right-2 flex gap-1">
          {alertNoTitolare && <span className="w-2 h-2 rounded-full bg-red-400" title="Nessun titolare" />}
          {alertNoDipendenti && <span className="w-2 h-2 rounded-full bg-amber-400" title="0 dipendenti" />}
        </div>
      )}

      <div className="px-3 py-2.5 flex flex-col gap-1">
        <div
          className="font-semibold text-gray-900 leading-snug overflow-hidden"
          style={{ fontSize: 13, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
        >
          {struttura.descrizione}
        </div>

        {struttura.cdc_costo && (
          <div className="text-gray-400 leading-none" style={{ fontSize: 11 }}>
            CdC {struttura.cdc_costo}
          </div>
        )}

        {struttura.titolare && (
          <div className="text-gray-600 truncate" style={{ fontSize: 12 }}>
            {struttura.titolare}
          </div>
        )}

        <div className="flex items-center justify-between mt-0.5">
          <span className="flex items-center gap-1 text-gray-400" style={{ fontSize: 11 }}>
            <Users className="w-3 h-3" />
            {struttura.dipendenti_count}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onOpenDrawer() }}
            className="text-gray-300 hover:text-gray-600 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Micro LOD: extra detail row (livello / sede / UO) */}
      {lod === 'micro' && (struttura.livello || struttura.sede_tns || struttura.unita_organizzativa) && (
        <div className="px-3 pb-2 pt-1 border-t border-gray-100 space-y-0.5">
          {struttura.livello && (
            <div className="flex justify-between">
              <span className="text-gray-400" style={{ fontSize: 10 }}>Livello</span>
              <span className="text-gray-600 font-medium" style={{ fontSize: 10 }}>{struttura.livello}</span>
            </div>
          )}
          {struttura.sede_tns && (
            <div className="flex justify-between">
              <span className="text-gray-400" style={{ fontSize: 10 }}>Sede</span>
              <span className="text-gray-600" style={{ fontSize: 10 }}>{struttura.sede_tns}</span>
            </div>
          )}
          {struttura.unita_organizzativa && (
            <div className="flex justify-between">
              <span className="text-gray-400" style={{ fontSize: 10 }}>UO</span>
              <span className="text-gray-600 truncate ml-1 text-right"
                    style={{ fontSize: 10, maxWidth: '70%' }}>{struttura.unita_organizzativa}</span>
            </div>
          )}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-gray-300 !w-2 !h-2" />
      {expandButton}
    </div>
  )
})

export default OrgNode
