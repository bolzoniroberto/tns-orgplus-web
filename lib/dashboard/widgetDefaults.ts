import type { WidgetType, WidgetConfig } from '@/types'

export function getWidgetDefaults(type: WidgetType): Partial<WidgetConfig> {
  const base: Partial<WidgetConfig> = {
    type,
    title: '',
    entity: 'dipendenti',
    groupBy: '',
    aggregation: 'count',
    size: 'medium',
    includeNull: false,
    colorScheme: 'default',
  }

  switch (type) {
    case 'kpi':
      return { ...base, size: 'small' }
    case 'data_table':
      return { ...base, size: 'large' }
    case 'stacked_bar':
      return { ...base, size: 'large', groupBy2: '' }
    default:
      return base
  }
}

export const WIDGET_TYPE_LABELS: Record<WidgetType, string> = {
  bar_vertical: 'Barre Verticali',
  bar_horizontal: 'Barre Orizzontali',
  pie: 'Torta',
  stacked_bar: 'Barre Impilate',
  kpi: 'KPI',
  data_table: 'Tabella',
}

export const WIDGET_TYPE_ICONS: Record<WidgetType, string> = {
  bar_vertical: '📊',
  bar_horizontal: '📉',
  pie: '🥧',
  stacked_bar: '📈',
  kpi: '🔢',
  data_table: '📋',
}
