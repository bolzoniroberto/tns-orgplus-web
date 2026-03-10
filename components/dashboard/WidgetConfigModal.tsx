'use client'
import { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import type { WidgetConfig, WidgetType, EntityType, AggregationFn, WidgetSize } from '@/types'
import { WIDGET_TYPE_LABELS, WIDGET_TYPE_ICONS, getWidgetDefaults } from '@/lib/dashboard/widgetDefaults'
import { COLOR_SCHEMES } from '@/lib/dashboard/colorSchemes'
import { useAvailableFields } from './hooks/useAvailableFields'

const WIDGET_TYPES: WidgetType[] = ['bar_vertical', 'bar_horizontal', 'pie', 'stacked_bar', 'kpi', 'data_table']

interface Props {
  open: boolean
  initial?: Partial<WidgetConfig>
  onSave: (config: WidgetConfig) => void
  onClose: () => void
}

export default function WidgetConfigModal({ open, initial, onSave, onClose }: Props) {
  const [step, setStep] = useState(1)
  const [config, setConfig] = useState<Partial<WidgetConfig>>({})

  useEffect(() => {
    if (open) {
      setStep(initial?.type ? 2 : 1)
      setConfig(initial ?? { aggregation: 'count', size: 'medium', entity: 'dipendenti', colorScheme: 'default' })
    }
  }, [open, initial])

  const entity = (config.entity ?? 'dipendenti') as EntityType
  const fields = useAvailableFields(entity)
  const numericFields = fields.filter(f => f.isNumeric)

  function patch(updates: Partial<WidgetConfig>) {
    setConfig(prev => ({ ...prev, ...updates }))
  }

  function selectType(type: WidgetType) {
    const defaults = getWidgetDefaults(type)
    setConfig(prev => ({ ...defaults, ...prev, type, size: defaults.size ?? prev.size }))
    setStep(2)
  }

  const canSave = !!config.groupBy &&
    (config.aggregation === 'count' || !!config.aggregationField) &&
    (config.type !== 'stacked_bar' || !!config.groupBy2)

  function handleSave() {
    if (!canSave) return
    onSave({
      id: config.id ?? crypto.randomUUID(),
      type: config.type!,
      title: config.title ?? '',
      entity: config.entity ?? 'dipendenti',
      groupBy: config.groupBy!,
      groupBy2: config.groupBy2,
      aggregation: config.aggregation ?? 'count',
      aggregationField: config.aggregationField,
      size: config.size ?? 'medium',
      includeNull: config.includeNull ?? false,
      colorScheme: config.colorScheme ?? 'default',
    })
  }

  return (
    <Dialog.Root open={open} onOpenChange={v => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
          <Dialog.Title className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">
            {initial?.type ? 'Modifica widget' : 'Aggiungi widget'} — Step {step}/2
          </Dialog.Title>

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">Tipo di widget</label>
                <div className="grid grid-cols-3 gap-2">
                  {WIDGET_TYPES.map(type => (
                    <button
                      key={type}
                      onClick={() => selectType(type)}
                      className={[
                        'flex flex-col items-center gap-1 p-3 rounded-lg border-2 text-sm transition-colors',
                        config.type === type
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300',
                      ].join(' ')}
                    >
                      <span className="text-xl">{WIDGET_TYPE_ICONS[type]}</span>
                      <span className="text-xs text-center leading-tight">{WIDGET_TYPE_LABELS[type]}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">Entità</label>
                <div className="flex gap-3">
                  {(['dipendenti', 'strutture'] as EntityType[]).map(e => (
                    <label key={e} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="entity"
                        checked={config.entity === e}
                        onChange={() => patch({ entity: e, groupBy: '', groupBy2: '', aggregationField: '' })}
                        className="accent-indigo-600"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">{e}</span>
                    </label>
                  ))}
                </div>
              </div>

              {config.type && (
                <button
                  onClick={() => setStep(2)}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium"
                >
                  Avanti →
                </button>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Titolo</label>
                <input
                  type="text"
                  value={config.title ?? ''}
                  onChange={e => patch({ title: e.target.value })}
                  placeholder="Titolo widget..."
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>

              {/* GroupBy */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Raggruppa per</label>
                <select
                  value={config.groupBy ?? ''}
                  onChange={e => patch({ groupBy: e.target.value })}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="">-- Seleziona campo --</option>
                  {fields.map(f => (
                    <option key={f.key} value={f.key}>
                      {f.isCustom ? `★ ${f.label}` : f.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* GroupBy2 (only stacked_bar) */}
              {config.type === 'stacked_bar' && (
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Secondo raggruppamento</label>
                  <select
                    value={config.groupBy2 ?? ''}
                    onChange={e => patch({ groupBy2: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">-- Seleziona campo --</option>
                    {fields.map(f => (
                      <option key={f.key} value={f.key}>
                        {f.isCustom ? `★ ${f.label}` : f.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Aggregation */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Aggregazione</label>
                <div className="flex gap-4">
                  {(['count', 'sum', 'avg'] as AggregationFn[]).map(a => (
                    <label key={a} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="aggregation"
                        checked={config.aggregation === a}
                        onChange={() => patch({ aggregation: a, aggregationField: '' })}
                        className="accent-indigo-600"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300 uppercase">{a}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* AggregationField (sum/avg) */}
              {config.aggregation !== 'count' && (
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Campo numerico</label>
                  <select
                    value={config.aggregationField ?? ''}
                    onChange={e => patch({ aggregationField: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">-- Seleziona campo numerico --</option>
                    {numericFields.map(f => (
                      <option key={f.key} value={f.key}>{f.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Size */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Dimensione</label>
                <div className="flex gap-4">
                  {(['small', 'medium', 'large'] as WidgetSize[]).map(s => (
                    <label key={s} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="size"
                        checked={config.size === s}
                        onChange={() => patch({ size: s })}
                        className="accent-indigo-600"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">{s}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Color scheme (not for kpi/data_table) */}
              {config.type !== 'kpi' && config.type !== 'data_table' && (
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Colori</label>
                  <div className="flex gap-2">
                    {COLOR_SCHEMES.map(scheme => (
                      <button
                        key={scheme.id}
                        onClick={() => patch({ colorScheme: scheme.id })}
                        title={scheme.label}
                        className={[
                          'flex gap-0.5 p-1 rounded border-2',
                          config.colorScheme === scheme.id ? 'border-indigo-500' : 'border-transparent',
                        ].join(' ')}
                      >
                        {scheme.colors.slice(0, 4).map((c, i) => (
                          <span key={i} className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: c }} />
                        ))}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Include null */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.includeNull ?? false}
                  onChange={e => patch({ includeNull: e.target.checked })}
                  className="accent-indigo-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Includi valori vuoti</span>
              </label>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  ← Indietro
                </button>
                <button
                  onClick={handleSave}
                  disabled={!canSave}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium"
                >
                  Salva widget
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Annulla
                </button>
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
