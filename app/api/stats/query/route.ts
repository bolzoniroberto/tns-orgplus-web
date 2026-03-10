import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import type { StatsQueryRequest, StatsQueryResponse, StatsQueryRow } from '@/types'

const ALLOWED_DIPENDENTI_COLS = new Set([
  'codice_struttura', 'livello', 'sede_tns', 'gruppo_sind', 'cdc_costo',
  'approvatore', 'cassiere', 'viaggiatore', 'segr_redaz', 'segretario',
  'controllore', 'amministrazione', 'segr_red_assistita', 'segretario_assistito',
  'controllore_assistito', 'ruoli_afc', 'ruoli_hr', 'altri_ruoli', 'ruoli_oltre_v',
  'visualizzatori',
])

const ALLOWED_STRUTTURE_COLS = new Set([
  'codice_padre', 'livello', 'sede_tns', 'gruppo_sind', 'cdc_costo',
  'approvatore', 'cassiere', 'viaggiatore', 'segr_redaz', 'segretario',
  'controllore', 'amministrazione', 'segr_red_assistita', 'segretario_assistito',
  'controllore_assistito', 'ruoli_afc', 'ruoli_hr', 'altri_ruoli', 'ruoli_oltre_v',
  'visualizzatori',
])

function resolveFieldExpr(field: string, table: string, allowedCols: Set<string>): string | null {
  if (field.startsWith('cf_')) {
    // Custom field: key is everything after 'cf_'
    const cfKey = field.slice(3)
    // Validate that the custom field exists
    const entity_type = table === 'dipendenti' ? 'dipendente' : 'struttura'
    const row = db().prepare(
      `SELECT field_key FROM custom_fields WHERE entity_type = ? AND field_key = ?`
    ).get(entity_type, cfKey) as { field_key: string } | undefined

    if (!row) return null
    // Use json_extract with bound parameter for safety
    return `json_extract(extra_data, '$.${cfKey}')`
  }

  if (!allowedCols.has(field)) return null
  return field
}

function getFieldLabel(field: string, entity: string): string {
  if (field.startsWith('cf_')) {
    const cfKey = field.slice(3)
    const entity_type = entity === 'dipendenti' ? 'dipendente' : 'struttura'
    const row = db().prepare(
      `SELECT field_label FROM custom_fields WHERE entity_type = ? AND field_key = ?`
    ).get(entity_type, cfKey) as { field_label: string } | undefined
    return row?.field_label ?? cfKey
  }
  return field
}

export async function POST(request: Request) {
  const body: StatsQueryRequest = await request.json()
  const { entity, groupBy, groupBy2, aggregation, aggregationField, includeNull, limit = 50 } = body

  const table = entity === 'dipendenti' ? 'dipendenti' : 'strutture'
  const allowedCols = entity === 'dipendenti' ? ALLOWED_DIPENDENTI_COLS : ALLOWED_STRUTTURE_COLS

  const col1Expr = resolveFieldExpr(groupBy, table, allowedCols)
  if (!col1Expr) {
    return NextResponse.json({ error: 'Field not allowed' }, { status: 400 })
  }

  // Validate groupBy2 if provided
  let col2Expr: string | null = null
  if (groupBy2) {
    col2Expr = resolveFieldExpr(groupBy2, table, allowedCols)
    if (!col2Expr) {
      return NextResponse.json({ error: 'Field not allowed' }, { status: 400 })
    }
  }

  // Validate aggregationField if needed
  let aggFieldExpr: string | null = null
  if (aggregation !== 'count') {
    if (!aggregationField) {
      return NextResponse.json({ error: 'aggregationField required for sum/avg' }, { status: 400 })
    }
    aggFieldExpr = resolveFieldExpr(aggregationField, table, allowedCols)
    if (!aggFieldExpr) {
      return NextResponse.json({ error: 'Aggregation field not allowed' }, { status: 400 })
    }
  }

  const nullFilter = includeNull ? '' : `AND ${col1Expr} IS NOT NULL`
  const aggFn = aggregation === 'count'
    ? 'COUNT(*)'
    : aggregation === 'sum'
      ? `SUM(CAST(${aggFieldExpr} AS REAL))`
      : `AVG(CAST(${aggFieldExpr} AS REAL))`

  let sql: string
  let rows: StatsQueryRow[]

  if (col2Expr) {
    sql = `
      SELECT
        COALESCE(${col1Expr}, '(vuoto)') AS label,
        COALESCE(${col2Expr}, '(vuoto)') AS group2,
        ${aggFn} AS value
      FROM ${table}
      WHERE deleted_at IS NULL ${nullFilter}
      GROUP BY ${col1Expr}, ${col2Expr}
      ORDER BY label, value DESC
      LIMIT ?
    `
    rows = db().prepare(sql).all(limit) as StatsQueryRow[]
  } else {
    sql = `
      SELECT
        COALESCE(${col1Expr}, '(vuoto)') AS label,
        ${aggFn} AS value
      FROM ${table}
      WHERE deleted_at IS NULL ${nullFilter}
      GROUP BY ${col1Expr}
      ORDER BY value DESC
      LIMIT ?
    `
    rows = db().prepare(sql).all(limit) as StatsQueryRow[]
  }

  const response: StatsQueryResponse = {
    data: rows,
    fieldLabel: getFieldLabel(groupBy, entity),
    entityLabel: entity === 'dipendenti' ? 'Dipendenti' : 'Strutture',
  }

  return NextResponse.json(response)
}
