"use client"

import * as React from "react"
import { Copy, Check } from "lucide-react"

export function CopyButton({
  text,
  className = "",
  title = "Copy to clipboard",
}: {
  text: string
  className?: string
  title?: string
}) {
  const [copied, setCopied] = React.useState(false)

  async function handleCopy(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback for older browsers or restricted contexts
      const textarea = document.createElement("textarea")
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand("copy")
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer p-1 rounded hover:bg-muted ${className}`}
      title={title}
      aria-label={title}
    >
      {copied ? (
        <>
          <Check className="size-3.5 text-emerald-500" />
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Copied</span>
        </>
      ) : (
        <>
          <Copy className="size-3.5" />
          <span className="sr-only">Copy</span>
        </>
      )}
    </button>
  )
}
