import { NextRequest, NextResponse } from 'next/server'
import { db as getDb } from '@/lib/db'

export async function GET(req: NextRequest) {
  const db = getDb()
  const { searchParams } = new URL(req.url)
  const entityType = searchParams.get('entityType')

  const query = entityType
    ? `SELECT * FROM custom_fields WHERE entity_type = ? ORDER BY created_at ASC`
    : `SELECT * FROM custom_fields ORDER BY entity_type, created_at ASC`

  const rows = entityType
    ? db.prepare(query).all(entityType)
    : db.prepare(query).all()

  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const db = getDb()
  const body = await req.json() as {
    entity_type: string
    field_key: string
    field_label: string
  }

  try {
    db.prepare(`
      INSERT INTO custom_fields (entity_type, field_key, field_label)
      VALUES (?, ?, ?)
      ON CONFLICT(field_key) DO UPDATE SET field_label = excluded.field_label
    `).run(body.entity_type, body.field_key, body.field_label)

    const row = db.prepare(`SELECT * FROM custom_fields WHERE field_key = ?`).get(body.field_key)
    return NextResponse.json(row)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 400 })
  }
}
