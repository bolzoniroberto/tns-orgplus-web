// Shared types for renderer process

export interface Struttura {
  id?: number
  codice: string
  codice_padre: string | null
  descrizione: string
  cdc_costo: string | null
  titolare: string | null
  livello: string | null
  unita_organizzativa: string | null
  ruoli_oltre_v: string | null
  ruoli: string | null
  viaggiatore: string | null
  segr_redaz: string | null
  approvatore: string | null
  cassiere: string | null
  visualizzatori: string | null
  segretario: string | null
  controllore: string | null
  amministrazione: string | null
  segr_red_assistita: string | null
  segretario_assistito: string | null
  controllore_assistito: string | null
  ruoli_afc: string | null
  ruoli_hr: string | null
  altri_ruoli: string | null
  sede_tns: string | null
  gruppo_sind: string | null
  extra_data?: string
  created_at?: string
  updated_at?: string
  deleted_at?: string | null
  // computed
  dipendenti_count?: number
}

export interface Dipendente {
  id?: number
  codice_fiscale: string
  codice_nel_file: string | null
  unita_organizzativa: string | null
  cdc_costo: string | null
  cdc_costo_is_numeric: number
  titolare: string | null
  codice_struttura: string
  livello: string | null
  ruoli_oltre_v: string | null
  ruoli: string | null
  viaggiatore: string | null
  segr_redaz: string | null
  approvatore: string | null
  cassiere: string | null
  visualizzatori: string | null
  segretario: string | null
  controllore: string | null
  amministrazione: string | null
  segr_red_assistita: string | null
  segretario_assistito: string | null
  controllore_assistito: string | null
  ruoli_afc: string | null
  ruoli_hr: string | null
  altri_ruoli: string | null
  sede_tns: string | null
  gruppo_sind: string | null
  extra_data?: string
  created_at?: string
  updated_at?: string
  deleted_at?: string | null
}

export interface ChangeLogEntry {
  id: number
  timestamp: string
  entity_type: 'struttura' | 'dipendente'
  entity_id: string
  entity_label: string | null
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE' | 'IMPORT' | 'EXPORT' | 'ENRICH'
  field_name: string | null
  old_value: string | null
  new_value: string | null
}

export interface ImportReport {
  inserted: number
  updated: number
  unchanged: number
  errors: string[]
}

export interface DeleteResult {
  success: boolean
  error?: 'STRUTTURA_HAS_CHILDREN' | 'STRUTTURA_HAS_EMPLOYEES'
  message?: string
}

export interface StrutturaCounts {
  strutture: number
  dipendenti: number
  db_tns: number
}

// Filter types
export interface GridFilters {
  search: string
  sede: string[]
  ruolo: string
  showDeleted: boolean
}

export type TabView = 'orgchart' | 'grid' | 'accordion' | 'importexport' | 'storico' | 'enrichment'

export interface CustomField {
  id: number
  entity_type: 'struttura' | 'dipendente'
  field_key: string
  field_label: string
  created_at: string
}

export interface FieldChange {
  field: string        // field_key or column name
  label: string        // readable label
  oldValue: string | null
  newValue: string
  isNew: boolean       // true if custom field had no value before
  isCustom: boolean    // true if stored in extra_data
}

export interface EnrichmentDiff {
  entityId: string
  entityLabel: string
  found: boolean
  changes: FieldChange[]
}

export interface EnrichmentColumnMapping {
  fileColumn: string
  action: 'skip' | 'map' | 'new'
  targetField?: string   // for action='map': DB column name
  newLabel?: string      // for action='new': human-readable label
  newKey?: string        // for action='new': auto-generated snake_case key
}

export interface EnrichmentConfig {
  entityType: 'dipendente' | 'struttura'
  idColumn: string
  columnMappings: EnrichmentColumnMapping[]
}
