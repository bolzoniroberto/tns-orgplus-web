'use client'
import React, { useEffect } from 'react'
import { useOrgStore } from '@/store/useOrgStore'
import type { TabView } from '@/types'
import Toast from '@/components/shared/Toast'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

const TABS: { id: TabView; label: string }[] = [
  { id: 'orgchart', label: 'OrgChart' },
  { id: 'grid', label: 'Grid' },
  { id: 'accordion', label: 'Accordion' },
  { id: 'importexport', label: 'Import / Export' },
  { id: 'enrichment', label: 'Arricchisci' },
  { id: 'storico', label: 'Storico' }
]

interface AppShellProps {
  children: React.ReactNode
}

export default function AppShell({ children }: AppShellProps) {
  const { activeTab, setActiveTab, counts, refreshCounts, toast, clearToast } = useOrgStore()

  useEffect(() => {
    refreshCounts()
  }, [])

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950">
      <header className="flex-none h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center px-4 gap-4 z-20">
        <span className="font-semibold text-gray-900 dark:text-gray-50 text-sm whitespace-nowrap">TNS OrgPlus</span>

        {counts && (
          <span className="text-xs text-gray-400 dark:text-gray-500 font-normal">
            {counts.strutture} strutture · {counts.dipendenti} dipendenti
          </span>
        )}

        <div className="flex-1" />

        <ThemeToggle />

        <nav className="flex items-center gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={[
                'px-3 py-1.5 text-sm rounded-md transition-colors',
                activeTab === tab.id
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-50 font-medium border-b-2 border-indigo-600'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              ].join(' ')}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="flex-1 overflow-hidden">
        {children}
      </main>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type as 'success' | 'error' | 'warning'}
          onClose={clearToast}
        />
      )}
    </div>
  )
}
