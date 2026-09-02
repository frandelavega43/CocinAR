import { useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'cocinaar-theme'

function getSystemTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getUserThemePreference(): Theme | null {
  if (typeof window === 'undefined') return null

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    // ignore storage errors
  }

  return null
}

function resolveTheme(preference: Theme | null): Theme {
  return preference ?? getSystemTheme()
}

export function getStoredTheme(): Theme {
  return resolveTheme(getUserThemePreference())
}

export function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return

  document.documentElement.dataset.theme = theme

  const meta = document.querySelector('meta[name="theme-color"]')
  meta?.setAttribute('content', theme === 'dark' ? '#1a1612' : '#f6f1ea')
}

export function useTheme() {
  const [userPreference, setUserPreference] = useState<Theme | null>(() => getUserThemePreference())
  const [theme, setTheme] = useState<Theme>(() => resolveTheme(getUserThemePreference()))

  useEffect(() => {
    const resolved = resolveTheme(userPreference)
    setTheme(resolved)
    applyTheme(resolved)

    if (userPreference !== null) return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    function handleSystemThemeChange() {
      const next = getSystemTheme()
      setTheme(next)
      applyTheme(next)
    }

    mediaQuery.addEventListener('change', handleSystemThemeChange)
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange)
  }, [userPreference])

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setUserPreference(next)

    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // ignore storage errors
    }
  }

  return { theme, setTheme: setUserPreference, toggleTheme, followsSystem: userPreference === null }
}
