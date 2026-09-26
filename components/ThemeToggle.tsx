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
  return null
}
