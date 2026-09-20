"use client"

import * as React from "react"
import { useTheme } from "@/components/theme-provider"
import { Moon, Sun } from "lucide-react"

function subscribeMount() {
  return () => {}
}

function getMountSnapshot() {
  return true
}

function getServerMountSnapshot() {
  return false
}

export function ThemeToggle({
  className = "",
  showLabel = false,
}: {
  className?: string
  showLabel?: boolean
}) {
  const { resolvedTheme, toggleTheme } = useTheme()
  const mounted = React.useSyncExternalStore(
    subscribeMount,
    getMountSnapshot,
    getServerMountSnapshot
  )

  if (!mounted) {
    return (
      <div
        className={`flex items-center justify-center size-9 rounded-md border border-border/80 bg-muted/30 text-muted-foreground ${className}`}
        aria-hidden="true"
      >
        <span className="size-4" />
      </div>
    )
  }

  const isDark = resolvedTheme === "dark"

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`flex items-center justify-center gap-2 rounded-lg border border-border/80 bg-muted/40 hover:bg-muted text-foreground transition-all duration-200 cursor-pointer ${
        showLabel ? "px-3 py-2 text-sm font-medium" : "size-9"
      } ${className}`}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
    >
      {isDark ? (
        <Sun className="size-4.5 text-amber-400 transition-transform duration-300 hover:rotate-45" />
      ) : (
        <Moon className="size-4.5 text-slate-700 transition-transform duration-300 hover:-rotate-12" />
      )}
      {showLabel && (
        <span className="text-xs font-medium">
          {isDark ? "Light Mode" : "Dark Mode"}
        </span>
      )}
    </button>
  )
}
