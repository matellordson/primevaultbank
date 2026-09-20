import { cn } from "cn"
export { cn }
export type { ClassValue } from "cn"

/**
 * Format a number as USD currency string.
 * e.g. 1234.5 → "$1,234.50"
 */
export function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Format a compact number for KPI tiles.
 * e.g. 1234567 → "$1.23M"
 */
export function formatCurrencyCompact(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Formats a raw number or string input with thousands separators (commas)
 * while preserving in-progress decimal typing (e.g. "1234." -> "1,234.").
 */
export function formatAmountInput(value: string | number): string {
  if (value === "" || value === null || value === undefined) return ""
  const str = typeof value === "number" ? value.toString() : value
  // Remove anything that's not a digit or decimal point
  const clean = str.replace(/[^\d.]/g, "")
  if (!clean) return ""

  const parts = clean.split(".")
  const integerPart = parts[0]
  const decimalPart = parts.length > 1 ? parts.slice(1).join("").slice(0, 2) : null

  // If user started with decimal, e.g. ".5" -> "0.5"
  const formattedInteger =
    integerPart === "" ? "0" : integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",")

  if (decimalPart !== null) {
    return `${formattedInteger}.${decimalPart}`
  }
  return formattedInteger
}

/**
 * Extracts a pure float number from a comma-formatted string.
 * e.g. "1,234.50" -> 1234.5
 */
export function parseAmount(value: string | number): number {
  if (typeof value === "number") return value
  if (!value) return 0
  const clean = value.replace(/,/g, "").trim()
  const num = parseFloat(clean)
  return isNaN(num) ? 0 : num
}
