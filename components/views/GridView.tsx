'use client'
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { AgGridReact } from 'ag-grid-react'
import type { ColDef, ICellRendererParams, CellValueChangedEvent } from 'ag-grid-community'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'
import { ChevronRight, Plus, Search, Eye, EyeOff, SlidersHorizontal } from 'lucide-react'
import { useOrgStore } from '@/store/useOrgStore'
import { api } from '@/lib/api'
import type { Struttura, Dipendente, CustomField } from '@/types'
import RecordDrawer from '@/components/shared/RecordDrawer'

type SubTab = 'strutture' | 'dipendenti' | 'orfani_dipendenti' | 'orfani_strutture' | 'strutture_vuote'

const isStrutturaTab = (t: SubTab) => t === 'strutture' || t === 'orfani_strutture' || t === 'strutture_vuote'

interface ColDescriptor {
  field: string
  label: string
  isCustom?: boolean
  colDef: Omit<ColDef, 'field' | 'headerName'>
}

const STRUTTURE_ALL_COLS: ColDescriptor[] = [
  { field: 'codice',                  label: 'Codice',                colDef: { width: 110, sortable: true, editable: false, suppressFillHandle: true, cellClass: 'font-mono text-xs text-gray-600' } },
  { field: 'descrizione',             label: 'Descrizione',           colDef: { flex: 2,    sortable: true, editable: true,  cellClass: 'text-sm font-medium text-gray-900' } },
  { field: 'codice_padre',            label: 'Padre',                 colDef: { width: 100, sortable: true, editable: true,  cellClass: 'font-mono text-xs text-gray-500' } },
  { field: 'cdc_costo',               label: 'CdC Costo',             colDef: { width: 110, sortable: true, editable: true,  cellClass: 'text-xs text-gray-500' } },
  { field: 'titolare',                label: 'Titolare',              colDef: { flex: 1.5,  sortable: true, editable: true,  cellClass: 'text-sm text-gray-600' } },
  { field: 'livello',                 label: 'Livello',               colDef: { width: 100, sortable: true, editable: true,  cellClass: 'text-xs text-gray-500' } },
  { field: 'unita_organizzativa',     label: 'Unità Org.',            colDef: { width: 130, sortable: true, editable: true,  cellClass: 'text-xs text-gray-500' } },
  { field: 'approvatore',             label: 'Approvatore',           colDef: { width: 130, sortable: true, editable: true,  cellClass: 'text-xs text-gray-600' } },
  { field: 'cassiere',                label: 'Cassiere',              colDef: { width: 100, sortable: true, editable: true,  cellClass: 'text-xs text-gray-600' } },
  { field: 'viaggiatore',             label: 'Viaggiatore',           colDef: { width: 110, sortable: true, editable: true,  cellClass: 'text-xs text-gray-600' } },
  { field: 'segr_redaz',              label: 'Segr. Redaz.',          colDef: { width: 120, sortable: true, editable: true,  cellClass: 'text-xs text-gray-600' } },
  { field: 'segretario',              label: 'Segretario',            colDef: { width: 120, sortable: true, editable: true,  cellClass: 'text-xs text-gray-600' } },
  { field: 'controllore',             label: 'Controllore',           colDef: { width: 120, sortable: true, editable: true,  cellClass: 'text-xs text-gray-600' } },
  { field: 'visualizzatori',          label: 'Visualizzatori',        colDef: { width: 130, sortable: true, editable: true,  cellClass: 'text-xs text-gray-600' } },
  { field: 'amministrazione',         label: 'Amministrazione',       colDef: { width: 140, sortable: true, editable: true,  cellClass: 'text-xs text-gray-600' } },
  { field: 'segr_red_assistita',      label: 'Segr. Red. Assist.',    colDef: { width: 155, sortable: true, editable: true,  cellClass: 'text-xs text-gray-600' } },
  { field: 'segretario_assistito',    label: 'Segretario Assist.',    colDef: { width: 145, sortable: true, editable: true,  cellClass: 'text-xs text-gray-600' } },
  { field: 'controllore_assistito',   label: 'Controllore Assist.',   colDef: { width: 145, sortable: true, editable: true,  cellClass: 'text-xs text-gray-600' } },
  { field: 'ruoli_oltre_v',           label: 'Ruoli Oltre V',         colDef: { width: 130, sortable: true, editable: true,  cellClass: 'text-xs text-gray-600' } },
  { field: 'ruoli',                   label: 'Ruoli',                 colDef: { width: 120, sortable: true, editable: true,  cellClass: 'text-xs text-gray-600' } },
  { field: 'ruoli_afc',               label: 'Ruoli AFC',             colDef: { width: 110, sortable: true, editable: true,  cellClass: 'text-xs text-gray-600' } },
  { field: 'ruoli_hr',                label: 'Ruoli HR',              colDef: { width: 110, sortable: true, editable: true,  cellClass: 'text-xs text-gray-600' } },
  { field: 'altri_ruoli',             label: 'Altri Ruoli',           colDef: { width: 120, sortable: true, editable: true,  cellClass: 'text-xs text-gray-600' } },
  { field: 'sede_tns',                label: 'Sede',                  colDef: { width: 120, sortable: true, editable: true,  cellClass: 'text-xs text-gray-500' } },
  { field: 'gruppo_sind',             label: 'Gruppo Sind.',          colDef: { width: 130, sortable: true, editable: true,  cellClass: 'text-xs text-gray-500' } },
  { field: 'dipendenti_count',        label: '# Dip.',                colDef: { width: 80,  sortable: true, editable: false, suppressFillHandle: true, filter: 'agNumberColumnFilter', cellClass: 'text-xs text-gray-500 text-center', type: 'numericColumn' } },
]

const STRUTTURE_DEFAULT_VISIBLE = new Set([
  'codice', 'descrizione', 'cdc_costo', 'codice_padre', 'titolare', 'approvatore', 'sede_tns', 'dipendenti_count',
])

const DIPENDENTI_ALL_COLS: ColDescriptor[] = [
  { field: 'codice_fiscale',          label: 'CF',                    colDef: { width: 160, sortable: true, editable: false, suppressFillHandle: true, cellClass: 'font-mono text-xs text-gray-500' } },
  { field: 'titolare',                label: 'Titolare',              colDef: { flex: 2,    sortable: true, editable: true,  cellClass: 'text-sm font-medium text-gray-900' } },
  { field: 'codice_struttura',        label: 'Struttura',             colDef: { width: 120, sortable: true, editable: true,  cellClass: 'font-mono text-xs text-gray-600' } },
  { field: 'codice_nel_file',         label: 'Cod. File',             colDef: { width: 110, sortable: true, editable: true,  cellClass: 'font-mono text-xs text-gray-500' } },
  { field: 'unita_organizzativa',     label: 'Unità Org.',            colDef: { width: 130, sortable: true, editable: true,  cellClass: 'text-xs text-gray-500' } },
  { field: 'cdc_costo',               label: 'CdC Costo',             colDef: { width: 110, sortable: true, editable: true,  cellClass: 'text-xs text-gray-500' } },
  { field: 'livello',                 label: 'Livello',               colDef: { width: 100, sortable: true, editable: true,  cellClass: 'text-xs text-gray-500' } },
  { field: 'approvatore',             label: 'Approvatore',           colDef: { width: 130, sortable: true, editable: true,  cellClass: 'text-xs text-gray-600' } },
  { field: 'cassiere',                label: 'Cassiere',              colDef: { width: 100, sortable: true, editable: true,  cellClass: 'text-xs text-gray-600' } },
  { field: 'viaggiatore',             label: 'Viaggiatore',           colDef: { width: 110, sortable: true, editable: true,  cellClass: 'text-xs text-gray-600' } },
  { field: 'segr_redaz',              label: 'Segr. Redaz.',          colDef: { width: 120, sortable: true, editable: true,  cellClass: 'text-xs text-gray-600' } },
  { field: 'segretario',              label: 'Segretario',            colDef: { width: 120, sortable: true, editable: true,  cellClass: 'text-xs text-gray-600' } },
  { field: 'controllore',             label: 'Controllore',           colDef: { width: 120, sortable: true, editable: true,  cellClass: 'text-xs text-gray-600' } },
  { field: 'visualizzatori',          label: 'Visualizzatori',        colDef: { width: 130, sortable: true, editable: true,  cellClass: 'text-xs text-gray-600' } },
  { field: 'amministrazione',         label: 'Amministrazione',       colDef: { width: 140, sortable: true, editable: true,  cellClass: 'text-xs text-gray-600' } },
  { field: 'segr_red_assistita',      label: 'Segr. Red. Assist.',    colDef: { width: 155, sortable: true, editable: true,  cellClass: 'text-xs text-gray-600' } },
  { field: 'segretario_assistito',    label: 'Segretario Assist.',    colDef: { width: 145, sortable: true, editable: true,  cellClass: 'text-xs text-gray-600' } },
  { field: 'controllore_assistito',   label: 'Controllore Assist.',   colDef: { width: 145, sortable: true, editable: true,  cellClass: 'text-xs text-gray-600' } },
  { field: 'ruoli_oltre_v',           label: 'Ruoli Oltre V',         colDef: { width: 130, sortable: true, editable: true,  cellClass: 'text-xs text-gray-600' } },
  { field: 'ruoli',                   label: 'Ruoli',                 colDef: { width: 120, sortable: true, editable: true,  cellClass: 'text-xs text-gray-600' } },
  { field: 'ruoli_afc',               label: 'Ruoli AFC',             colDef: { width: 110, sortable: true, editable: true,  cellClass: 'text-xs text-gray-600' } },
  { field: 'ruoli_hr',                label: 'Ruoli HR',              colDef: { width: 110, sortable: true, editable: true,  cellClass: 'text-xs text-gray-600' } },
  { field: 'altri_ruoli',             label: 'Altri Ruoli',           colDef: { width: 120, sortable: true, editable: true,  cellClass: 'text-xs text-gray-600' } },
  { field: 'sede_tns',                label: 'Sede',                  colDef: { width: 120, sortable: true, editable: true,  cellClass: 'text-xs text-gray-500' } },
  { field: 'gruppo_sind',             label: 'Gruppo Sind.',          colDef: { width: 130, sortable: true, editable: true,  cellClass: 'text-xs text-gray-500' } },
]

const DIPENDENTI_DEFAULT_VISIBLE = new Set([
  'codice_fiscale', 'titolare', 'codice_struttura', 'viaggiatore', 'approvatore', 'cassiere', 'sede_tns',
])

// Custom field AG Grid field prefix
const CUSTOM_PREFIX = '__cf__'

export default function GridView() {
  const { strutture, dipendenti, refreshAll, showToast } = useOrgStore()
  const [subTab, setSubTab] = useState<SubTab>('strutture')
  const [search, setSearch] = useState('')
  const [sedeFiltro, setSedeFiltro] = useState<string>('all')
  const [showDeleted, setShowDeleted] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerType, setDrawerType] = useState<'struttura' | 'dipendente'>('struttura')
  const [drawerRecord, setDrawerRecord] = useState<(Struttura & { dipendenti_count?: number }) | Dipendente | null>(null)
  const [drawerMode, setDrawerMode] = useState<'view' | 'edit' | 'create'>('view')
  const [visibleStruttureColumns, setVisibleStruttureColumns] = useState<Set<string>>(new Set(STRUTTURE_DEFAULT_VISIBLE))
  const [visibleDipendentiColumns, setVisibleDipendentiColumns] = useState<Set<string>>(new Set(DIPENDENTI_DEFAULT_VISIBLE))
  const [colPickerOpen, setColPickerOpen] = useState(false)
  const colPickerRef = useRef<HTMLDivElement>(null)

  // Custom fields loaded from DB
  const [struttureCustomFields, setStruttureCustomFields] = useState<CustomField[]>([])
  const [dipendentiCustomFields, setDipendentiCustomFields] = useState<CustomField[]>([])

  // Load custom fields for both entity types
  useEffect(() => {
    api.customFields.list('struttura').then(fields => {
      setStruttureCustomFields(fields)
      // Auto-show newly-loaded custom field columns
      if (fields.length > 0) {
        setVisibleStruttureColumns(prev => {
          const next = new Set(prev)
          fields.forEach(f => next.add(CUSTOM_PREFIX + f.field_key))
          return next
        })
      }
    }).catch(() => {})

    api.customFields.list('dipendente').then(fields => {
      setDipendentiCustomFields(fields)
      if (fields.length > 0) {
        setVisibleDipendentiColumns(prev => {
          const next = new Set(prev)
          fields.forEach(f => next.add(CUSTOM_PREFIX + f.field_key))
          return next
        })
      }
    }).catch(() => {})
  }, [])

  // Build ColDescriptors for custom fields
  const struttureCustomCols: ColDescriptor[] = useMemo(() =>
    struttureCustomFields.map(cf => ({
      field: CUSTOM_PREFIX + cf.field_key,
      label: cf.field_label,
      isCustom: true,
      colDef: { width: 140, sortable: true, editable: true, cellClass: 'text-xs text-violet-700 dark:text-violet-400' },
    })),
    [struttureCustomFields]
  )

  const dipendentiCustomCols: ColDescriptor[] = useMemo(() =>
    dipendentiCustomFields.map(cf => ({
      field: CUSTOM_PREFIX + cf.field_key,
      label: cf.field_label,
      isCustom: true,
      colDef: { width: 140, sortable: true, editable: true, cellClass: 'text-xs text-violet-700 dark:text-violet-400' },
    })),
    [dipendentiCustomFields]
  )

  useEffect(() => {
    if (!colPickerOpen) return
    const handler = (e: MouseEvent) => {
      if (colPickerRef.current && !colPickerRef.current.contains(e.target as Node))
        setColPickerOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [colPickerOpen])

  const sediList = useMemo(() => {
    const all = new Set<string>()
    strutture.forEach((s) => s.sede_tns && all.add(s.sede_tns))
    dipendenti.forEach((d) => d.sede_tns && all.add(d.sede_tns))
    return Array.from(all).sort()
  }, [strutture, dipendenti])

  const openDrawer = useCallback(
    (type: 'struttura' | 'dipendente', record: (Struttura & { dipendenti_count?: number }) | Dipendente | null, mode: 'view' | 'edit' | 'create') => {
      setDrawerType(type)
      setDrawerRecord(record)
      setDrawerMode(mode)
      setDrawerOpen(true)
    },
    []
  )

  const saveCell = useCallback(
    async (field: string, value: string, data: Struttura | Dipendente) => {
      // Custom field: update extra_data via patch
      if (field.startsWith(CUSTOM_PREFIX)) {
        const realKey = field.slice(CUSTOM_PREFIX.length)
        if (isStrutturaTab(subTab)) {
          return api.strutture.update((data as Struttura).codice, { extra_data_patch: { [realKey]: value } } as Partial<Struttura>)
        } else {
          return api.dipendenti.update((data as Dipendente).codice_fiscale, { extra_data_patch: { [realKey]: value } } as Partial<Dipendente>)
        }
      }
      // Standard field
      if (isStrutturaTab(subTab)) {
        return api.strutture.update((data as Struttura).codice, { [field]: value })
      } else {
        return api.dipendenti.update((data as Dipendente).codice_fiscale, { [field]: value })
      }
    },
    [subTab]
  )

  const handleCellValueChanged = useCallback(
    async (params: CellValueChangedEvent) => {
      if (params.oldValue === params.newValue) return
      const field = params.colDef.field
      if (!field) return
      const newVal = params.newValue ?? ''

      const selectedNodes = params.api.getSelectedNodes()
        .filter(n => n.rowIndex !== params.rowIndex)

      try {
        const result = await saveCell(field, newVal, params.data)
        if (!result.success) {
          showToast((result as { message?: string }).message ?? (result as { error?: string }).error ?? 'Errore aggiornamento', 'error')
          params.node.setDataValue(field, params.oldValue)
          return
        }
        if (selectedNodes.length > 0) {
          const promises = selectedNodes.map(node =>
            saveCell(field, newVal, node.data as Struttura | Dipendente).then(r => {
              if (r.success) node.setDataValue(field, newVal)
            })
          )
          await Promise.all(promises)
          const displayLabel = field.startsWith(CUSTOM_PREFIX) ? field.slice(CUSTOM_PREFIX.length) : field
          showToast(`"${displayLabel}" aggiornato su ${selectedNodes.length + 1} righe`, 'success')
        } else {
          const displayLabel = field.startsWith(CUSTOM_PREFIX) ? field.slice(CUSTOM_PREFIX.length) : field
          showToast(`Campo "${displayLabel}" aggiornato`, 'success')
        }
        await refreshAll()
      } catch (e) {
        showToast(String(e), 'error')
        params.node.setDataValue(field, params.oldValue)
      }
    },
    [subTab, saveCell, showToast, refreshAll]
  )

  const struttureCols: ColDef[] = useMemo(
    () => [
      { headerCheckboxSelection: true, checkboxSelection: true, width: 40, minWidth: 40, maxWidth: 40, pinned: 'left' as const, sortable: false, filter: false, floatingFilter: false, editable: false, suppressFillHandle: true, resizable: false, suppressMovable: true },
      ...STRUTTURE_ALL_COLS
        .filter(c => visibleStruttureColumns.has(c.field))
        .map(c => ({ field: c.field, headerName: c.label, ...c.colDef } as ColDef)),
      ...struttureCustomCols
        .filter(c => visibleStruttureColumns.has(c.field))
        .map(c => ({ field: c.field, headerName: `✦ ${c.label}`, ...c.colDef } as ColDef)),
      {
        headerName: '', width: 46, pinned: 'right' as const, sortable: false, editable: false, filter: false, floatingFilter: false, suppressFillHandle: true,
        cellRenderer: (params: ICellRendererParams) => (
          <button onClick={() => openDrawer('struttura', params.data, 'view')} className="flex items-center justify-center w-full h-full text-gray-300 hover:text-gray-600">
            <ChevronRight className="w-4 h-4" />
          </button>
        )
      }
    ],
    [openDrawer, visibleStruttureColumns, struttureCustomCols]
  )

  const dipendentiCols: ColDef[] = useMemo(
    () => [
      { headerCheckboxSelection: true, checkboxSelection: true, width: 40, minWidth: 40, maxWidth: 40, pinned: 'left' as const, sortable: false, filter: false, floatingFilter: false, editable: false, suppressFillHandle: true, resizable: false, suppressMovable: true },
      ...DIPENDENTI_ALL_COLS
        .filter(c => visibleDipendentiColumns.has(c.field))
        .map(c => ({ field: c.field, headerName: c.label, ...c.colDef } as ColDef)),
      ...dipendentiCustomCols
        .filter(c => visibleDipendentiColumns.has(c.field))
        .map(c => ({ field: c.field, headerName: `✦ ${c.label}`, ...c.colDef } as ColDef)),
      {
        headerName: '', width: 46, pinned: 'right' as const, sortable: false, editable: false, filter: false, floatingFilter: false, suppressFillHandle: true,
        cellRenderer: (params: ICellRendererParams) => (
          <button onClick={() => openDrawer('dipendente', params.data, 'view')} className="flex items-center justify-center w-full h-full text-gray-300 hover:text-gray-600">
            <ChevronRight className="w-4 h-4" />
          </button>
        )
      }
    ],
    [openDrawer, visibleDipendentiColumns, dipendentiCustomCols]
  )

  const isStrTab = isStrutturaTab(subTab)
  const currentAllCols = isStrTab
    ? [...STRUTTURE_ALL_COLS, ...struttureCustomCols]
    : [...DIPENDENTI_ALL_COLS, ...dipendentiCustomCols]
  const currentVisible = isStrTab ? visibleStruttureColumns : visibleDipendentiColumns
  const setCurrentVisible = isStrTab ? setVisibleStruttureColumns : setVisibleDipendentiColumns

  const toggleColumn = useCallback((field: string) => {
    const setter = isStrutturaTab(subTab) ? setVisibleStruttureColumns : setVisibleDipendentiColumns
    setter(prev => {
      const next = new Set(prev)
      if (next.has(field)) next.delete(field)
      else next.add(field)
      return next
    })
  }, [subTab])

  const strutturaCodici = useMemo(
    () => new Set(strutture.filter((s) => !s.deleted_at).map((s) => s.codice)),
    [strutture]
  )

  const orphanDipendenti = useMemo(
    () => dipendenti.filter((d) => !d.deleted_at && (!d.codice_struttura || !strutturaCodici.has(d.codice_struttura))),
    [dipendenti, strutturaCodici]
  )

  const orphanStrutture = useMemo(
    () => strutture.filter((s) => !s.deleted_at && s.codice_padre !== null && s.codice_padre !== undefined && !strutturaCodici.has(s.codice_padre)),
    [strutture, strutturaCodici]
  )

  const emptyStrutture = useMemo(() => {
    const conDipendenti = new Set(dipendenti.filter((d) => !d.deleted_at && d.codice_struttura).map((d) => d.codice_struttura))
    const childrenMap = new Map<string, string[]>()
    strutture.forEach((s) => {
      if (!s.deleted_at && s.codice_padre) {
        if (!childrenMap.has(s.codice_padre)) childrenMap.set(s.codice_padre, [])
        childrenMap.get(s.codice_padre)!.push(s.codice)
      }
    })
    function subtreeHasDipendenti(codice: string, visited = new Set<string>()): boolean {
      if (visited.has(codice)) return false
      visited.add(codice)
      if (conDipendenti.has(codice)) return true
      for (const child of childrenMap.get(codice) ?? []) {
        if (subtreeHasDipendenti(child, visited)) return true
      }
      return false
    }
    return strutture.filter((s) => !s.deleted_at && !subtreeHasDipendenti(s.codice))
  }, [strutture, dipendenti])

  const filteredData = useMemo(() => {
    const searchLower = search.toLowerCase()
    if (subTab === 'strutture') {
      return strutture.filter((s) => {
        const matchDeleted = showDeleted ? true : !s.deleted_at
        const matchSearch = !search || (s.codice?.toLowerCase().includes(searchLower) ?? false) || (s.descrizione?.toLowerCase().includes(searchLower) ?? false) || (s.titolare?.toLowerCase().includes(searchLower) ?? false)
        const matchSede = sedeFiltro === 'all' || (s.sede_tns?.toLowerCase() === sedeFiltro.toLowerCase())
        return matchDeleted && matchSearch && matchSede
      })
    } else if (subTab === 'dipendenti') {
      return dipendenti.filter((d) => {
        const matchDeleted = showDeleted ? true : !d.deleted_at
        const matchSearch = !search || (d.codice_fiscale?.toLowerCase().includes(searchLower) ?? false) || (d.titolare?.toLowerCase().includes(searchLower) ?? false) || (d.codice_struttura?.toLowerCase().includes(searchLower) ?? false)
        const matchSede = sedeFiltro === 'all' || (d.sede_tns?.toLowerCase() === sedeFiltro.toLowerCase())
        return matchDeleted && matchSearch && matchSede
      })
    } else if (subTab === 'orfani_dipendenti') {
      return orphanDipendenti.filter((d) => !search || (d.codice_fiscale?.toLowerCase().includes(searchLower) ?? false) || (d.titolare?.toLowerCase().includes(searchLower) ?? false) || (d.codice_struttura?.toLowerCase().includes(searchLower) ?? false))
    } else if (subTab === 'orfani_strutture') {
      return orphanStrutture.filter((s) => !search || (s.codice?.toLowerCase().includes(searchLower) ?? false) || (s.descrizione?.toLowerCase().includes(searchLower) ?? false) || (s.codice_padre?.toLowerCase().includes(searchLower) ?? false))
    } else {
      return emptyStrutture.filter((s) => !search || (s.codice?.toLowerCase().includes(searchLower) ?? false) || (s.descrizione?.toLowerCase().includes(searchLower) ?? false) || (s.codice_padre?.toLowerCase().includes(searchLower) ?? false))
    }
  }, [strutture, dipendenti, subTab, search, sedeFiltro, showDeleted, orphanDipendenti, orphanStrutture, emptyStrutture])

  // Flatten extra_data JSON into __cf__KEY virtual fields for AG Grid
  const rowData = useMemo((): Record<string, unknown>[] =>
    filteredData.map(record => {
      const r = record as unknown as Record<string, unknown>
      const extraStr = r.extra_data as string | undefined
      if (!extraStr || extraStr === '{}') return r
      try {
        const extra = JSON.parse(extraStr) as Record<string, string>
        const flat: Record<string, unknown> = { ...r }
        for (const [key, val] of Object.entries(extra)) {
          flat[CUSTOM_PREFIX + key] = val
        }
        return flat
      } catch {
        return r
      }
    }),
    [filteredData]
  )

  const getRowClass = (params: { data?: Record<string, unknown> }) => {
    if (params.data?.deleted_at) return 'bg-red-50 line-through text-gray-400'
    return ''
  }

  const isMainTab = subTab === 'strutture' || subTab === 'dipendenti'
  const currentCustomCols = isStrTab ? struttureCustomCols : dipendentiCustomCols

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-2.5 bg-white border-b border-gray-200 flex-wrap">
        <div className="flex gap-1 flex-wrap">
          {(['strutture', 'dipendenti'] as const).map((tab) => (
            <button key={tab} onClick={() => setSubTab(tab)} className={['px-3 py-1.5 text-sm rounded-md transition-colors', subTab === tab ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'].join(' ')}>
              {tab === 'strutture' ? `Strutture (${strutture.filter((s) => !s.deleted_at).length})` : `Dipendenti (${dipendenti.filter((d) => !d.deleted_at).length})`}
            </button>
          ))}
          <button onClick={() => setSubTab('orfani_dipendenti')} title="Dipendenti la cui struttura non esiste in DB" className={['px-3 py-1.5 text-sm rounded-md transition-colors', subTab === 'orfani_dipendenti' ? 'bg-amber-50 text-amber-700 font-medium' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'].join(' ')}>
            ⚠️ Orfani Dip.{orphanDipendenti.length > 0 && <span className="ml-1 bg-amber-500 text-white text-xs rounded-full px-1.5 py-0.5">{orphanDipendenti.length}</span>}
          </button>
          <button onClick={() => setSubTab('orfani_strutture')} title="Strutture il cui codice_padre non esiste in DB" className={['px-3 py-1.5 text-sm rounded-md transition-colors', subTab === 'orfani_strutture' ? 'bg-amber-50 text-amber-700 font-medium' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'].join(' ')}>
            ⚠️ Orfani Str.{orphanStrutture.length > 0 && <span className="ml-1 bg-amber-500 text-white text-xs rounded-full px-1.5 py-0.5">{orphanStrutture.length}</span>}
          </button>
          <button onClick={() => setSubTab('strutture_vuote')} title="Strutture senza dipendenti in nessun livello sottostante" className={['px-3 py-1.5 text-sm rounded-md transition-colors', subTab === 'strutture_vuote' ? 'bg-green-50 text-green-700 font-medium' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'].join(' ')}>
            🌿 Str. Vuote{emptyStrutture.length > 0 && <span className="ml-1 bg-green-500 text-white text-xs rounded-full px-1.5 py-0.5">{emptyStrutture.length}</span>}
          </button>
        </div>

        <div className="flex-1" />

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input type="text" placeholder="Cerca..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md w-52 focus:outline-none focus:ring-1 focus:ring-indigo-400" />
        </div>

        {isMainTab && (
          <select value={sedeFiltro} onChange={(e) => setSedeFiltro(e.target.value)} className="text-sm border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white text-gray-700">
            <option value="all">Tutte le sedi</option>
            {sediList.map((s) => <option key={s} value={s.toLowerCase()}>{s}</option>)}
          </select>
        )}

        {/* Column visibility picker */}
        <div className="relative" ref={colPickerRef}>
          <button
            onClick={() => setColPickerOpen(v => !v)}
            className={[
              'flex items-center gap-1.5 text-sm px-2.5 py-1.5 rounded-md border transition-colors',
              colPickerOpen
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                : 'border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            ].join(' ')}
            title="Scegli colonne visibili"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Colonne</span>
            <span className="text-xs bg-gray-100 text-gray-600 px-1.5 rounded-full tabular-nums leading-none py-0.5">
              {currentVisible.size}
            </span>
          </button>

          {colPickerOpen && (
            <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-xl w-72 max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 flex-shrink-0">
                <span className="text-xs font-semibold text-gray-700">Colonne visibili</span>
                <div className="flex gap-3">
                  <button
                    onClick={() => setCurrentVisible(new Set(currentAllCols.map(c => c.field)))}
                    className="text-xs text-indigo-600 hover:underline"
                  >
                    Tutte
                  </button>
                  <button
                    onClick={() => setCurrentVisible(new Set())}
                    className="text-xs text-gray-400 hover:underline"
                  >
                    Nessuna
                  </button>
                </div>
              </div>
              <div className="overflow-y-auto flex-1 p-2">
                {/* Standard columns */}
                <div className="grid grid-cols-2 gap-0.5">
                  {(isStrTab ? STRUTTURE_ALL_COLS : DIPENDENTI_ALL_COLS).map(col => (
                    <label
                      key={col.field}
                      className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        checked={currentVisible.has(col.field)}
                        onChange={() => toggleColumn(col.field)}
                        className="accent-indigo-600 w-3.5 h-3.5 flex-shrink-0"
                      />
                      <span className="text-xs text-gray-700 truncate">{col.label}</span>
                    </label>
                  ))}
                </div>
                {/* Custom fields section */}
                {currentCustomCols.length > 0 && (
                  <>
                    <div className="px-2 pt-3 pb-1 text-xs font-semibold text-violet-600 uppercase tracking-wide">
                      Variabili personalizzate
                    </div>
                    <div className="grid grid-cols-2 gap-0.5">
                      {currentCustomCols.map(col => (
                        <label
                          key={col.field}
                          className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-violet-50 cursor-pointer select-none"
                        >
                          <input
                            type="checkbox"
                            checked={currentVisible.has(col.field)}
                            onChange={() => toggleColumn(col.field)}
                            className="accent-violet-600 w-3.5 h-3.5 flex-shrink-0"
                          />
                          <span className="text-xs text-violet-700 truncate">{col.label}</span>
                        </label>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {isMainTab && (
          <button onClick={() => setShowDeleted((v) => !v)} className={['flex items-center gap-1.5 text-sm px-2.5 py-1.5 rounded-md border transition-colors', showDeleted ? 'bg-red-50 border-red-200 text-red-700' : 'border-gray-200 text-gray-500 hover:text-gray-700'].join(' ')} title={showDeleted ? 'Nascondi eliminati' : 'Mostra eliminati'}>
            {showDeleted ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Eliminati</span>
          </button>
        )}

        {isMainTab && (
          <button onClick={() => openDrawer(subTab === 'strutture' ? 'struttura' : 'dipendente', null, 'create')} className="flex items-center gap-1.5 text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-md hover:bg-indigo-700 transition-colors font-medium">
            <Plus className="w-3.5 h-3.5" />
            Aggiungi
          </button>
        )}
      </div>

      {(subTab === 'orfani_dipendenti' || subTab === 'orfani_strutture' || subTab === 'strutture_vuote') && (
        <div className={['px-4 py-2 border-b text-xs', subTab === 'strutture_vuote' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-amber-50 border-amber-200 text-amber-800'].join(' ')}>
          {subTab === 'orfani_dipendenti' && '⚠️ Dipendenti la cui struttura di assegnazione (codice_struttura) non esiste nel database.'}
          {subTab === 'orfani_strutture' && '⚠️ Strutture il cui padre (codice_padre) non esiste nel database.'}
          {subTab === 'strutture_vuote' && '🌿 Strutture senza dipendenti in nessun livello sottostante.'}
        </div>
      )}

      {isMainTab && (
        <div className="px-4 py-1 bg-gray-50 border-b border-gray-100 text-xs text-gray-400">
          💡 Doppio click su una cella per modificarla · Seleziona più righe con ☑ per applicare lo stesso valore a tutte · Pulsante → per la scheda completa
        </div>
      )}

      <div className="flex-1 ag-theme-alpine">
        <AgGridReact<Record<string, unknown>>
          rowData={rowData}
          columnDefs={isStrutturaTab(subTab) ? struttureCols : dipendentiCols}
          defaultColDef={{ resizable: true, suppressMovable: false, sortable: true, filter: true, floatingFilter: true }}
          getRowClass={getRowClass}
          rowSelection="multiple"
          suppressRowClickSelection={true}
          onCellValueChanged={handleCellValueChanged}
          stopEditingWhenCellsLoseFocus={true}
          animateRows={true}
          suppressCellFocus={false}
          rowHeight={36}
          headerHeight={36}
        />
      </div>

      <RecordDrawer
        open={drawerOpen}
        type={drawerType}
        record={drawerRecord}
        initialMode={drawerMode}
        onClose={() => setDrawerOpen(false)}
        onSaved={() => refreshAll()}
      />
    </div>
  )
}
