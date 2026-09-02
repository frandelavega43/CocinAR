import { useTheme } from '../hooks/useTheme'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={isDark ? 'Activar modo claro' : 'Activar modo oscuro'}
      title={isDark ? 'Modo claro' : 'Modo oscuro'}
    >
      {isDark ? (
        <svg
          className="theme-toggle__icon"
          viewBox="0 0 24 24"
          width="20"
          height="20"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="4.25" fill="currentColor" />
          <g fill="currentColor">
            <rect x="11" y="2" width="2" height="5" rx="1" />
            <rect x="11" y="17" width="2" height="5" rx="1" />
            <rect x="2" y="11" width="5" height="2" rx="1" />
            <rect x="17" y="11" width="5" height="2" rx="1" />
            <g transform="rotate(45 12 12)">
              <rect x="11" y="2" width="2" height="5" rx="1" />
              <rect x="11" y="17" width="2" height="5" rx="1" />
              <rect x="2" y="11" width="5" height="2" rx="1" />
              <rect x="17" y="11" width="5" height="2" rx="1" />
            </g>
          </g>
        </svg>
      ) : (
        <svg
          className="theme-toggle__icon"
          viewBox="0 0 24 24"
          width="20"
          height="20"
          aria-hidden="true"
        >
          <path
            fill="currentColor"
            d="M12 3a8.5 8.5 0 1 0 8.5 8.5 6.5 6.5 0 0 1-8.5-8.5Z"
          />
        </svg>
      )}
    </button>
  )
}
