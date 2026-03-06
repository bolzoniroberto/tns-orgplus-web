import { NextRequest, NextResponse } from 'next/server'
import { applyEnrichment } from '@/lib/enrichment/applyEnrichment'
import type { EnrichmentConfig, EnrichmentDiff } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      config: EnrichmentConfig
      diffs: EnrichmentDiff[]
    }

    const result = applyEnrichment(body.diffs, body.config)
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
