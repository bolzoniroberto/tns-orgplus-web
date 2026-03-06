import { db } from '@/lib/db'
import type { EnrichmentConfig, EnrichmentDiff } from '@/types'

export interface ApplyResult {
  applied: number
  skipped: number
  errors: string[]
}

export function applyEnrichment(
  diffs: EnrichmentDiff[],
  config: EnrichmentConfig
): ApplyResult {
  const database = db()
  const { entityType, columnMappings } = config
  const table = entityType === 'dipendente' ? 'dipendenti' : 'strutture'
  const idField = entityType === 'dipendente' ? 'codice_fiscale' : 'codice'

  // Collect new custom field definitions
  const newCustomFields = columnMappings.filter(m => m.action === 'new' && m.newKey)

  let applied = 0
  let skipped = 0
  const errors: string[] = []

  const runTransaction = database.transaction(() => {
    // Register custom fields
    for (const mapping of newCustomFields) {
      database.prepare(`
        INSERT INTO custom_fields (entity_type, field_key, field_label)
        VALUES (?, ?, ?)
        ON CONFLICT(field_key) DO UPDATE SET field_label = excluded.field_label
      `).run(entityType, mapping.newKey!, mapping.newLabel || mapping.newKey!)
    }

    // Apply diffs
    for (const diff of diffs) {
      if (!diff.found) { skipped++; continue }

      const actualChanges = diff.changes.filter(
        c => c.newValue !== (c.oldValue ?? '')
      )
      if (actualChanges.length === 0) { skipped++; continue }

      // Separate standard vs custom field changes
      const stdChanges = actualChanges.filter(c => !c.isCustom)
      const customChanges = actualChanges.filter(c => c.isCustom)

      // Apply standard field updates
      if (stdChanges.length > 0) {
        const setClauses = stdChanges.map(c => `${c.field} = ?`).join(', ')
        const values = stdChanges.map(c => c.newValue || null)
        database.prepare(
          `UPDATE ${table} SET ${setClauses}, updated_at = CURRENT_TIMESTAMP WHERE ${idField} = ?`
        ).run(...values, diff.entityId)
      }

      // Apply extra_data updates
      if (customChanges.length > 0) {
        const record = database.prepare(
          `SELECT extra_data FROM ${table} WHERE ${idField} = ?`
        ).get(diff.entityId) as { extra_data: string } | undefined

        const extraData: Record<string, string> = record
          ? JSON.parse(record.extra_data || '{}')
          : {}

        for (const c of customChanges) {
          extraData[c.field] = c.newValue
        }

        database.prepare(
          `UPDATE ${table} SET extra_data = ?, updated_at = CURRENT_TIMESTAMP WHERE ${idField} = ?`
        ).run(JSON.stringify(extraData), diff.entityId)
      }

      // Write change_log entries
      for (const change of actualChanges) {
        database.prepare(`
          INSERT INTO change_log (entity_type, entity_id, entity_label, action, field_name, old_value, new_value)
          VALUES (?, ?, ?, 'ENRICH', ?, ?, ?)
        `).run(
          entityType,
          diff.entityId,
          diff.entityLabel,
          change.label,
          change.oldValue,
          change.newValue
        )
      }

      applied++
    }
  })

  try {
    runTransaction()
  } catch (e) {
    errors.push(String(e))
  }

  return { applied, skipped, errors }
}
