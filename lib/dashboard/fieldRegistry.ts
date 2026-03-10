export interface FieldDef {
  key: string
  label: string
  isNumeric: boolean
  isCustom: boolean
}

export const DIPENDENTI_FIELDS: FieldDef[] = [
  { key: 'codice_struttura', label: 'Struttura', isNumeric: false, isCustom: false },
  { key: 'livello', label: 'Livello', isNumeric: false, isCustom: false },
  { key: 'sede_tns', label: 'Sede TNS', isNumeric: false, isCustom: false },
  { key: 'gruppo_sind', label: 'Gruppo Sindacale', isNumeric: false, isCustom: false },
  { key: 'cdc_costo', label: 'CDC Costo', isNumeric: false, isCustom: false },
  { key: 'approvatore', label: 'Approvatore', isNumeric: false, isCustom: false },
  { key: 'cassiere', label: 'Cassiere', isNumeric: false, isCustom: false },
  { key: 'viaggiatore', label: 'Viaggiatore', isNumeric: false, isCustom: false },
  { key: 'segr_redaz', label: 'Segr. Redazionale', isNumeric: false, isCustom: false },
  { key: 'segretario', label: 'Segretario', isNumeric: false, isCustom: false },
  { key: 'controllore', label: 'Controllore', isNumeric: false, isCustom: false },
  { key: 'amministrazione', label: 'Amministrazione', isNumeric: false, isCustom: false },
  { key: 'segr_red_assistita', label: 'Segr. Red. Assistita', isNumeric: false, isCustom: false },
  { key: 'segretario_assistito', label: 'Segretario Assistito', isNumeric: false, isCustom: false },
  { key: 'controllore_assistito', label: 'Controllore Assistito', isNumeric: false, isCustom: false },
  { key: 'ruoli_afc', label: 'Ruoli AFC', isNumeric: false, isCustom: false },
  { key: 'ruoli_hr', label: 'Ruoli HR', isNumeric: false, isCustom: false },
  { key: 'altri_ruoli', label: 'Altri Ruoli', isNumeric: false, isCustom: false },
  { key: 'ruoli_oltre_v', label: 'Ruoli Oltre V', isNumeric: false, isCustom: false },
  { key: 'visualizzatori', label: 'Visualizzatori', isNumeric: false, isCustom: false },
]

export const STRUTTURE_FIELDS: FieldDef[] = [
  { key: 'codice_padre', label: 'Struttura Padre', isNumeric: false, isCustom: false },
  { key: 'livello', label: 'Livello', isNumeric: false, isCustom: false },
  { key: 'sede_tns', label: 'Sede TNS', isNumeric: false, isCustom: false },
  { key: 'gruppo_sind', label: 'Gruppo Sindacale', isNumeric: false, isCustom: false },
  { key: 'cdc_costo', label: 'CDC Costo', isNumeric: false, isCustom: false },
  { key: 'approvatore', label: 'Approvatore', isNumeric: false, isCustom: false },
  { key: 'cassiere', label: 'Cassiere', isNumeric: false, isCustom: false },
  { key: 'viaggiatore', label: 'Viaggiatore', isNumeric: false, isCustom: false },
  { key: 'segr_redaz', label: 'Segr. Redazionale', isNumeric: false, isCustom: false },
  { key: 'segretario', label: 'Segretario', isNumeric: false, isCustom: false },
  { key: 'controllore', label: 'Controllore', isNumeric: false, isCustom: false },
  { key: 'amministrazione', label: 'Amministrazione', isNumeric: false, isCustom: false },
  { key: 'segr_red_assistita', label: 'Segr. Red. Assistita', isNumeric: false, isCustom: false },
  { key: 'segretario_assistito', label: 'Segretario Assistito', isNumeric: false, isCustom: false },
  { key: 'controllore_assistito', label: 'Controllore Assistito', isNumeric: false, isCustom: false },
  { key: 'ruoli_afc', label: 'Ruoli AFC', isNumeric: false, isCustom: false },
  { key: 'ruoli_hr', label: 'Ruoli HR', isNumeric: false, isCustom: false },
  { key: 'altri_ruoli', label: 'Altri Ruoli', isNumeric: false, isCustom: false },
  { key: 'ruoli_oltre_v', label: 'Ruoli Oltre V', isNumeric: false, isCustom: false },
  { key: 'visualizzatori', label: 'Visualizzatori', isNumeric: false, isCustom: false },
]
