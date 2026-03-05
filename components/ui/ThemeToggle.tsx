'use client'

import { Sun, Moon } from 'lucide-react'
import { useThemeStore } from '@/store/useThemeStore'

export function ThemeToggle() {
  const { isDark, toggleTheme } = useThemeStore()

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
      aria-label="Toggle theme"
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-gray-700 dark:text-gray-300" />
      ) : (
        <Moon className="w-4 h-4 text-gray-700 dark:text-gray-300" />
      )}
    </button>
  )
}
