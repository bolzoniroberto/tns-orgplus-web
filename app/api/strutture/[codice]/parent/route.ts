import { NextRequest, NextResponse } from 'next/server'
import { db, writeChangeLog } from '@/lib/db'

export async function POST(req: NextRequest, { params }: { params: Promise<{ codice: string }> }) {
  const { codice } = await params
  try {
    const { newCodiceParent } = await req.json() as { newCodiceParent: string | null }

    const current = db().prepare('SELECT * FROM strutture WHERE codice = ?').get(codice) as Record<string, unknown>
    if (!current) return NextResponse.json({ success: false, message: `Struttura "${codice}" non trovata` })

    if (current.codice_padre === newCodiceParent) return NextResponse.json({ success: true })

    if (newCodiceParent) {
      // Cycle check: is newCodiceParent already a descendant of codice?
      const descendants = db().prepare(`
        WITH RECURSIVE desc_tree(c) AS (
          SELECT codice FROM strutture WHERE codice = ?
          UNION ALL
          SELECT s.codice FROM strutture s
          INNER JOIN desc_tree d ON s.codice_padre = d.c
          WHERE s.deleted_at IS NULL
        )
        SELECT COUNT(*) as n FROM desc_tree WHERE c = ?
      `).get(codice, newCodiceParent) as { n: number }

      if (descendants.n > 0) {
        return NextResponse.json({ success: false, message: 'Impossibile spostare: la struttura di destinazione è un discendente di quella selezionata' })
      }

      const parentExists = db().prepare('SELECT codice FROM strutture WHERE codice = ? AND deleted_at IS NULL').get(newCodiceParent)
      if (!parentExists) {
        return NextResponse.json({ success: false, message: `Struttura padre "${newCodiceParent}" non trovata o già eliminata` })
      }
    }

    const oldParent = current.codice_padre as string | null
    db().prepare('UPDATE strutture SET codice_padre = ?, updated_at = CURRENT_TIMESTAMP WHERE codice = ?').run(newCodiceParent, codice)
    writeChangeLog('struttura', codice, current.descrizione as string, 'UPDATE', 'codice_padre', oldParent ?? null, newCodiceParent ?? null)

    return NextResponse.json({ success: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ success: false, message: `Errore durante lo spostamento: ${msg}` })
  }
}
