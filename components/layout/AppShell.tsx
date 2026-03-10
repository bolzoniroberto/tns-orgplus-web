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
  { id: 'storico', label: 'Storico' },
  { id: 'dashboard', label: 'Dashboard' }
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
    <div className="flex flex-col h-screen" style={{ background: 'var(--background)' }}>
      <header className="flex-none h-14 border-b flex items-center px-4 gap-4 z-20" style={{ background: 'var(--color-light-grey-2)', borderColor: 'var(--color-grey)' }}>
        <span className="text-sm font-semibold whitespace-nowrap" style={{ color: 'var(--color-brown)' }}>TNS OrgPlus</span>

        {counts && (
          <span className="text-xs font-normal" style={{ color: 'var(--color-dark-grey)' }}>
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
              className="px-3 py-1.5 text-sm rounded-md transition-colors"
              style={activeTab === tab.id ? {
                background: 'var(--color-grey)',
                color: 'var(--color-brown)',
                fontWeight: 'var(--font-weight-bold)',
                borderBottom: '2px solid var(--color-primary)'
              } : {
                color: 'var(--color-dark-grey)'
              }}
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
