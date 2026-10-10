"use client"

import * as React from "react"
import { OTPField } from "@base-ui/react/otp-field"
import { cn } from "@/lib/utils"

export interface OTPInputProps {
  value: string
  onChange: (value: string) => void
  length: number
  validationType?: "numeric" | "alphanumeric"
  normalizeValue?: (value: string) => string
  disabled?: boolean
  autoFocus?: boolean
  isError?: boolean
  isSuccess?: boolean
  groupAfter?: number
  className?: string
  slotClassName?: string
  size?: "sm" | "md" | "lg"
  id?: string
  ariaLabel?: string
}

export function OTPInput({
  value,
  onChange,
  length,
  validationType = "numeric",
  normalizeValue,
  disabled = false,
  isError = false,
  isSuccess = false,
  groupAfter,
  className,
  slotClassName,
  size = "md",
  id,
  ariaLabel,
}: OTPInputProps) {
  // Normalize default: uppercase for alphanumeric
  const normalizer =
    normalizeValue ||
    (validationType === "alphanumeric" ? (val: string) => val.toUpperCase() : undefined)

  const sizeClasses = {
    sm: "w-8 h-10 sm:w-9 sm:h-11 text-sm sm:text-base rounded-md",
    md: "w-10 h-12 sm:w-11 sm:h-12 text-base sm:text-lg rounded-md",
    lg: "w-12 h-13 sm:w-14 sm:h-14 text-xl sm:text-2xl rounded-md",
  }[size]

  const statusClasses = isError
    ? "border border-destructive bg-destructive/10 text-destructive focus-visible:ring-1 focus-visible:ring-destructive"
    : isSuccess
    ? "border-2 border-emerald-600 bg-emerald-50 dark:bg-emerald-100/90 text-[#022c22] dark:text-[#022c22] font-black focus-visible:ring-1 focus-visible:ring-emerald-700"
    : "border border-input bg-background text-foreground shadow-sm hover:border-input/80 focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring"

  const renderSlot = (index: number) => (
    <OTPField.Input
      key={index}
      className={cn(
        "m-0 flex items-center justify-center text-center font-mono font-bold tracking-tight shadow-sm transition-colors outline-none select-none",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        "disabled:cursor-not-allowed disabled:opacity-50",
        sizeClasses,
        statusClasses,
        slotClassName
      )}
      aria-label={
        index === 0
          ? ariaLabel || `Slot 1 of ${length}`
          : `Slot ${index + 1} of ${length}`
      }
    />
  )

  return (
    <OTPField.Root
      id={id}
      length={length}
      value={value}
      onValueChange={onChange}
      validationType={validationType}
      normalizeValue={normalizer}
      disabled={disabled}
      autoComplete="one-time-code"
      className={cn("inline-flex items-center gap-1.5 sm:gap-2", className)}
    >
      {groupAfter && groupAfter < length ? (
        <>
          <div className="flex items-center gap-1 sm:gap-1.5">
            {Array.from({ length: groupAfter }, (_, i) => renderSlot(i))}
          </div>
          <OTPField.Separator className="text-muted-foreground/60 font-semibold px-0.5 select-none text-xs sm:text-sm">
            —
          </OTPField.Separator>
          <div className="flex items-center gap-1 sm:gap-1.5">
            {Array.from({ length: length - groupAfter }, (_, i) =>
              renderSlot(groupAfter + i)
            )}
          </div>
        </>
      ) : (
        Array.from({ length }, (_, i) => renderSlot(i))
      )}
    </OTPField.Root>
  )
}
