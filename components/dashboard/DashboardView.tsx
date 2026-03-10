'use client'
import { useDashboardStore } from '@/store/useDashboardStore'
import DashboardManager from './DashboardManager'
import DashboardGrid from './DashboardGrid'

export default function DashboardView() {
  const { dashboards, activeDashboardId, createDashboard, setActiveDashboard } = useDashboardStore()
  const activeDashboard = dashboards.find(d => d.id === activeDashboardId)

  if (dashboards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-4">
        <div className="text-5xl">📊</div>
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Nessun dashboard</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
          Crea il tuo primo dashboard per visualizzare statistiche e KPI sull&apos;organigramma.
        </p>
        <button
          onClick={() => {
            const id = createDashboard('Dashboard 1')
            setActiveDashboard(id)
          }}
          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium"
        >
          Crea primo dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <DashboardManager />
      <div className="flex-1 overflow-auto">
        {activeDashboard ? (
          <DashboardGrid dashboard={activeDashboard} />
        ) : (
          <div className="flex items-center justify-center h-full text-sm text-gray-400">
            Seleziona un dashboard
          </div>
        )}
      </div>
    </div>
  )
}
