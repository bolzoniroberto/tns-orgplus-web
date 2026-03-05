import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ThemeStore {
  theme: 'light' | 'dark'
  isDark: boolean
  toggleTheme: () => void
  setTheme: (theme: 'light' | 'dark') => void
  initializeTheme: () => void
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: 'light',
      isDark: false,
      toggleTheme: () => set((state) => ({
        theme: state.theme === 'light' ? 'dark' : 'light',
        isDark: state.theme === 'light'
      })),
      setTheme: (theme) => set({
        theme,
        isDark: theme === 'dark'
      }),
      initializeTheme: () => {
        // Detect system preference on first load (no localStorage)
        if (typeof window !== 'undefined' && !localStorage.getItem('theme-storage')) {
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
          set({
            theme: prefersDark ? 'dark' : 'light',
            isDark: prefersDark
          })
        }
      }
    }),
    {
      name: 'theme-storage'
    }
  )
)
