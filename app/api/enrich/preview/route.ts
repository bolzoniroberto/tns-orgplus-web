import { NextRequest, NextResponse } from 'next/server'
import { countMatches, computeDiff } from '@/lib/enrichment/computeDiff'
import type { EnrichmentConfig } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      entityType: 'dipendente' | 'struttura'
      idColumn: string
      rows?: Record<string, string>[]
      columnMappings?: EnrichmentConfig['columnMappings']
      countOnly?: boolean
    }

    const { entityType, idColumn, rows = [], countOnly = false } = body

    if (countOnly) {
      const ids = rows.map(r => (r[idColumn] ?? '').trim()).filter(Boolean)
      const result = countMatches(ids, entityType)
      return NextResponse.json(result)
    }

    const config: EnrichmentConfig = {
      entityType,
      idColumn,
      columnMappings: body.columnMappings ?? [],
    }

    const diffs = computeDiff({ rows, config })
    return NextResponse.json({ diffs })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
