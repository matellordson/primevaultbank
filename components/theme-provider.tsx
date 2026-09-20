"use client"

import * as React from "react"

import { useServerInsertedHTML } from "next/navigation"

export type Theme = "light" | "dark" | "system"

interface ThemeContextType {
  theme: Theme
  resolvedTheme: "light" | "dark"
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = React.createContext<ThemeContextType | undefined>(undefined)

const THEME_SCRIPT = `(function(){try{var s=localStorage.getItem('pv_theme');var d=s==='dark'||(!s&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d){document.documentElement.classList.add('dark')}else{document.documentElement.classList.remove('dark')}}catch(e){}})()`

function subscribeTheme(callback: () => void) {
  window.addEventListener("storage", callback)
  const mq = window.matchMedia("(prefers-color-scheme: dark)")
  mq.addEventListener("change", callback)
  return () => {
    window.removeEventListener("storage", callback)
    mq.removeEventListener("change", callback)
  }
}

function getThemeSnapshot(): Theme {
  try {
    const local = localStorage.getItem("pv_theme") as Theme
    if (local) return local
    const match = document.cookie.match(/(?:^|;\s*)pv_theme=([^;]+)/)
    if (match?.[1]) return match[1] as Theme
    return "system"
  } catch {
    return "system"
  }
}

function getServerThemeSnapshot(): Theme {
  return "system"
}

export function ThemeProvider({
  children,
  initialTheme,
}: {
  children: React.ReactNode
  initialTheme?: Theme
}) {
  useServerInsertedHTML(() => (
    <script
      key="pv-theme-init"
      dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }}
    />
  ))

  const rawTheme = React.useSyncExternalStore(
    subscribeTheme,
    getThemeSnapshot,
    getServerThemeSnapshot
  )
  const [localTheme, setLocalTheme] = React.useState<Theme | null>(
    initialTheme ?? null
  )

  const currentTheme = localTheme ?? rawTheme

  const isDark = React.useMemo(() => {
    if (typeof window === "undefined") return initialTheme === "dark"
    if (currentTheme === "dark") return true
    if (currentTheme === "light") return false
    return window.matchMedia("(prefers-color-scheme: dark)").matches
  }, [currentTheme, initialTheme])

  const resolvedTheme: "light" | "dark" = isDark ? "dark" : "light"

  // Ensure cookie is in sync on initial mount
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem("pv_theme")
      if (stored && !document.cookie.includes("pv_theme=")) {
        document.cookie = `pv_theme=${stored}; path=/; max-age=31536000; SameSite=Lax`
      }
    } catch {
      // ignore
    }
  }, [])

  // Apply theme class directly to documentElement
  React.useEffect(() => {
    const root = document.documentElement
    if (isDark) {
      root.classList.add("dark")
    } else {
      root.classList.remove("dark")
    }
  }, [isDark])

  const setTheme = React.useCallback((newTheme: Theme) => {
    setLocalTheme(newTheme)
    try {
      localStorage.setItem("pv_theme", newTheme)
      document.cookie = `pv_theme=${newTheme}; path=/; max-age=31536000; SameSite=Lax`
    } catch {
      // ignore
    }
    const isDarkNow =
      newTheme === "dark" ||
      (newTheme === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)
    document.documentElement.classList.toggle("dark", isDarkNow)
  }, [])

  const toggleTheme = React.useCallback(() => {
    const next = resolvedTheme === "dark" ? "light" : "dark"
    setTheme(next)
  }, [resolvedTheme, setTheme])

  return (
    <ThemeContext.Provider
      value={{ theme: currentTheme, resolvedTheme, setTheme, toggleTheme }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = React.useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}
