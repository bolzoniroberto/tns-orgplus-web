import { NextRequest, NextResponse } from 'next/server'
import { db, writeChangeLog } from '@/lib/db'

export async function GET(req: NextRequest) {
  const showDeleted = req.nextUrl.searchParams.get('showDeleted') === 'true'
  const where = showDeleted ? '' : 'WHERE deleted_at IS NULL'
  const dipendenti = db().prepare(`SELECT * FROM dipendenti ${where} ORDER BY titolare ASC`).all()
  return NextResponse.json(dipendenti)
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json() as Record<string, unknown>

    const cf = String(data.codice_fiscale ?? '').trim().toUpperCase()

    if (!cf) return NextResponse.json({ success: false, message: 'Il campo "Codice Fiscale" è obbligatorio' })

    const existing = db().prepare('SELECT codice_fiscale FROM dipendenti WHERE codice_fiscale = ?').get(cf)
    if (existing) {
      return NextResponse.json({ success: false, message: `Il codice fiscale "${cf}" è già in uso` })
    }

    const str = (v: unknown) => (v !== undefined && v !== '' ? String(v) : null)
    db().prepare(`
      INSERT INTO dipendenti (
        codice_fiscale, codice_nel_file, unita_organizzativa, cdc_costo, cdc_costo_is_numeric,
        titolare, codice_struttura, livello, ruoli_oltre_v, ruoli, viaggiatore, segr_redaz,
        approvatore, cassiere, visualizzatori, segretario, controllore, amministrazione,
        segr_red_assistita, segretario_assistito, controllore_assistito,
        ruoli_afc, ruoli_hr, altri_ruoli, sede_tns, gruppo_sind
      ) VALUES (
        @codice_fiscale, @codice_nel_file, @unita_organizzativa, @cdc_costo, @cdc_costo_is_numeric,
        @titolare, @codice_struttura, @livello, @ruoli_oltre_v, @ruoli, @viaggiatore, @segr_redaz,
        @approvatore, @cassiere, @visualizzatori, @segretario, @controllore, @amministrazione,
        @segr_red_assistita, @segretario_assistito, @controllore_assistito,
        @ruoli_afc, @ruoli_hr, @altri_ruoli, @sede_tns, @gruppo_sind
      )
    `).run({
      codice_fiscale:         cf,
      codice_nel_file:        str(data.codice_nel_file),
      unita_organizzativa:    str(data.unita_organizzativa),
      cdc_costo:              str(data.cdc_costo),
      cdc_costo_is_numeric:   data.cdc_costo_is_numeric ?? 0,
      titolare:               str(data.titolare),
      codice_struttura:       str(data.codice_struttura) ?? '',
      livello:                str(data.livello),
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

    writeChangeLog('dipendente', cf, data.titolare as string, 'CREATE', null, null, null)
    return NextResponse.json({ success: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ success: false, message: `Errore durante la creazione: ${msg}` })
  }
}
