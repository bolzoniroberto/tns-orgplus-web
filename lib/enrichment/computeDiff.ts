import { db } from '@/lib/db'
import type { EnrichmentConfig, EnrichmentDiff, FieldChange } from '@/types'

export interface ComputeDiffInput {
  rows: Record<string, string>[]
  config: EnrichmentConfig
}

export interface CountMatchResult {
  matched: number
  total: number
}

export function countMatches(
  ids: string[],
  entityType: 'dipendente' | 'struttura'
): CountMatchResult {
  const database = db()
  const table = entityType === 'dipendente' ? 'dipendenti' : 'strutture'
  const idField = entityType === 'dipendente' ? 'codice_fiscale' : 'codice'

  const stmt = database.prepare(
    `SELECT ${idField} FROM ${table} WHERE ${idField} = ? AND deleted_at IS NULL`
  )
  let matched = 0
  for (const id of ids) {
    if (id.trim() && stmt.get(id.trim())) matched++
  }
  return { matched, total: ids.length }
}

export function computeDiff({ rows, config }: ComputeDiffInput): EnrichmentDiff[] {
  const database = db()
  const { entityType, idColumn, columnMappings } = config
  const table = entityType === 'dipendente' ? 'dipendenti' : 'strutture'
  const idField = entityType === 'dipendente' ? 'codice_fiscale' : 'codice'
  const labelField = entityType === 'dipendente' ? 'titolare' : 'descrizione'

  const activeMappings = columnMappings.filter(m => m.action !== 'skip')
  const stmt = database.prepare(
    `SELECT * FROM ${table} WHERE ${idField} = ? AND deleted_at IS NULL`
  )

  const results: EnrichmentDiff[] = []

  for (const row of rows) {
    const entityId = (row[idColumn] ?? '').trim()
    if (!entityId) continue

    const record = stmt.get(entityId) as Record<string, unknown> | undefined
    const extraData: Record<string, string> = record
      ? JSON.parse((record.extra_data as string) || '{}')
      : {}

    const changes: FieldChange[] = []

    if (record) {
      for (const mapping of activeMappings) {
        const newValue = (row[mapping.fileColumn] ?? '').trim()

        if (mapping.action === 'map' && mapping.targetField) {
          const oldValue = record[mapping.targetField] != null
            ? String(record[mapping.targetField])
            : null
          changes.push({
            field: mapping.targetField,
            label: mapping.targetField,
            oldValue: oldValue || null,
            newValue,
            isNew: false,
            isCustom: false,
          })
        } else if (mapping.action === 'new' && mapping.newKey) {
          const rawOld = extraData[mapping.newKey]
          const oldValue = rawOld != null && rawOld !== '' ? rawOld : null
          changes.push({
            field: mapping.newKey,
            label: mapping.newLabel || mapping.newKey,
            oldValue,
            newValue,
            isNew: oldValue === null,
            isCustom: true,
          })
        }
      }
    }

    results.push({
      entityId,
      entityLabel: record ? String(record[labelField] || entityId) : entityId,
      found: !!record,
      changes,
    })
  }

  return results
}
