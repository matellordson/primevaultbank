"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { Sparkles, ShieldCheck, Copy, Check, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface WelcomeModalProps {
  fullName: string
  accountNumber?: string
  accountType?: string
  onClose: () => void
}

export function WelcomeModal({
  fullName,
  accountNumber = "10984210",
  accountType = "Prime Checking",
  onClose,
}: WelcomeModalProps) {
  const router = useRouter()
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(accountNumber)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleStartKyc = () => {
    onClose()
    router.push("/kyc")
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 text-center shadow-2xl text-slate-900">
        {/* Celebration Badge */}
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 shadow-sm">
          <Sparkles className="size-8" />
        </div>

        <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-1.5">
          Welcome to PrimeVault Bank!
        </h2>
        <p className="text-sm text-slate-600 mb-6">
          Congratulations <strong className="text-slate-900 font-semibold">{fullName || "Valued Customer"}</strong>, your application has been processed and your account portfolio is ready.
        </p>

        {/* Account Details Box */}
        <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left space-y-3">
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span className="text-slate-500 font-medium">Account Number</span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-slate-900">{accountNumber}</span>
              <button
                type="button"
                onClick={handleCopy}
                className="text-slate-400 hover:text-slate-700 transition-colors"
                title="Copy account number"
              >
                {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span className="text-slate-500 font-medium">Routing / SWIFT</span>
            <span className="font-mono text-slate-700 font-medium">021000021 / PVLTUS33XXX</span>
          </div>

          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span className="text-slate-500 font-medium">Account Type</span>
            <span className="font-semibold text-slate-800">{accountType}</span>
          </div>

          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span className="text-slate-500 font-medium">Initial Balance</span>
            <span className="font-bold text-blue-600 font-mono text-sm">$0.00</span>
          </div>

          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span className="text-slate-500 font-medium">Account Status</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 uppercase tracking-wide">
              <span className="size-1.5 rounded-full bg-amber-500" />
              Non - Active
            </span>
          </div>
        </div>

        {/* Anti-fraud / Non-active notice */}
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-3.5 text-left text-xs leading-relaxed text-amber-800">
          <ShieldCheck className="size-5 shrink-0 text-amber-600 mt-0.5" />
          <span>
            As a standard banking security measure, all newly registered accounts strictly start with <strong>$0.00</strong> in <strong>Non-Active</strong> status. Please complete identity verification (KYC) to activate higher limits and full deposit access.
          </span>
        </div>

        <div className="flex flex-col gap-2.5">
          <Button
            onClick={handleStartKyc}
            className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-600/20 gap-2"
          >
            <ShieldCheck className="size-4" />
            Complete Identity Verification (KYC)
            <ArrowRight className="size-4" />
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full h-10 border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold text-sm"
          >
            Proceed to Dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}
