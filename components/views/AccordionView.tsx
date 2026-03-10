'use client'

import React, { useState, useMemo } from 'react'
import { Search, ChevronDown, Trash2, Edit2, GripVertical, Users, ArrowRightLeft, X } from 'lucide-react'
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  pointerWithin,
  useDraggable,
  useDroppable,
  type CollisionDetection,
} from '@dnd-kit/core'
import * as Accordion from '@radix-ui/react-accordion'
import { useOrgStore } from '@/store/useOrgStore'
import type { Struttura, Dipendente } from '@/types'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import RecordDrawer from '@/components/shared/RecordDrawer'
import { api } from '@/lib/api'

// ── Pending move (shown in confirmation modal before saving) ─────────────────
type PendingMove =
  | { kind: 'struttura'; codice: string; label: string; fromParent: string | null; toParent: string | null; toLabel: string }
  | { kind: 'dipendente'; cf: string; nome: string; fromCodice: string; toCodice: string; toLabel: string }

// ── DnD wrapper components ───────────────────────────────────────────────────

function DraggableStruttura({ codice, children }: { codice: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `str::${codice}` })
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, opacity: 0.8, zIndex: 50, position: 'relative' as const }
    : {}
  return (
    <div ref={setNodeRef} style={style} className={isDragging ? 'ring-2 ring-indigo-400 rounded-md' : ''}>
      <div className="flex items-center w-full">
        <span
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 text-gray-300 hover:text-gray-500 flex-shrink-0 touch-none"
          title="Trascina per spostare questa struttura"
        >
          <GripVertical className="w-4 h-4" />
        </span>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  )
}

function DroppableStruttura({ codice, children }: { codice: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `drop::${codice}` })
  return (
    <div ref={setNodeRef} className={isOver ? 'ring-2 ring-indigo-300 rounded-md bg-indigo-50 transition-colors' : 'transition-colors'}>
      {children}
    </div>
  )
}

function DraggableDipendente({ cf, children }: { cf: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `dip::${cf}` })
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, opacity: 0.8, zIndex: 50, position: 'relative' as const }
    : {}
  return (
    <div ref={setNodeRef} style={style} className={isDragging ? 'ring-2 ring-blue-400 rounded-md' : ''}>
      <div className="flex items-center w-full">
        <span
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 text-gray-300 hover:text-gray-500 flex-shrink-0 touch-none"
          title="Trascina per spostare questo dipendente"
        >
          <GripVertical className="w-4 h-4" />
        </span>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  )
}

// ── Tree data types ──────────────────────────────────────────────────────────

interface TreeStructura {
  struttura: Struttura & { dipendenti_count: number }
  children: TreeStructura[]
  dipendenti: Dipendente[]
}

// Build hierarchical tree
function buildTree(
  strutture: (Struttura & { dipendenti_count: number })[],
  dipendenti: Dipendente[],
  filteredCodici?: Set<string>,
  filteredDipendenteCFs?: Set<string>
): TreeStructura[] {
  const byParent = new Map<string | null, (Struttura & { dipendenti_count: number })[]>()
  const dipendentesByStruttura = new Map<string, Dipendente[]>()

  strutture.forEach((s) => {
    if (filteredCodici && !filteredCodici.has(s.codice)) return
    const p = s.codice_padre ?? null
    if (!byParent.has(p)) byParent.set(p, [])
    byParent.get(p)!.push(s)
  })

  dipendenti.forEach((d) => {
    if (filteredDipendenteCFs && !filteredDipendenteCFs.has(d.codice_fiscale)) return
    if (!dipendentesByStruttura.has(d.codice_struttura)) {
      dipendentesByStruttura.set(d.codice_struttura, [])
    }
    dipendentesByStruttura.get(d.codice_struttura)!.push(d)
  })

  function build(parentCodice: string | null): TreeStructura[] {
    const children = byParent.get(parentCodice) ?? []
    return children
      .sort((a, b) => (a.codice ?? '').localeCompare(b.codice ?? ''))
      .map((s) => ({
        struttura: s,
        children: build(s.codice),
        dipendenti: dipendentesByStruttura.get(s.codice) ?? [],
      }))
  }

  return build(null)
}

// ── Accordion item component ─────────────────────────────────────────────────

type ColorMode = 'none' | 'dipendenti'

interface AccordionStruturaItemProps {
  treeNode: TreeStructura
  onEditStruttura: (s: Struttura & { dipendenti_count: number }) => void
  onDeleteStruttura: (s: Struttura & { dipendenti_count: number }) => void
  onEditDipendente: (d: Dipendente) => void
  onDeleteDipendente: (d: Dipendente) => void
  compact: boolean
  colorMode: ColorMode
  subtreeHasDipendenti: Set<string>
}

function AccordionStruturaItem({
  treeNode,
  onEditStruttura,
  onDeleteStruttura,
  onEditDipendente,
  onDeleteDipendente,
  compact,
  colorMode,
  subtreeHasDipendenti,
}: AccordionStruturaItemProps) {
  const { struttura, children, dipendenti } = treeNode

  const colorCls = colorMode === 'dipendenti'
    ? struttura.dipendenti_count > 0
      ? 'border-l-4 border-l-green-500 bg-green-50/30'
      : subtreeHasDipendenti.has(struttura.codice)
        ? 'border-l-4 border-l-amber-400 bg-amber-50/30'
        : 'border-l-4 border-l-gray-200 opacity-60'
    : ''

  return (
    <Accordion.Item value={struttura.codice} className={`border-b border-gray-100 last:border-0 ${colorCls}`}>

      {/* Droppable wraps ONLY the header row — not recursive children — to avoid overlap */}
      <DroppableStruttura codice={struttura.codice}>
        <div className="flex items-stretch min-h-[36px]">
          <Accordion.Trigger className="flex-1 min-w-0 text-left hover:bg-gray-50 data-[state=open]:bg-indigo-50/40 transition-colors">
            <DraggableStruttura codice={struttura.codice}>
              <div className="flex items-center gap-2 px-3 py-2 min-w-0">
                <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 text-gray-400 transition-transform" />
                <span className="font-mono text-xs font-semibold text-gray-500 flex-shrink-0 tabular-nums">
                  {struttura.codice}
                </span>
                <span className="text-sm font-medium text-gray-900 truncate flex-1">
                  {struttura.descrizione}
                </span>
                {!compact && struttura.titolare && (
                  <span className="text-xs text-gray-400 truncate hidden sm:block max-w-[160px] flex-shrink-0">
                    {struttura.titolare}
                  </span>
                )}
                {!compact && struttura.cdc_costo && (
                  <span className="font-mono text-xs text-gray-300 hidden md:block flex-shrink-0">
                    {struttura.cdc_costo}
                  </span>
                )}
                {dipendenti.length > 0 && (
                  <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full tabular-nums flex-shrink-0">
                    {dipendenti.length} dip.
                  </span>
                )}
                {children.length > 0 && (
                  <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full tabular-nums flex-shrink-0">
                    {children.length} sub.
                  </span>
                )}
              </div>
            </DraggableStruttura>
          </Accordion.Trigger>

          {/* Action buttons — sibling of trigger, not nested inside */}
          <div className="flex items-center gap-0.5 px-2 border-l border-gray-100 flex-shrink-0 bg-white">
            <button
              onClick={() => onEditStruttura(struttura)}
              className="p-1.5 text-gray-300 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
              title="Modifica"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDeleteStruttura(struttura)}
              className="p-1.5 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              title="Elimina"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </DroppableStruttura>

      <Accordion.Content>
          {/* Dipendenti — compact single-line rows */}
          {dipendenti.length > 0 && (
            <div className="border-t border-blue-100/60 bg-blue-50/30 px-3 py-1.5">
              <div className="space-y-0.5">
                {dipendenti.map((d) => (
                  <DraggableDipendente key={d.codice_fiscale} cf={d.codice_fiscale}>
                    <div className="flex items-center gap-2 px-2 py-1 bg-white rounded border border-blue-100 text-xs">
                      <span className="font-mono text-gray-400 flex-shrink-0 tabular-nums">{d.codice_fiscale}</span>
                      {d.titolare && (
                        <span className="text-gray-700 flex-1 truncate">{d.titolare}</span>
                      )}
                      <div className="flex items-center gap-0.5 flex-shrink-0 ml-auto">
                        <button
                          onClick={() => onEditDipendente(d)}
                          className="p-1 text-gray-300 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Modifica"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => onDeleteDipendente(d)}
                          className="p-1 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Elimina"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </DraggableDipendente>
                ))}
              </div>
            </div>
          )}

          {/* Child structures — recursive, indented */}
          {children.length > 0 && (
            <Accordion.Root type="single" collapsible className="border-t border-gray-100 pl-5 border-l-2 border-l-indigo-100 ml-3">
              {children.map((child) => (
                <AccordionStruturaItem
                  key={child.struttura.codice}
                  treeNode={child}
                  onEditStruttura={onEditStruttura}
                  onDeleteStruttura={onDeleteStruttura}
                  onEditDipendente={onEditDipendente}
                  onDeleteDipendente={onDeleteDipendente}
                  compact={compact}
                  colorMode={colorMode}
                  subtreeHasDipendenti={subtreeHasDipendenti}
                />
              ))}
            </Accordion.Root>
          )}
      </Accordion.Content>
    </Accordion.Item>
  )
}

// ── Main view ────────────────────────────────────────────────────────────────

export default function AccordionView() {
  const { strutture, dipendenti, refreshAll, addToast } = useOrgStore()
  const [search, setSearch] = useState('')
  const [sedeFiltro, setSedeFiltro] = useState<string>('all')
  const [compact, setCompact] = useState(false)
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string
    message: string
    onConfirm: () => Promise<void>
  } | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerRecord, setDrawerRecord] = useState<(Struttura & { dipendenti_count: number }) | Dipendente | null>(null)
  const [drawerType, setDrawerType] = useState<'struttura' | 'dipendente'>('struttura')
  const [unassignedPanelOpen, setUnassignedPanelOpen] = useState(false)
  const [movePanelOpen, setMovePanelOpen] = useState(false)
  const [moveSearch, setMoveSearch] = useState('')
  const [colorMode, setColorMode] = useState<ColorMode>('none')
  const [hideNoEmployees, setHideNoEmployees] = useState(false)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  // Use pointerWithin first (pointer must be inside the droppable rect),
  // fall back to closestCenter when the pointer is between targets.
  const collisionDetection: CollisionDetection = (args) => {
    const pointer = pointerWithin(args)
    if (pointer.length > 0) return pointer
    return closestCenter(args)
  }

  const sediList = useMemo(() => {
    const all = new Set<string>()
    strutture.forEach((s) => s.sede_tns && all.add(s.sede_tns))
    dipendenti.forEach((d) => d.sede_tns && all.add(d.sede_tns))
    return Array.from(all).sort()
  }, [strutture, dipendenti])

  const sedeFilteredStrutture = useMemo(() => {
    if (sedeFiltro === 'all') return strutture
    return strutture.filter((s) => (s.sede_tns?.toLowerCase() ?? '') === sedeFiltro.toLowerCase())
  }, [strutture, sedeFiltro])

  const subtreeHasDipendenti = useMemo(() => {
    const strutMap = new Map(sedeFilteredStrutture.filter(s => !s.deleted_at).map(s => [s.codice, s]))
    const childrenOf = new Map<string, string[]>()
    strutMap.forEach(s => {
      const p = s.codice_padre ?? '__root__'
      if (!childrenOf.has(p)) childrenOf.set(p, [])
      childrenOf.get(p)!.push(s.codice)
    })
    const result = new Set<string>()
    const dfs = (codice: string): boolean => {
      const s = strutMap.get(codice)
      if (!s) return false
      const selfHas = s.dipendenti_count > 0
      let childHas = false
      for (const c of (childrenOf.get(codice) ?? [])) {
        if (dfs(c)) childHas = true
      }
      if (selfHas || childHas) { result.add(codice); return true }
      return false
    }
    ;(childrenOf.get('__root__') ?? []).forEach(r => dfs(r))
    return result
  }, [sedeFilteredStrutture])

  const filteredStrutture = useMemo(() => {
    if (hideNoEmployees) return sedeFilteredStrutture.filter(s => subtreeHasDipendenti.has(s.codice))
    return sedeFilteredStrutture
  }, [sedeFilteredStrutture, hideNoEmployees, subtreeHasDipendenti])

  const filteredDipendenti = useMemo(() => {
    let result = dipendenti
    if (sedeFiltro !== 'all') {
      result = result.filter((d) => (d.sede_tns?.toLowerCase() ?? '') === sedeFiltro.toLowerCase())
    }
    return result
  }, [dipendenti, sedeFiltro])

  const searchDipendentiResults = useMemo(() => {
    if (!search) return new Set<string>()
    const lower = search.toLowerCase()
    const matching = new Set<string>()
    filteredDipendenti.forEach((d) => {
      if (
        d.codice_fiscale?.toLowerCase().includes(lower) ||
        d.titolare?.toLowerCase().includes(lower)
      ) {
        matching.add(d.codice_fiscale)
      }
    })
    return matching
  }, [search, filteredDipendenti])

  const searchResults = useMemo(() => {
    if (!search) return new Set<string>()
    const lower = search.toLowerCase()
    const matching = new Set<string>()
    filteredStrutture.forEach((s) => {
      if (
        s.descrizione?.toLowerCase().includes(lower) ||
        s.codice?.toLowerCase().includes(lower) ||
        s.titolare?.toLowerCase().includes(lower)
      ) {
        matching.add(s.codice)
      }
    })
    searchDipendentiResults.forEach((cf) => {
      const dip = filteredDipendenti.find((d) => d.codice_fiscale === cf)
      if (dip) matching.add(dip.codice_struttura)
    })
    // Include all ancestors so the tree can navigate to matched nodes
    const strutByCode = new Map(filteredStrutture.map((s) => [s.codice, s]))
    for (const codice of new Set(matching)) {
      let current = strutByCode.get(codice)
      while (current?.codice_padre) {
        matching.add(current.codice_padre)
        current = strutByCode.get(current.codice_padre)
      }
    }
    return matching
  }, [search, filteredStrutture, filteredDipendenti, searchDipendentiResults])

  const treeData = useMemo(
    () => buildTree(
      filteredStrutture,
      filteredDipendenti,
      search ? searchResults : undefined,
      search ? searchDipendentiResults : undefined
    ),
    [filteredStrutture, filteredDipendenti, search, searchResults, searchDipendentiResults]
  )

  const unassignedDipendenti = useMemo(
    () => dipendenti.filter(d => !d.deleted_at && !d.codice_struttura?.trim()),
    [dipendenti]
  )

  const strutMap = useMemo(
    () => new Map(strutture.map(s => [s.codice, s.descrizione ?? s.codice])),
    [strutture]
  )

  const assignedDipendenti = useMemo(() => {
    const lower = moveSearch.toLowerCase()
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
  }, [dipendenti, moveSearch, strutMap])

  // ── Drag end: set pendingMove instead of saving directly ─────────────────
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return
    const activeId = String(active.id)
    const overId = String(over.id)
    if (!overId.startsWith('drop::')) return

    const toCode = overId.replace('drop::', '')
    const toParent = toCode === 'root' ? null : toCode

    if (activeId.startsWith('str::')) {
      const codice = activeId.replace('str::', '')
      const struttura = strutture.find((s) => s.codice === codice)
      if (!struttura) return
      if (struttura.codice_padre === toParent) return // nessun cambiamento
      if (toParent === codice) return // non su se stesso
      const toLabel = toParent
        ? (strutture.find((s) => s.codice === toParent)?.descrizione ?? toParent)
        : '(radice)'
      setPendingMove({
        kind: 'struttura',
        codice,
        label: struttura.descrizione ?? codice,
        fromParent: struttura.codice_padre ?? null,
        toParent,
        toLabel,
      })
    } else if (activeId.startsWith('dip::')) {
      const cf = activeId.replace('dip::', '')
      const dip = dipendenti.find((d) => d.codice_fiscale === cf)
      if (!dip) return
      if (!toParent) return // dipendenti non possono stare alla radice
      if (dip.codice_struttura === toParent) return // nessun cambiamento
      const toLabel = strutture.find((s) => s.codice === toParent)?.descrizione ?? toParent
      setPendingMove({
        kind: 'dipendente',
        cf,
        nome: dip.titolare ?? cf,
        fromCodice: dip.codice_struttura ?? '',
        toCodice: toParent,
        toLabel,
      })
    }
  }

  // ── Confirm move: chiamato dopo conferma nella modale ────────────────────
  const handleConfirmMove = async () => {
    if (!pendingMove) return
    const move = pendingMove
    setPendingMove(null)
    try {
      if (move.kind === 'struttura') {
        const result = await api.strutture.updateParent(move.codice, move.toParent)
        if (result.success) {
          await refreshAll()
          addToast(`Struttura "${move.codice}" spostata con successo`, 'success')
        } else {
          addToast(result.message ?? 'Errore nello spostamento', 'error')
        }
      } else {
        const result = await api.dipendenti.update(move.cf, { codice_struttura: move.toCodice })
        if (result.success) {
          await refreshAll()
          addToast(`Dipendente spostato in "${move.toLabel}"`, 'success')
        } else {
          addToast((result as { error?: string }).error ?? 'Errore nello spostamento', 'error')
        }
      }
    } catch (e) {
      addToast('Errore: ' + String(e), 'error')
    }
  }

  const handleDeleteStruttura = (s: Struttura & { dipendenti_count: number }) => {
    if ((s.dipendenti_count || 0) > 0) {
      addToast(`La struttura "${s.codice}" ha ${s.dipendenti_count} dipendente(i). Trasferiscili prima.`, 'error')
      return
    }

    setConfirmDialog({
      title: 'Elimina struttura',
      message: `Sei sicuro di voler eliminare "${s.codice}"?`,
      onConfirm: async () => {
        try {
          const result = await api.strutture.delete(s.codice)
          if (result.success) {
            await refreshAll()
            addToast('Struttura eliminata', 'success')
          } else {
            addToast(result.message || 'Errore', 'error')
          }
        } catch (err) {
          addToast('Errore: ' + String(err), 'error')
        }
      },
    })
  }

  const handleDeleteDipendente = (d: Dipendente) => {
    setConfirmDialog({
      title: 'Elimina dipendente',
      message: `Sei sicuro di voler eliminare "${d.codice_fiscale}"?`,
      onConfirm: async () => {
        try {
          const result = await api.dipendenti.delete(d.codice_fiscale)
          if (result.success) {
            await refreshAll()
            addToast('Dipendente eliminato', 'success')
          } else {
            addToast('Errore', 'error')
          }
        } catch (err) {
          addToast('Errore: ' + String(err), 'error')
        }
      },
    })
  }

  // Messaggio per la modale di conferma spostamento
  const pendingMoveMessage = useMemo(() => {
    if (!pendingMove) return ''
    if (pendingMove.kind === 'struttura') {
      return [
        `Stai spostando la struttura "${pendingMove.label}" (${pendingMove.codice})`,
        ``,
        `Da: ${pendingMove.fromParent ?? '(radice)'}`,
        `A:  ${pendingMove.toLabel}${pendingMove.toParent ? ` (${pendingMove.toParent})` : ' (radice)'}`,
      ].join('\n')
    } else {
      return [
        `Stai spostando il dipendente "${pendingMove.nome}"`,
        `(CF: ${pendingMove.cf})`,
        ``,
        `Da struttura: ${pendingMove.fromCodice || '(nessuna)'}`,
        `A struttura:  ${pendingMove.toLabel} (${pendingMove.toCodice})`,
      ].join('\n')
    }
  }, [pendingMove])

  return (
    <div className="flex flex-col h-full min-h-0 gap-0 bg-white">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap px-4 py-2.5 border-b border-gray-200 flex-shrink-0">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cerca per codice o nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
        </div>

        <select
          value={sedeFiltro}
          onChange={(e) => setSedeFiltro(e.target.value)}
          className="text-sm border border-gray-200 rounded-md px-2 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white"
        >
          <option value="all">Tutte le sedi</option>
          {sediList.map((s) => (
            <option key={s} value={s.toLowerCase()}>
              {s}
            </option>
          ))}
        </select>

        <button
          onClick={() => setCompact(!compact)}
          className={`text-sm px-3 py-2 rounded-md transition-colors ${
            compact ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          {compact ? 'Compatto' : 'Esteso'}
        </button>

        {/* Unassigned employees toggle */}
        <button
          onClick={() => setUnassignedPanelOpen(v => !v)}
          className={[
            'flex items-center gap-1.5 text-sm px-3 py-2 rounded-md transition-colors border',
            unassignedPanelOpen
              ? 'bg-amber-50 text-amber-700 border-amber-200'
              : 'border-gray-200 text-gray-500 hover:bg-gray-50',
          ].join(' ')}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Senza struttura</span>
          {unassignedDipendenti.length > 0 && (
            <span className="text-xs bg-amber-500 text-white font-semibold px-1.5 py-0.5 rounded-full tabular-nums leading-none">
              {unassignedDipendenti.length}
            </span>
          )}
        </button>

        {/* Color mode toggle */}
        <button
          onClick={() => setColorMode(m => m === 'dipendenti' ? 'none' : 'dipendenti')}
          className={[
            'text-sm px-3 py-2 rounded-md transition-colors border',
            colorMode === 'dipendenti'
              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
              : 'border-gray-200 text-gray-500 hover:bg-gray-50',
          ].join(' ')}
        >
          Evidenzia dipendenti
        </button>

        {/* Hide no-employees toggle */}
        <button
          onClick={() => setHideNoEmployees(v => !v)}
          className={[
            'text-sm px-3 py-2 rounded-md transition-colors border',
            hideNoEmployees
              ? 'bg-amber-50 text-amber-700 border-amber-200'
              : 'border-gray-200 text-gray-500 hover:bg-gray-50',
          ].join(' ')}
        >
          {hideNoEmployees ? 'Mostra tutto' : 'Nascondi senza dipendenti'}
        </button>

        {/* Move employees toggle */}
        <button
          onClick={() => setMovePanelOpen(v => !v)}
          className={[
            'flex items-center gap-1.5 text-sm px-3 py-2 rounded-md transition-colors border',
            movePanelOpen
              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
              : 'border-gray-200 text-gray-500 hover:bg-gray-50',
          ].join(' ')}
        >
          <ArrowRightLeft className="w-3.5 h-3.5" />
          <span>Sposta dipendenti</span>
        </button>

        <span className="text-xs text-gray-400 ml-auto">
          ≡ Trascina per spostare strutture e dipendenti
        </span>
      </div>

      {/* Content — DndContext wraps both panel and accordion so drags cross boundaries */}
      <DndContext sensors={sensors} collisionDetection={collisionDetection} onDragEnd={handleDragEnd}>
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* Unassigned panel */}
          {unassignedPanelOpen && (
            <div className="w-64 flex-shrink-0 border-r border-gray-200 flex flex-col bg-white">
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-200 bg-gray-50 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-amber-600" />
                  <span className="text-xs font-semibold text-gray-700">Senza struttura</span>
                  {unassignedDipendenti.length > 0 && (
                    <span className="text-xs bg-amber-100 text-amber-700 font-medium px-1.5 py-0.5 rounded-full tabular-nums">
                      {unassignedDipendenti.length}
                    </span>
                  )}
                </div>
                <button onClick={() => setUnassignedPanelOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {unassignedDipendenti.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-center px-4">
                  <span className="text-2xl mb-1">✓</span>
                  <p className="text-xs text-gray-400">Tutti i dipendenti hanno una struttura</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  <p className="text-xs text-gray-400 px-1 pb-1">
                    Trascina un dipendente su una struttura per assegnarlo
                  </p>
                  {unassignedDipendenti.map((d) => (
                    <DraggableDipendente key={d.codice_fiscale} cf={d.codice_fiscale}>
                      <div className="flex flex-col px-2.5 py-2 bg-white border border-gray-200 rounded-md shadow-sm cursor-grab active:cursor-grabbing hover:border-amber-300 hover:bg-amber-50/30 transition-colors">
                        <span className="text-xs font-medium text-gray-800 truncate">
                          {d.titolare || '—'}
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono mt-0.5">{d.codice_fiscale}</span>
                      </div>
                    </DraggableDipendente>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Move employees panel */}
          {movePanelOpen && (
            <div className="w-64 flex-shrink-0 border-r border-gray-200 flex flex-col bg-white">
              {/* Header */}
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-200 bg-gray-50 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="text-xs font-semibold text-gray-700">Sposta dipendenti</span>
                  <span className="text-xs bg-indigo-100 text-indigo-700 font-medium px-1.5 py-0.5 rounded-full tabular-nums">
                    {assignedDipendenti.length}
                  </span>
                </div>
                <button onClick={() => setMovePanelOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Search */}
              <div className="px-3 py-2 border-b border-gray-100 flex-shrink-0">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Cerca per nome, CF o struttura…"
                    value={moveSearch}
                    onChange={e => setMoveSearch(e.target.value)}
                    className="w-full pl-6 pr-6 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white"
                  />
                  {moveSearch && (
                    <button
                      onClick={() => setMoveSearch('')}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Body */}
              {assignedDipendenti.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-center px-4">
                  <p className="text-xs text-gray-400">Nessun dipendente trovato</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  <p className="text-xs text-gray-400 px-1 pb-1">
                    Trascina su una struttura per spostare
                  </p>
                  {assignedDipendenti.map((d) => {
                    const strutNome = strutMap.get(d.codice_struttura)
                    return (
                      <DraggableDipendente key={d.codice_fiscale} cf={d.codice_fiscale}>
                        <div className="flex flex-col px-2.5 py-2 bg-white border border-gray-200 rounded-md shadow-sm cursor-grab active:cursor-grabbing hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors">
                          <span className="text-xs font-medium text-gray-800 truncate">
                            {d.titolare || '—'}
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono mt-0.5">{d.codice_fiscale}</span>
                          <span className="text-[10px] text-indigo-500 mt-0.5 truncate" title={strutNome}>
                            ↳ {strutNome ?? d.codice_struttura}
                          </span>
                        </div>
                      </DraggableDipendente>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Accordion area */}
          <div className="flex-1 overflow-auto">
            {/* Color legend */}
            {colorMode === 'dipendenti' && (
              <div className="flex gap-4 px-4 py-1.5 bg-gray-50 border-b border-gray-100 flex-shrink-0">
                <span className="flex items-center gap-1.5 text-xs text-gray-600">
                  <span className="w-3 h-3 rounded-sm border-l-4 border-l-green-500 bg-green-50" />
                  Dipendenti diretti
                </span>
                <span className="flex items-center gap-1.5 text-xs text-gray-600">
                  <span className="w-3 h-3 rounded-sm border-l-4 border-l-amber-400 bg-amber-50" />
                  Solo in strutture figlie
                </span>
                <span className="flex items-center gap-1.5 text-xs text-gray-600">
                  <span className="w-3 h-3 rounded-sm border-l-4 border-l-gray-200 bg-white opacity-60" />
                  Nessun dipendente
                </span>
              </div>
            )}
            <div className="p-4">
              {treeData.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-400">Nessuna struttura trovata</p>
                </div>
              ) : (
                <Accordion.Root type="single" collapsible className="space-y-2">
                  {treeData.map((rootNode) => (
                    <AccordionStruturaItem
                      key={rootNode.struttura.codice}
                      treeNode={rootNode}
                      onEditStruttura={(s) => {
                        setDrawerType('struttura')
                        setDrawerRecord(s)
                        setDrawerOpen(true)
                      }}
                      onDeleteStruttura={handleDeleteStruttura}
                      onEditDipendente={(d) => {
                        setDrawerType('dipendente')
                        setDrawerRecord(d)
                        setDrawerOpen(true)
                      }}
                      onDeleteDipendente={handleDeleteDipendente}
                      compact={compact}
                      colorMode={colorMode}
                      subtreeHasDipendenti={subtreeHasDipendenti}
                    />
                  ))}
                </Accordion.Root>
              )}
            </div>
          </div>

        </div>
      </DndContext>

      {/* Confirm Dialog — delete */}
      {confirmDialog && (
        <ConfirmDialog
          open={true}
          title={confirmDialog.title}
          message={confirmDialog.message}
          onConfirm={async () => {
            await confirmDialog.onConfirm()
            setConfirmDialog(null)
          }}
          onCancel={() => setConfirmDialog(null)}
        />
      )}

      {/* Confirm Dialog — drag & drop move */}
      <ConfirmDialog
        open={pendingMove !== null}
        title={pendingMove?.kind === 'struttura' ? '📦 Sposta struttura' : '👤 Sposta dipendente'}
        message={pendingMoveMessage}
        confirmLabel="Conferma spostamento"
        confirmVariant="primary"
        onConfirm={handleConfirmMove}
        onCancel={() => setPendingMove(null)}
      />

      {/* Record Drawer */}
      {drawerOpen && drawerRecord && drawerType === 'struttura' && (
        <RecordDrawer
          open={drawerOpen}
          type="struttura"
          record={drawerRecord as Struttura & { dipendenti_count: number }}
          initialMode="view"
          onClose={() => setDrawerOpen(false)}
          onSaved={refreshAll}
        />
      )}
      {drawerOpen && drawerRecord && drawerType === 'dipendente' && (
        <RecordDrawer
          open={drawerOpen}
          type="dipendente"
          record={drawerRecord as Dipendente}
          initialMode="view"
          onClose={() => setDrawerOpen(false)}
          onSaved={refreshAll}
        />
      )}
    </div>
  )
}
