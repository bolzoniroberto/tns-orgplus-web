import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { DIPENDENTI_FIELDS, STRUTTURE_FIELDS } from '@/lib/dashboard/fieldRegistry'
import type { FieldDef } from '@/lib/dashboard/fieldRegistry'
import type { EntityType } from '@/types'

export function useAvailableFields(entity: EntityType): FieldDef[] {
  const [customFields, setCustomFields] = useState<FieldDef[]>([])

  useEffect(() => {
    const entityType = entity === 'dipendenti' ? 'dipendente' : 'struttura'
    api.customFields.list(entityType).then(fields => {
      setCustomFields(
        fields.map(f => ({
          key: `cf_${f.field_key}`,
          label: f.field_label,
          isNumeric: false,
          isCustom: true,
        }))
      )
    }).catch(() => setCustomFields([]))
  }, [entity])

  const baseFields = entity === 'dipendenti' ? DIPENDENTI_FIELDS : STRUTTURE_FIELDS
  return [...baseFields, ...customFields]
}
