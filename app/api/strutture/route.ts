import { NextRequest, NextResponse } from 'next/server'
import { db, writeChangeLog } from '@/lib/db'

export async function GET(req: NextRequest) {
  const showDeleted = req.nextUrl.searchParams.get('showDeleted') === 'true'
  const where = showDeleted ? '' : 'WHERE deleted_at IS NULL'
  const strutture = db()
    .prepare(`
      SELECT s.*,
        (SELECT COUNT(*) FROM dipendenti d WHERE d.codice_struttura = s.codice AND d.deleted_at IS NULL) as dipendenti_count
      FROM strutture s
      ${where}
      ORDER BY s.codice ASC
    `)
    .all()
  return NextResponse.json(strutture)
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json() as Record<string, unknown>

    const codice = String(data.codice ?? '').trim()
    const descrizione = String(data.descrizione ?? '').trim()

    if (!codice) return NextResponse.json({ success: false, message: 'Il campo "Codice" è obbligatorio' })
    if (!descrizione) return NextResponse.json({ success: false, message: 'Il campo "Descrizione" è obbligatorio' })

    const existing = db().prepare('SELECT codice FROM strutture WHERE codice = ?').get(codice)
    if (existing) {
      return NextResponse.json({ success: false, message: `Il codice "${codice}" è già in uso` })
    }

    const str = (v: unknown) => (v !== undefined && v !== '' ? String(v) : null)
    db().prepare(`
      INSERT INTO strutture (
        codice, codice_padre, descrizione, cdc_costo, titolare, livello,
        unita_organizzativa, ruoli_oltre_v, ruoli, viaggiatore, segr_redaz,
        approvatore, cassiere, visualizzatori, segretario, controllore,
        amministrazione, segr_red_assistita, segretario_assistito,
        controllore_assistito, ruoli_afc, ruoli_hr, altri_ruoli, sede_tns, gruppo_sind
      ) VALUES (
        @codice, @codice_padre, @descrizione, @cdc_costo, @titolare, @livello,
        @unita_organizzativa, @ruoli_oltre_v, @ruoli, @viaggiatore, @segr_redaz,
        @approvatore, @cassiere, @visualizzatori, @segretario, @controllore,
        @amministrazione, @segr_red_assistita, @segretario_assistito,
        @controllore_assistito, @ruoli_afc, @ruoli_hr, @altri_ruoli, @sede_tns, @gruppo_sind
      )
    `).run({
      codice,
      descrizione,
      codice_padre:           str(data.codice_padre),
      cdc_costo:              str(data.cdc_costo),
      titolare:               str(data.titolare),
      livello:                str(data.livello),
      unita_organizzativa:    str(data.unita_organizzativa),
      ruoli_oltre_v:          str(data.ruoli_oltre_v),
      ruoli:                  str(data.ruoli),
      viaggiatore:            str(data.viaggiatore),
      segr_redaz:             str(data.segr_redaz),
      approvatore:            str(data.approvatore),
      cassiere:               str(data.cassiere),
      visualizzatori:         str(data.visualizzatori),
      segretario:             str(data.segretario),
      controllore:            str(data.controllore),
      amministrazione:        str(data.amministrazione),
      segr_red_assistita:     str(data.segr_red_assistita),
      segretario_assistito:   str(data.segretario_assistito),
      controllore_assistito:  str(data.controllore_assistito),
      ruoli_afc:              str(data.ruoli_afc),
      ruoli_hr:               str(data.ruoli_hr),
      altri_ruoli:            str(data.altri_ruoli),
      sede_tns:               str(data.sede_tns),
      gruppo_sind:            str(data.gruppo_sind),
    })

    writeChangeLog('struttura', codice, descrizione, 'CREATE', null, null, null)
    return NextResponse.json({ success: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ success: false, message: `Errore durante la creazione: ${msg}` })
  }
}
