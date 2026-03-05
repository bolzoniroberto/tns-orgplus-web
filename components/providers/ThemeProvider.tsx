'use client'

import { useEffect } from 'react'
import { useThemeStore } from '@/store/useThemeStore'

interface ThemeProviderProps {
  children: React.ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { theme, initializeTheme } = useThemeStore()

  useEffect(() => {
    // Initialize theme from localStorage or system preference
    initializeTheme()
  }, [initializeTheme])

  useEffect(() => {
    // Apply dark class to html element
    const html = document.documentElement
    if (theme === 'dark') {
      html.classList.add('dark')
    } else {
      html.classList.remove('dark')
    }
  }, [theme])

  return <>{children}</>
}
