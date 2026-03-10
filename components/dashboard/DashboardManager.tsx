'use client'
import { useState } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useDashboardStore } from '@/store/useDashboardStore'

export default function DashboardManager() {
  const { dashboards, activeDashboardId, setActiveDashboard, createDashboard, deleteDashboard, renameDashboard } = useDashboardStore()
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null)

  function handleCreate() {
    const name = `Dashboard ${dashboards.length + 1}`
    const id = createDashboard(name)
    setActiveDashboard(id)
  }

  function handleRenameSubmit() {
    if (!renaming) return
    renameDashboard(renaming.id, renaming.name)
    setRenaming(null)
  }

  return (
    <div className="flex items-center gap-1 px-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex-none overflow-x-auto">
      {dashboards.map(dash => (
        <div key={dash.id} className="flex items-center flex-none">
          {renaming?.id === dash.id ? (
            <form
              onSubmit={e => { e.preventDefault(); handleRenameSubmit() }}
              className="flex items-center"
            >
              <input
                autoFocus
                value={renaming.name}
                onChange={e => setRenaming({ ...renaming, name: e.target.value })}
                onBlur={handleRenameSubmit}
                className="text-sm border border-indigo-500 rounded px-2 py-0.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 w-32"
              />
            </form>
          ) : (
            <div className="flex items-center">
              <button
                onClick={() => setActiveDashboard(dash.id)}
                className={[
                  'px-3 py-2 text-sm whitespace-nowrap border-b-2 transition-colors',
                  activeDashboardId === dash.id
                    ? 'border-indigo-600 text-gray-900 dark:text-gray-100 font-medium'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
                ].join(' ')}
              >
                {dash.name}
              </button>
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded">
                    ⋮
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-1 z-50 min-w-[140px]"
                    sideOffset={4}
                  >
                    <DropdownMenu.Item
                      className="text-sm px-3 py-1.5 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 outline-none"
                      onSelect={() => setRenaming({ id: dash.id, name: dash.name })}
                    >
                      Rinomina
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                      className="text-sm px-3 py-1.5 rounded cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 outline-none"
                      onSelect={() => {
                        if (confirm(`Eliminare "${dash.name}"?`)) deleteDashboard(dash.id)
                      }}
                    >
                      Elimina
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            </div>
          )}
        </div>
      ))}

      <button
        onClick={handleCreate}
        className="px-3 py-2 text-sm text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex-none"
        title="Nuovo dashboard"
      >
        + Nuovo
      </button>
    </div>
  )
}
