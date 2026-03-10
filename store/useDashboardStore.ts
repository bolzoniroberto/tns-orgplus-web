import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Dashboard, WidgetConfig } from '@/types'

interface DashboardStore {
  dashboards: Dashboard[]
  activeDashboardId: string | null

  setActiveDashboard: (id: string) => void
  createDashboard: (name: string) => string
  deleteDashboard: (id: string) => void
  renameDashboard: (id: string, name: string) => void
  addWidget: (dashboardId: string, widget: WidgetConfig) => void
  updateWidget: (dashboardId: string, widget: WidgetConfig) => void
  deleteWidget: (dashboardId: string, widgetId: string) => void
  reorderWidgets: (dashboardId: string, widgets: WidgetConfig[]) => void
}

export const useDashboardStore = create<DashboardStore>()(
  persist(
    (set, get) => ({
      dashboards: [],
      activeDashboardId: null,

      setActiveDashboard: (id) => set({ activeDashboardId: id }),

      createDashboard: (name) => {
        const id = crypto.randomUUID()
        const now = new Date().toISOString()
        const dashboard: Dashboard = { id, name, widgets: [], createdAt: now, updatedAt: now }
        set(state => ({
          dashboards: [...state.dashboards, dashboard],
          activeDashboardId: state.activeDashboardId ?? id,
        }))
        return id
      },

      deleteDashboard: (id) => {
        set(state => {
          const dashboards = state.dashboards.filter(d => d.id !== id)
          let activeDashboardId = state.activeDashboardId
          if (activeDashboardId === id) {
            activeDashboardId = dashboards[0]?.id ?? null
          }
          return { dashboards, activeDashboardId }
        })
      },

      renameDashboard: (id, name) => {
        set(state => ({
          dashboards: state.dashboards.map(d =>
            d.id === id ? { ...d, name, updatedAt: new Date().toISOString() } : d
          ),
        }))
      },

      addWidget: (dashboardId, widget) => {
        set(state => ({
          dashboards: state.dashboards.map(d =>
            d.id === dashboardId
              ? { ...d, widgets: [...d.widgets, widget], updatedAt: new Date().toISOString() }
              : d
          ),
        }))
      },

      updateWidget: (dashboardId, widget) => {
        set(state => ({
          dashboards: state.dashboards.map(d =>
            d.id === dashboardId
              ? {
                  ...d,
                  widgets: d.widgets.map(w => (w.id === widget.id ? widget : w)),
                  updatedAt: new Date().toISOString(),
                }
              : d
          ),
        }))
      },

      deleteWidget: (dashboardId, widgetId) => {
        set(state => ({
          dashboards: state.dashboards.map(d =>
            d.id === dashboardId
              ? { ...d, widgets: d.widgets.filter(w => w.id !== widgetId), updatedAt: new Date().toISOString() }
              : d
          ),
        }))
      },

      reorderWidgets: (dashboardId, widgets) => {
        set(state => ({
          dashboards: state.dashboards.map(d =>
            d.id === dashboardId ? { ...d, widgets, updatedAt: new Date().toISOString() } : d
          ),
        }))
      },
    }),
    { name: 'orgplus-dashboards' }
  )
)
