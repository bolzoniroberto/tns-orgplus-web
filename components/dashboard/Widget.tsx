'use client'
import dynamic from 'next/dynamic'
import type { WidgetConfig } from '@/types'
import { useWidgetData } from './hooks/useWidgetData'
import { WIDGET_TYPE_LABELS } from '@/lib/dashboard/widgetDefaults'

const KpiCard = dynamic(() => import('./charts/KpiCard'))
const DataTable = dynamic(() => import('./charts/DataTable'))
const BarVerticalChart = dynamic(() => import('./charts/BarVerticalChart'))
const BarHorizontalChart = dynamic(() => import('./charts/BarHorizontalChart'))
const PieChartWidget = dynamic(() => import('./charts/PieChart'))
const StackedBarChart = dynamic(() => import('./charts/StackedBarChart'))

const SIZE_MIN_HEIGHT: Record<string, string> = {
  small: '200px',
  medium: '250px',
  large: '300px',
}

interface Props {
  config: WidgetConfig
  onEdit: () => void
  onDelete: () => void
  dragHandle?: React.ReactNode
}

export default function Widget({ config, onEdit, onDelete, dragHandle }: Props) {
  const { data, loading, error } = useWidgetData(config)

  return (
    <div
      className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden shadow-sm"
      style={{ minHeight: SIZE_MIN_HEIGHT[config.size] }}
    >
      {/* Header */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-100 dark:border-gray-800 flex-none">
        {dragHandle}
        <span className="text-sm font-medium text-gray-800 dark:text-gray-100 flex-1 truncate">
          {config.title || WIDGET_TYPE_LABELS[config.type]}
        </span>
        <button
          onClick={onEdit}
          className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs"
          title="Modifica widget"
        >
          ✏️
        </button>
        <button
          onClick={onDelete}
          className="p-1 rounded text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs"
          title="Elimina widget"
        >
          🗑️
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 p-3 min-h-0">
        {loading && (
          <div className="flex items-center justify-center h-full text-sm text-gray-400">Caricamento...</div>
        )}
        {error && (
          <div className="flex items-center justify-center h-full text-sm text-red-500">{error}</div>
        )}
        {!loading && !error && data && (
          <>
            {config.type === 'kpi' && <KpiCard data={data} />}
            {config.type === 'data_table' && <DataTable data={data} />}
            {config.type === 'bar_vertical' && <BarVerticalChart data={data} colorScheme={config.colorScheme} />}
            {config.type === 'bar_horizontal' && <BarHorizontalChart data={data} colorScheme={config.colorScheme} />}
            {config.type === 'pie' && <PieChartWidget data={data} colorScheme={config.colorScheme} />}
            {config.type === 'stacked_bar' && <StackedBarChart data={data} colorScheme={config.colorScheme} />}
          </>
        )}
      </div>
    </div>
  )
}
