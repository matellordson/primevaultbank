"use client"

import React, { useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
  Bell,
  Eye,
  EyeOff,
  Copy,
  Check,
  ShieldCheck,
  Plus,
  Send,
  CreditCard,
  Building,
  ArrowRight,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  Lock,
  Unlock,
  Sparkles,
  Printer,
  RotateCw,
  Wifi,
  Globe,
  Sliders,
  DollarSign,
  TrendingUp,
  X,
  FileText,
  Users,
  UserPlus,
  Trash2,
} from "lucide-react"
import { WelcomeModal } from "@/components/WelcomeModal"
import { FloatingSupportChat } from "@/components/FloatingSupportChat"
import { formatCurrency } from "@/lib/utils"


interface DashboardClientProps {
  user: {
    id: string
    name: string
    email: string
    role: string
    accounts: Array<{
      id: string
      accountNumber: string
      accountType: string
      balance: any
      status: string
    }>
  }
  transactions: any[]
}

export function DashboardClient({ user, transactions }: DashboardClientProps) {
  const searchParams = useSearchParams()
  const showWelcomeInitial = searchParams.get("welcome") === "1"
  const kycSuccess = searchParams.get("kyc") === "success"

  const [showWelcome, setShowWelcome] = useState(showWelcomeInitial)
  const [hideBalance, setHideBalance] = useState(false)
  const [copiedAcc, setCopiedAcc] = useState(false)
  const [showStatementModal, setShowStatementModal] = useState(false)

  // Dual account switcher: CHECKING vs SAVINGS
  const [activeAccountType, setActiveAccountType] = useState<"CHECKING" | "SAVINGS">("CHECKING")

  // ATM / Debit Card Hub Interactive States
  const [cardFlipped, setCardFlipped] = useState(false)
  const [cardFrozen, setCardFrozen] = useState(false)
  const [showCardDetails, setShowCardDetails] = useState(false)
  const [copiedCardNumber, setCopiedCardNumber] = useState(false)
  const [onlinePaymentsEnabled, setOnlinePaymentsEnabled] = useState(true)
  const [intlPaymentsEnabled, setIntlPaymentsEnabled] = useState(true)
  const [atmWithdrawalsEnabled, setAtmWithdrawalsEnabled] = useState(true)

  const checkingAcc = user.accounts.find((a) => a.accountType === "CHECKING") || user.accounts[0]
  const savingsAcc = user.accounts.find((a) => a.accountType === "SAVINGS") || user.accounts[1]

  const currentAcc = activeAccountType === "CHECKING" ? checkingAcc : savingsAcc

  // Calculate Inflow & Outflow from transactions
  const totalInflow = transactions
    .filter((tx) => tx.type === "DEPOSIT_REQUEST" || tx.type === "MANUAL_DEPOSIT")
    .reduce((sum, tx) => sum + Number(tx.amount), 0)

  const totalOutflow = transactions
    .filter((tx) => tx.type === "INTERNAL_TRANSFER" || tx.type === "EXTERNAL_WIRE")
    .reduce((sum, tx) => sum + Number(tx.amount), 0)

  // Account is Active when KYC is completed
  const isKycVerified = kycSuccess || checkingAcc?.status === "ACTIVE"

  const handleCopyAcc = () => {
    if (!currentAcc?.accountNumber) return
    navigator.clipboard.writeText(currentAcc.accountNumber)
    setCopiedAcc(true)
    setTimeout(() => setCopiedAcc(false), 2000)
  }

  const handleCopyCard = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText("4532892010487512")
    setCopiedCardNumber(true)
    setTimeout(() => setCopiedCardNumber(false), 2000)
  }

  const statementDate = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
  const statementPeriod = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })

  const handlePrintStatement = () => {
    setShowStatementModal(true)
  }

  // Beneficiary Hub state
  const [beneficiaries, setBeneficiaries] = React.useState<Array<{
    id: string
    name: string
    bank: string
    account: string
    type: "internal" | "wire"
  }>>(() => {
    if (typeof window === "undefined") return []
    try {
      return JSON.parse(localStorage.getItem("pv_beneficiaries") || "[]")
    } catch {
      return []
    }
  })
  const [showAddBeneficiary, setShowAddBeneficiary] = React.useState(false)
  const [beneForm, setBeneForm] = React.useState({ name: "", bank: "", account: "", type: "internal" as "internal" | "wire" })

  const saveBeneficiary = () => {
    if (!beneForm.name.trim() || !beneForm.account.trim()) return
    const newBene = { ...beneForm, id: Date.now().toString() }
    const updated = [...beneficiaries, newBene]
    setBeneficiaries(updated)
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("pv_beneficiaries", JSON.stringify(updated))
      } catch {}
    }
    setBeneForm({ name: "", bank: "", account: "", type: "internal" })
    setShowAddBeneficiary(false)
  }

  const deleteBeneficiary = (id: string) => {
    const updated = beneficiaries.filter((b) => b.id !== id)
    setBeneficiaries(updated)
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("pv_beneficiaries", JSON.stringify(updated))
      } catch {}
    }
  }

  const initials = user.name
    ? user.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "PV"

  return (
    <div className="space-y-6 pb-16 font-sans">
      {/* Top Bar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
              Good day, {user.name.split(" ")[0] || "Valued Client"}
            </h1>
            <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 border border-blue-200">
              Private Client
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            PrimeVault Wealth Management • FDIC Insured Portfolio
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Print Statement Button */}
          <button
            type="button"
            onClick={handlePrintStatement}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
            title="Print Official Account Statement"
          >
            <Printer className="size-3.5 text-slate-500" />
            <span className="hidden sm:inline">Statement</span>
          </button>


          {/* Notification Bell */}

          <button
            type="button"
            onClick={() =>
              alert(
                "PrimeVault Security Center:\n• Welcome to PrimeVault Bank! Your accounts are initialized.\n• Complete KYC Identity Verification to activate full deposit and wire access."
              )
            }
            className="relative flex size-9 items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors shadow-sm"
            aria-label="Notifications"
          >
            <Bell className="size-4" />
            <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-blue-600 ring-2 ring-white" />
          </button>

          {/* User Initials Avatar */}
          <div
            title={user.name}
            className="flex size-9 items-center justify-center rounded-xl bg-blue-600 font-bold text-xs text-white shadow-sm cursor-pointer"
          >
            {initials}
          </div>
        </div>
      </div>

      {/* KYC Alert Banner (if not yet verified) */}
      {!isKycVerified && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-blue-200 bg-blue-50/80 p-4 sm:p-5 shadow-sm">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="flex size-10 sm:size-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 mt-0.5 sm:mt-0">
              <ShieldCheck className="size-5 sm:size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-900">Identity Clearance Required</h4>
                <span className="rounded-full bg-amber-100 border border-amber-300 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                  Tier-1 Pending
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                Accounts strictly begin at $0.00 in Non-Active state until KYC identity clearance is approved.
              </p>
            </div>
          </div>
          <Link
            href="/kyc"
            className="flex items-center justify-center gap-1.5 w-full sm:w-auto shrink-0 whitespace-nowrap rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 sm:py-2 text-xs font-bold transition-all shadow-md shadow-blue-600/20 active:scale-98"
          >
            <span>Complete Verification</span>
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      )}

      {/* Main Account Balance Card with Dual Account Switcher */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-[#0F172A] p-6 sm:p-8 text-white shadow-xl">
        {/* Dual Account Tabs */}
        <div className="flex items-center gap-2 mb-6">
          <button
            type="button"
            onClick={() => setActiveAccountType("CHECKING")}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
              activeAccountType === "CHECKING"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white/10 text-slate-300 hover:bg-white/15 hover:text-white"
            }`}
          >
            <CreditCard className="size-3.5" />
            <span>Prime Checking</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveAccountType("SAVINGS")}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
              activeAccountType === "SAVINGS"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white/10 text-slate-300 hover:bg-white/15 hover:text-white"
            }`}
          >
            <TrendingUp className="size-3.5 text-emerald-400" />
            <span>High-Yield Vault (4.85% APY)</span>
          </button>
        </div>

        {/* Balance Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 uppercase font-semibold tracking-wider mb-1">
              <span>{activeAccountType === "CHECKING" ? "Checking Account Balance" : "High-Yield Vault Balance"}</span>
              <button
                type="button"
                onClick={() => setHideBalance(!hideBalance)}
                className="text-slate-400 hover:text-white transition-colors"
                title={hideBalance ? "Show balance" : "Hide balance"}
              >
                {hideBalance ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </button>
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold tracking-tight font-mono text-white">
              {hideBalance ? "••••••••" : `$ ${Number(currentAcc?.balance || 0).toFixed(2)}`}
            </div>
            {activeAccountType === "SAVINGS" && (
              <div className="flex items-center gap-2 mt-1.5 text-xs text-emerald-400 font-medium">
                <Sparkles className="size-3.5" />
                <span>Earning 4.85% Annual APY • Compounded Daily</span>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:items-end gap-1.5">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider self-start sm:self-auto ${
                isKycVerified
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
              }`}
            >
              <span
                className={`size-2 rounded-full ${
                  isKycVerified ? "bg-emerald-400" : "bg-amber-400 animate-pulse"
                }`}
              />
              {isKycVerified ? "Active" : "KYC Required"}
            </span>
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <span className="text-slate-400">Account:</span>
              <span className="font-mono font-bold text-white tracking-wider">
                {currentAcc?.accountNumber || "7558355128"}
              </span>
              <button
                type="button"
                onClick={handleCopyAcc}
                className="text-slate-400 hover:text-white transition-colors"
                title="Copy account number"
              >
                {copiedAcc ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <Link
            href="/deposits"
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 py-3 text-sm font-semibold text-white transition-all shadow-sm active:scale-98"
          >
            <Plus className="size-4" />
            <span>Add Money</span>
          </Link>
          <Link
            href="/transfers"
            className="flex items-center justify-center gap-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 py-3 text-sm font-semibold text-white transition-all shadow-sm active:scale-98"
          >
            <Send className="size-4 text-blue-300" />
            <span>Send Money</span>
          </Link>
        </div>
      </div>

      {/* Cashflow Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Inflow</div>
            <div className="text-lg font-bold font-mono text-emerald-600">
              + {formatCurrency(totalInflow)}
            </div>
          </div>
          <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <ArrowDownLeft className="size-5" />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Outflow</div>
            <div className="text-lg font-bold font-mono text-slate-900">
              - {formatCurrency(totalOutflow)}
            </div>
          </div>
          <div className="flex size-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
            <ArrowUpRight className="size-5" />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Net Position</div>
            <div className="text-lg font-bold font-mono text-blue-600">
              {formatCurrency(totalInflow - totalOutflow)}
            </div>
          </div>
          <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <DollarSign className="size-5" />
          </div>
        </div>
      </div>

      {/* BESPOKE DEDICATED ATM / DEBIT CARD HUB */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <CreditCard className="size-5 text-blue-600" />
              <h3 className="text-lg font-bold text-slate-900">PrimeVault Visa Signature Card</h3>
            </div>
            <p className="text-xs text-slate-500">
              Interactive contactless debit card • Tap card or use buttons to flip and manage credentials
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCardFlipped(!cardFlipped)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors"
            >
              <RotateCw className="size-3.5 text-blue-600" />
              <span>{cardFlipped ? "View Front" : "View Back (CVV)"}</span>
            </button>
          </div>
        </div>

        {/* 3D Physical Card Showcase + In-Place Controls Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Card Presentation Container (5 cols on lg) */}
          <div className="lg:col-span-6 flex flex-col items-center">
            {/* 3D Flip Wrapper */}
            <div
              onClick={() => setCardFlipped(!cardFlipped)}
              className="relative w-full max-w-[380px] h-[225px] cursor-pointer select-none"
              style={{ perspective: "1000px" }}
              title="Click to flip card"
            >
              <div
                className="relative w-full h-full rounded-2xl transition-transform duration-700 shadow-2xl"
                style={{
                  transformStyle: "preserve-3d",
                  transform: cardFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                }}
              >
                {/* ── CARD FRONT ── */}
                <div
                  className={`absolute inset-0 rounded-2xl border p-5 flex flex-col justify-between overflow-hidden transition-all duration-300 ${
                    cardFrozen
                      ? "border-blue-400/40 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-950 text-white"
                      : "border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white"
                  }`}
                  style={{ backfaceVisibility: "hidden" }}
                >
                  {/* Subtle sapphire radial shine */}
                  <div className="absolute -top-16 -right-16 size-44 rounded-full bg-blue-600/20 blur-2xl pointer-events-none" />

                  {/* Frozen Ice Overlay */}
                  {cardFrozen && (
                    <div className="absolute inset-0 bg-blue-950/70 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center gap-1 border-2 border-blue-400/60 rounded-2xl">
                      <Lock className="size-6 text-blue-300 animate-pulse" />
                      <span className="text-xs font-mono font-bold tracking-widest text-blue-200 uppercase">
                        CARD TEMPORARILY FROZEN
                      </span>
                    </div>
                  )}

                  {/* Header: Logo & Status Badge */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-sm tracking-widest font-extrabold text-white">
                        PRIMEVAULT
                      </span>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        cardFrozen
                          ? "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                          : isKycVerified
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      }`}
                    >
                      <span
                        className={`size-1.5 rounded-full ${
                          cardFrozen ? "bg-blue-400" : isKycVerified ? "bg-emerald-400" : "bg-amber-400"
                        }`}
                      />
                      {cardFrozen ? "Frozen" : isKycVerified ? "Active" : "KYC Req."}
                    </span>
                  </div>

                  {/* Chip & Contactless */}
                  <div className="flex items-center justify-between my-1">
                    {/* Metallic Gold EMV Chip */}
                    <div className="w-11 h-8 rounded-md bg-gradient-to-tr from-amber-400 via-amber-200 to-amber-500 p-[1.5px] shadow-md">
                      <div className="w-full h-full rounded border border-amber-800/40 bg-amber-400/90 flex flex-col justify-between p-1">
                        <div className="w-full h-0.5 bg-amber-700/50" />
                        <div className="w-full h-0.5 bg-amber-700/50" />
                      </div>
                    </div>
                    <Wifi className="size-5 text-slate-400 rotate-90" />
                  </div>

                  {/* Card Number */}
                  <div className="flex items-center justify-between">
                    <div className="font-mono text-base sm:text-lg tracking-widest text-white font-bold">
                      {showCardDetails ? "4532  8920  1048  7512" : "••••  ••••  ••••  7512"}
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyCard}
                      className="text-slate-400 hover:text-white transition-colors p-1"
                      title="Copy Card Number"
                    >
                      {copiedCardNumber ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                    </button>
                  </div>

                  {/* Footer: Cardholder Name, Expiry & Visa Logo */}
                  <div className="flex items-end justify-between text-xs font-mono pt-1">
                    <div>
                      <div className="text-[9px] text-slate-400 uppercase tracking-wider">Cardholder</div>
                      <div className="font-bold text-slate-100 uppercase tracking-wider text-xs">
                        {user.name}
                      </div>
                    </div>

                    <div className="text-center">
                      <div className="text-[9px] text-slate-400 uppercase tracking-wider">Expires</div>
                      <div className="font-bold text-slate-200">09/31</div>
                    </div>

                    <div className="text-right">
                      <span className="font-extrabold italic text-sm tracking-wider text-white">
                        VISA
                      </span>
                      <span className="block text-[8px] font-sans font-semibold tracking-tighter text-blue-300">
                        Signature
                      </span>
                    </div>
                  </div>
                </div>

                {/* ── CARD BACK ── */}
                <div
                  className="absolute inset-0 rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex flex-col justify-between overflow-hidden"
                  style={{
                    backfaceVisibility: "hidden",
                    transform: "rotateY(180deg)",
                  }}
                >
                  {/* Magnetic Stripe */}
                  <div className="w-full h-10 bg-black mt-4" />

                  {/* Signature Strip & CVV */}
                  <div className="px-5 space-y-2">
                    <div className="flex items-center justify-between text-[9px] text-slate-400 uppercase">
                      <span>Authorized Signature</span>
                      <span>Security Code</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-8 bg-slate-200 rounded text-slate-800 font-serif italic text-xs flex items-center px-3 tracking-widest select-none">
                        {user.name}
                      </div>
                      <div className="w-14 h-8 bg-white rounded border border-slate-300 text-slate-900 font-mono font-bold text-sm flex items-center justify-center">
                        {showCardDetails ? "482" : "•••"}
                      </div>
                    </div>
                  </div>

                  {/* Card Back Legal Info & Hologram */}
                  <div className="px-5 pb-4 flex items-center justify-between text-[9px] text-slate-400 leading-tight">
                    <div className="max-w-[220px]">
                      Issued by PrimeVault Financial. 24/7 International Client Support: +1 (800) 842-1090.
                    </div>
                    <div className="size-6 rounded-full bg-gradient-to-tr from-amber-400 to-blue-500 opacity-80" />
                  </div>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 mt-2 text-center">
              Click the card to flip between front credentials and security CVV
            </p>
          </div>

          {/* Quick Card Controls & Security Toggles (6 cols on lg) */}
          <div className="lg:col-span-6 space-y-4">
            {/* Primary Action Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setCardFrozen(!cardFrozen)}
                className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 px-3 text-xs font-bold transition-all shadow-sm ${
                  cardFrozen
                    ? "bg-blue-50 border-blue-200 text-blue-700"
                    : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                }`}
              >
                {cardFrozen ? <Unlock className="size-3.5 text-blue-600" /> : <Lock className="size-3.5 text-slate-600" />}
                <span>{cardFrozen ? "Unfreeze" : "Freeze Card"}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowCardDetails(!showCardDetails)}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 py-2.5 px-3 text-xs font-bold text-slate-700 transition-colors shadow-sm"
              >
                {showCardDetails ? <EyeOff className="size-3.5 text-slate-500" /> : <Eye className="size-3.5 text-emerald-600" />}
                <span>{showCardDetails ? "Hide Numbers" : "Show Numbers"}</span>
              </button>

              <button
                type="button"
                onClick={handleCopyCard}
                className="col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 py-2.5 px-3 text-xs font-bold text-slate-700 transition-colors shadow-sm"
              >
                {copiedCardNumber ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5 text-slate-500" />}
                <span>{copiedCardNumber ? "Copied" : "Copy 16 Digits"}</span>
              </button>
            </div>

            {/* Spend Limit Tracker */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">Monthly Card Spend Limit</span>
                <span className="font-mono font-bold text-slate-900">$10,000.00</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                <div className="h-full w-[0%] bg-blue-600 rounded-full" />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Spent: $0.00</span>
                <span className="text-emerald-600 font-medium">Available: $10,000.00</span>
              </div>
            </div>

            {/* Card Security Switches */}
            <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between p-3 text-xs">
                <div className="flex items-center gap-2">
                  <Globe className="size-4 text-slate-500" />
                  <div>
                    <div className="font-semibold text-slate-800">Online &amp; E-Commerce Payments</div>
                    <div className="text-[10px] text-slate-500">Authorize web transactions and subscriptions</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOnlinePaymentsEnabled(!onlinePaymentsEnabled)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                    onlinePaymentsEnabled ? "bg-blue-600" : "bg-slate-200"
                  }`}
                >
                  <span
                    className={`inline-block size-4 transform rounded-full bg-white shadow-sm transition duration-200 ${
                      onlinePaymentsEnabled ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-3 text-xs">
                <div className="flex items-center gap-2">
                  <Building className="size-4 text-slate-500" />
                  <div>
                    <div className="font-semibold text-slate-800">ATM Cash Withdrawals</div>
                    <div className="text-[10px] text-slate-500">Permit physical ATM cash dispensations</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAtmWithdrawalsEnabled(!atmWithdrawalsEnabled)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                    atmWithdrawalsEnabled ? "bg-blue-600" : "bg-slate-200"
                  }`}
                >
                  <span
                    className={`inline-block size-4 transform rounded-full bg-white shadow-sm transition duration-200 ${
                      atmWithdrawalsEnabled ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-3 text-xs">
                <div className="flex items-center gap-2">
                  <Sliders className="size-4 text-slate-500" />
                  <div>
                    <div className="font-semibold text-slate-800">International Roaming</div>
                    <div className="text-[10px] text-slate-500">Accept transactions outside home currency</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIntlPaymentsEnabled(!intlPaymentsEnabled)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                    intlPaymentsEnabled ? "bg-blue-600" : "bg-slate-200"
                  }`}
                >
                  <span
                    className={`inline-block size-4 transform rounded-full bg-white shadow-sm transition duration-200 ${
                      intlPaymentsEnabled ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Access Grid */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-slate-900 tracking-tight">Quick Banking Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link
            href={isKycVerified ? "/deposits" : "/kyc"}
            className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-5 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm group relative"
          >
            {!isKycVerified && (
              <span className="absolute top-2.5 right-2.5 rounded-full bg-amber-100 border border-amber-300 px-1.5 py-0.5 text-[9px] font-bold text-amber-800">
                KYC Req
              </span>
            )}
            <div className="flex size-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 group-hover:scale-105 transition-transform">
              <Plus className="size-6 stroke-[2.5]" />
            </div>
            <span className="text-xs font-bold text-slate-800">Add Cash</span>
          </Link>

          <Link
            href={isKycVerified ? "/transfers" : "/kyc"}
            className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-5 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm group relative"
          >
            {!isKycVerified && (
              <span className="absolute top-2.5 right-2.5 rounded-full bg-amber-100 border border-amber-300 px-1.5 py-0.5 text-[9px] font-bold text-amber-800">
                KYC Req
              </span>
            )}
            <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 group-hover:scale-105 transition-transform">
              <Send className="size-5" />
            </div>
            <span className="text-xs font-bold text-slate-800">Transfer</span>
          </Link>

          <Link
            href={isKycVerified ? "/transfers" : "/kyc"}
            className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-5 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm group relative"
          >
            {!isKycVerified && (
              <span className="absolute top-2.5 right-2.5 rounded-full bg-amber-100 border border-amber-300 px-1.5 py-0.5 text-[9px] font-bold text-amber-800">
                KYC Req
              </span>
            )}
            <div className="flex size-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 group-hover:scale-105 transition-transform">
              <Building className="size-5" />
            </div>
            <span className="text-xs font-bold text-slate-800">Wire Clearing</span>
          </Link>

          <button
            type="button"
            onClick={handlePrintStatement}
            className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-5 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm group"
          >
            <div className="flex size-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 group-hover:scale-105 transition-transform">
              <Printer className="size-5" />
            </div>
            <span className="text-xs font-bold text-slate-800">Statements</span>
          </button>
        </div>
      </div>

      {/* Saved Beneficiaries Hub */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-blue-600" />
            <h3 className="text-base font-bold text-slate-900 tracking-tight">Saved Beneficiaries</h3>
          </div>
          <button
            type="button"
            onClick={() => setShowAddBeneficiary(true)}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 text-xs font-bold transition-colors shadow-sm"
          >
            <UserPlus className="size-3.5" />
            <span>Add Beneficiary</span>
          </button>
        </div>

        {beneficiaries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center shadow-sm">
            <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-slate-100">
              <Users className="size-6 text-slate-400" />
            </div>
            <p className="text-sm font-bold text-slate-700">No saved beneficiaries</p>
            <p className="text-xs text-slate-500 mt-1">Save payees to quickly initiate transfers without re-entering details.</p>
            <button
              type="button"
              onClick={() => setShowAddBeneficiary(true)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors"
            >
              <UserPlus className="size-3.5" />
              <span>Add Your First Beneficiary</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {beneficiaries.map((b) => (
              <div key={b.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-blue-300 transition-colors group">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 font-bold text-sm">
                  {b.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-slate-900 truncate">{b.name}</div>
                  <div className="text-[11px] text-slate-500 truncate">{b.bank || (b.type === "internal" ? "PrimeVault Internal" : "External Wire")}</div>
                  <div className="text-[10px] font-mono text-slate-400">••••{b.account.slice(-4)}</div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className={`text-[9px] font-bold uppercase rounded-full px-1.5 py-0.5 ${
                    b.type === "internal" ? "bg-blue-50 text-blue-700 border border-blue-200" : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                  }`}>
                    {b.type === "internal" ? "Internal" : "Wire"}
                  </span>
                  <div className="flex items-center gap-1">
                    <Link
                      href={b.type === "internal"
                        ? `/transfers?type=internal&account=${encodeURIComponent(b.account)}`
                        : `/transfers?type=wire&name=${encodeURIComponent(b.name)}&bank=${encodeURIComponent(b.bank)}&account=${encodeURIComponent(b.account)}`}
                      className="flex items-center gap-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 text-[10px] font-bold transition-colors"
                    >
                      <Send className="size-2.5" />
                      <span>Send</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => deleteBeneficiary(b.id)}
                      className="flex items-center justify-center rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 size-6 transition-colors"
                      title="Remove beneficiary"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Transactions Section */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-slate-900 tracking-tight">Recent Transactions</h3>
        {transactions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-slate-500 space-y-2 shadow-sm">
            <Clock className="mx-auto size-8 text-slate-400" />
            <p className="text-sm font-bold text-slate-900">No transaction records yet</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {isKycVerified
                ? "Your portfolio is verified and active. Fund your account with an initial deposit to view ledgers."
                : "Complete KYC verification to unlock routing credentials and outbound wire clearing."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            {transactions.slice(0, 5).map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                    <ArrowDownLeft className="size-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      {tx.recipientName || tx.description || tx.type.replace(/_/g, " ")}
                    </div>
                    <div className="text-[11px] font-mono text-slate-500">
                      Ref: {tx.referenceId}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold font-mono text-slate-900">
                    {formatCurrency(Number(tx.amount))}
                  </div>
                  <span className="text-[10px] text-emerald-600 font-bold uppercase">
                    {tx.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Beneficiary Modal */}
      {showAddBeneficiary && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div className="flex items-center gap-2">
                <UserPlus className="size-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Add New Beneficiary</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddBeneficiary(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Type selector */}
              <div className="flex rounded-lg bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setBeneForm((f) => ({ ...f, type: "internal", bank: "" }))}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-bold transition-all ${
                    beneForm.type === "internal" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Internal Transfer
                </button>
                <button
                  type="button"
                  onClick={() => setBeneForm((f) => ({ ...f, type: "wire" }))}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-bold transition-all ${
                    beneForm.type === "wire" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  External Wire
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Full Name *</label>
                  <input
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="e.g. Sarah Jenkins"
                    value={beneForm.name}
                    onChange={(e) => setBeneForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                {beneForm.type === "wire" && (
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Bank Name</label>
                    <input
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      placeholder="e.g. Chase Bank, Barclays"
                      value={beneForm.bank}
                      onChange={(e) => setBeneForm((f) => ({ ...f, bank: e.target.value }))}
                    />
                  </div>
                )}
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    {beneForm.type === "internal" ? "PrimeVault 10-Digit Account Number *" : "Account / IBAN Number *"}
                  </label>
                  <input
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder={beneForm.type === "internal" ? "e.g. 1048291038" : "e.g. GB29NWBK60161331926819"}
                    value={beneForm.account}
                    onChange={(e) => setBeneForm((f) => ({ ...f, account: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddBeneficiary(false)}
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveBeneficiary}
                  disabled={!beneForm.name.trim() || !beneForm.account.trim()}
                  className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 py-2.5 text-sm font-bold text-white transition-colors shadow-sm"
                >
                  Save Beneficiary
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <FloatingSupportChat />

      {/* Welcome Modal Popup on registration redirect */}
      {showWelcome && (
        <WelcomeModal
          fullName={user.name}
          accountNumber={checkingAcc?.accountNumber || "10984210"}
          accountType={checkingAcc?.accountType || "Checking Account"}
          onClose={() => setShowWelcome(false)}
        />
      )}

      {/* Account Statement Modal */}
      {showStatementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative flex h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div className="flex items-center gap-2">
                <FileText className="size-5 text-blue-600" />
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Account Statement</h2>
                  <p className="text-xs text-slate-500">{statementPeriod}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Printer className="size-3.5" />
                  Print PDF
                </button>
                <button
                  type="button"
                  onClick={() => setShowStatementModal(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            {/* Statement Body — scrollable */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {/* Bank Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="size-7 rounded-lg bg-blue-600 flex items-center justify-center">
                      <span className="text-white text-[10px] font-black">PV</span>
                    </div>
                    <span className="font-extrabold text-slate-900 tracking-tight">PrimeVault Bank</span>
                  </div>
                  <p className="text-[11px] text-slate-500">FDIC Member • Equal Housing Lender</p>
                  <p className="text-[11px] text-slate-500">100 Financial Plaza, New York, NY 10004</p>
                </div>
                <div className="text-right text-[11px] text-slate-500 space-y-0.5">
                  <p className="font-semibold text-slate-700">Statement Date</p>
                  <p>{statementDate}</p>
                  <p className="font-semibold text-slate-700 mt-1">Period</p>
                  <p>{statementPeriod}</p>
                </div>
              </div>

              {/* Account Summary Card */}
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Account Holder</p>
                  <p className="font-bold text-slate-900 mt-0.5">{user.name}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Email</p>
                  <p className="font-medium text-slate-700 mt-0.5 truncate">{user.email}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Account Number</p>
                  <p className="font-bold font-mono text-slate-900 mt-0.5">
                    ••••{checkingAcc?.accountNumber?.slice(-4) || "0000"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Account Type</p>
                  <p className="font-bold text-slate-900 mt-0.5">Prime Checking</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Opening Balance</p>
                  <p className="font-bold text-slate-900 mt-0.5">$0.00</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Closing Balance</p>
                  <p className="font-bold text-blue-700 mt-0.5">
                    {formatCurrency(Number(checkingAcc?.balance ?? 0))}
                  </p>
                </div>
              </div>

              {/* Transaction Table */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-3">Transaction History</h3>
                {transactions.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center">
                    <FileText className="mx-auto mb-2 size-8 text-slate-300" />
                    <p className="text-sm font-semibold text-slate-500">No transactions this period</p>
                    <p className="text-xs text-slate-400 mt-0.5">Transactions will appear here once your account is active.</p>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-2.5 text-left font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                          <th className="px-4 py-2.5 text-left font-semibold text-slate-500 uppercase tracking-wide">Description</th>
                          <th className="px-4 py-2.5 text-right font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                          <th className="px-4 py-2.5 text-right font-semibold text-slate-500 uppercase tracking-wide">Amount</th>
                          <th className="px-4 py-2.5 text-right font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {transactions.map((tx, idx) => {
                          const isCredit = tx.type === "DEPOSIT_REQUEST" || tx.type === "MANUAL_DEPOSIT"
                          return (
                            <tr key={tx.id || idx} className="hover:bg-slate-50/70 transition-colors">
                              <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                                {tx.createdAt
                                  ? new Date(tx.createdAt).toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                    })
                                  : "—"}
                              </td>
                              <td className="px-4 py-3 text-slate-800 font-medium max-w-[160px] truncate">
                                {tx.description || tx.type?.replace(/_/g, " ") || "Transaction"}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span
                                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                                    isCredit
                                      ? "bg-emerald-50 text-emerald-700"
                                      : "bg-red-50 text-red-600"
                                  }`}
                                >
                                  {isCredit ? "Credit" : "Debit"}
                                </span>
                              </td>
                              <td
                                className={`px-4 py-3 text-right font-bold font-mono ${
                                  isCredit ? "text-emerald-700" : "text-red-600"
                                }`}
                              >
                                {isCredit ? "+" : "-"}{formatCurrency(Number(tx.amount))}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className="text-[10px] font-semibold uppercase text-slate-500">
                                  {tx.status || "COMPLETE"}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Footer Disclaimer */}
              <p className="text-[10px] text-slate-400 leading-relaxed border-t border-slate-100 pt-4">
                This statement is generated for informational purposes. PrimeVault Bank is a member of the FDIC.
                Deposits are insured up to $250,000 per depositor. For disputes or inquiries, contact support@primevaultbank.com.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

