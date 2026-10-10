"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { createInternalTransfer, createExternalWire } from "@/lib/actions/transfers"
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { OTPInput } from "@/components/ui/otp-input"
import {
  ArrowLeftRight,
  Globe,
  Building2,
  CheckCircle2,
  XCircle,
  Clock,
  Receipt,
  ArrowRight,
  AlertCircle,
  Info,
  ShieldAlert,
  ShieldCheck,
  KeyRound,
  Lock,
} from "lucide-react"
import { formatCurrency, formatAmountInput, parseAmount } from "@/lib/utils"

interface Account {
  id: string
  accountNumber: string
  accountType: string
  balance: number
  status: string
}

interface SecurityCodes {
  sortCode: string  // 4 digits — internal transfer branch gate
  bicCode: string   // 8 chars  — external wire BIC gate
  rvsCode: string   // 7 digits — reversal verification gate (all internal transfers)
  fwCode: string    // 3 digits — final withdrawal gate (both types)
}

interface TransferFormProps {
  accounts: Account[]
  minCheckingThreshold: number
  minSavingsThreshold: number
  minWithdrawalAmount?: number
  securityCodes?: SecurityCodes
}

export function TransferForm({
  accounts,
  minCheckingThreshold,
  minSavingsThreshold,
  minWithdrawalAmount = 10,
  securityCodes,
}: TransferFormProps) {
  const searchParams = useSearchParams()
  const qType = searchParams.get("type")
  const qAccount = searchParams.get("account") || ""
  const qName = searchParams.get("name") || ""
  const qBank = searchParams.get("bank") || ""

  const [transferType, setTransferType] = React.useState<"INTERNAL_TRANSFER" | "EXTERNAL_WIRE">(
    qType === "wire" ? "EXTERNAL_WIRE" : "INTERNAL_TRANSFER"
  )
  const [sourceAccountId, setSourceAccountId] = React.useState<string>(accounts[0]?.id || "")
  const [amount, setAmount] = React.useState("")
  const [description, setDescription] = React.useState("")

  // Internal
  const [recipientAccountNumber, setRecipientAccountNumber] = React.useState(qType !== "wire" ? qAccount : "")

  // External wire
  const [recipientName, setRecipientName] = React.useState(qName)
  const [recipientBank, setRecipientBank] = React.useState(qBank)
  const [recipientWireAccount, setRecipientWireAccount] = React.useState(qType === "wire" ? qAccount : "")
  const [recipientRoutingNumber, setRecipientRoutingNumber] = React.useState("")

  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [receipt, setReceipt] = React.useState<{
    referenceId: string
    isPending?: boolean
    message: string
    amountFormatted: string
    type: string
  } | null>(null)

  // ── Security code user inputs ──
  const [userSortCode, setUserSortCode] = React.useState("")
  const [userBicCode, setUserBicCode] = React.useState("")
  const [userRvsCode, setUserRvsCode] = React.useState("")
  const [userFwCode, setUserFwCode] = React.useState("")

  // Target security codes (configured by admin or fallback bank defaults)
  const targetSortCode = securityCodes?.sortCode || "4021"
  const targetBicCode = securityCodes?.bicCode || "PVLTUS33"
  const targetRvsCode = securityCodes?.rvsCode || "7192834"
  const targetFwCode = securityCodes?.fwCode || "842"

  // Gate active
  const sortCodeActive = Boolean(targetSortCode)
  const bicCodeActive = Boolean(targetBicCode)
  const rvsCodeActive = Boolean(targetRvsCode)
  const fwCodeActive = Boolean(targetFwCode)

  // Gate correctness
  const sortCodeCorrect = !sortCodeActive || userSortCode === targetSortCode
  const bicCodeCorrect = !bicCodeActive || userBicCode === targetBicCode
  const rvsCodeCorrect = !rvsCodeActive || userRvsCode === targetRvsCode
  const fwCodeCorrect = !fwCodeActive || userFwCode === targetFwCode

  const selectedSource = accounts.find((a) => a.id === sourceAccountId)
  const minReserve = selectedSource?.accountType === "SAVINGS" ? minSavingsThreshold : minCheckingThreshold
  const maxTransferable = selectedSource ? Math.max(0, selectedSource.balance - minReserve) : 0

  // Real-time amount conditions
  const numericAmount = parseAmount(amount)
  const hasEnteredAmount = amount.trim().length > 0
  const condPositiveAmount = numericAmount >= minWithdrawalAmount
  const condWithinBalance = selectedSource ? numericAmount <= selectedSource.balance : true
  const condMeetsReserve = selectedSource
    ? selectedSource.balance - numericAmount >= minReserve
    : true
  const isAmountValid =
    hasEnteredAmount && condPositiveAmount && condWithinBalance && condMeetsReserve
  const remainingBalance = selectedSource ? selectedSource.balance - numericAmount : 0

  // Real-time recipient conditions (internal)
  const trimmedRecipientAcc = recipientAccountNumber.trim()
  const hasEnteredRecipientAcc = trimmedRecipientAcc.length > 0
  const condRecipientDigitsOnly = /^\d+$/.test(trimmedRecipientAcc)
  const condRecipientLength = trimmedRecipientAcc.length === 10
  const condNotOwnAccount = selectedSource ? selectedSource.accountNumber !== trimmedRecipientAcc : true
  const isInternalRecipientValid =
    hasEnteredRecipientAcc && condRecipientDigitsOnly && condRecipientLength && condNotOwnAccount

  // Real-time wire conditions (external)
  const condWireName = recipientName.trim().length >= 2
  const condWireBank = recipientBank.trim().length >= 2
  const condWireAcc = recipientWireAccount.trim().length >= 4
  const isExternalValid = condWireName && condWireBank && condWireAcc

  // Prior steps validity before FW code
  const priorStepValid =
    isAmountValid &&
    (transferType === "INTERNAL_TRANSFER"
      ? isInternalRecipientValid && rvsCodeCorrect && sortCodeCorrect
      : isExternalValid && bicCodeCorrect)

  // Overall form validity — must pass all prior steps + final withdrawal code
  const isFormValid = priorStepValid && fwCodeCorrect

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const parsedAmount = parseAmount(amount)
    if (parsedAmount <= 0) {
      setError("Please enter a valid transfer amount.")
      setLoading(false)
      return
    }

    let res
    if (transferType === "INTERNAL_TRANSFER") {
      res = await createInternalTransfer({
        sourceAccountId,
        amount: parsedAmount,
        description,
        recipientAccountNumber,
      })
    } else {
      res = await createExternalWire({
        sourceAccountId,
        amount: parsedAmount,
        description,
        recipientName,
        recipientBank,
        recipientAccountNumber: recipientWireAccount,
        recipientRoutingNumber,
      })
    }

    setLoading(false)

    if (res.error) {
      setError(res.error)
    } else if (res.success && res.referenceId) {
      setReceipt({
        referenceId: res.referenceId,
        isPending: ("isPending" in res ? res.isPending : undefined) as boolean | undefined,
        message: res.message || "Transfer completed.",
        amountFormatted: formatCurrency(parsedAmount),
        type: transferType === "INTERNAL_TRANSFER" ? "Internal Transfer" : "External Wire",
      })
    }
  }

  function handleReset() {
    setReceipt(null)
    setAmount("")
    setDescription("")
    setRecipientAccountNumber("")
    setRecipientName("")
    setRecipientBank("")
    setRecipientWireAccount("")
    setRecipientRoutingNumber("")
    setUserSortCode("")
    setUserBicCode("")
    setUserRvsCode("")
    setUserFwCode("")
    setError(null)
  }

  // ── Receipt screen ──
  if (receipt) {
    return (
      <Card className="border-border/80 shadow-md overflow-hidden">
        <CardHeader className="text-center pb-4">
          <div
            className={`mx-auto flex size-14 items-center justify-center rounded-full mb-2 ${
              receipt.isPending
                ? "bg-amber-500/10 text-amber-500"
                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            }`}
          >
            {receipt.isPending ? (
              <Clock className="size-8 animate-pulse" />
            ) : (
              <CheckCircle2 className="size-8" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {receipt.isPending ? "Transfer In Review" : "Transfer Successful"}
          </CardTitle>
          <CardDescription>{receipt.message}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl bg-muted/50 p-4 space-y-3 border border-border/60">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Transaction Reference</span>
              <span className="font-mono font-bold text-foreground">{receipt.referenceId}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Type</span>
              <span className="font-medium text-foreground">{receipt.type}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Amount</span>
              <span className="font-bold text-foreground font-mono">{receipt.amountFormatted}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Status</span>
              <Badge variant={receipt.isPending ? "warning" : "success"}>
                {receipt.isPending ? "Pending Admin Approval" : "Settled"}
              </Badge>
            </div>
          </div>
          {receipt.isPending && (
            <div className="mt-3 flex items-start gap-2 text-[11px] text-amber-700 dark:text-amber-400 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
              <Info className="size-3.5 shrink-0 mt-0.5" />
              Your funds remain in your account until Bank Operations reviews and approves this transfer.
              You will see the balance updated once approved.
            </div>
          )}
        </CardContent>
        <CardFooter className="pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
            <Button
              type="button"
              onClick={handleReset}
              className="w-full font-semibold"
            >
              New Transfer
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => window.print()}
              className="w-full font-medium gap-2"
            >
              <Receipt className="size-4" />
              Print Receipt
            </Button>
          </div>
        </CardFooter>
      </Card>
    )
  }

  // ── Transfer Form ──
  return (
    <Card className="border-border/80 shadow-md">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl">Initiate Transfer</CardTitle>
            <CardDescription>Send funds internally or submit an external wire request</CardDescription>
          </div>
          {/* Rail Selector */}
          <div className="flex w-full sm:w-auto rounded-lg bg-muted p-1 border border-border/60">
            <button
              type="button"
              onClick={() => setTransferType("INTERNAL_TRANSFER")}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 sm:py-1.5 rounded-md text-xs font-semibold transition-all ${
                transferType === "INTERNAL_TRANSFER"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ArrowLeftRight className="size-3.5" />
              Internal
            </button>
            <button
              type="button"
              onClick={() => setTransferType("EXTERNAL_WIRE")}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 sm:py-1.5 rounded-md text-xs font-semibold transition-all ${
                transferType === "EXTERNAL_WIRE"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Globe className="size-3.5" />
              External Wire
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="flex items-start gap-2 p-3 text-sm rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Identity Verification Mandatory Gate */}
          {selectedSource?.status !== "ACTIVE" && (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 sm:p-5 shadow-sm">
              <div className="flex items-start gap-3.5">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                  <ShieldAlert className="size-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-amber-950">
                    Transfers Restricted — KYC Verification Required
                  </h4>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    Under Federal Banking Compliance Regulations (FinCEN / OFAC), your account is currently in <strong>Non-Active</strong> state. You cannot initiate internal transfers or external wires until Tier-1 identity verification has been reviewed and cleared.
                  </p>
                  <div className="pt-2">
                    <Link
                      href="/kyc"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-3.5 py-2 text-xs font-bold text-white transition-colors shadow-sm"
                    >
                      <ShieldCheck className="size-3.5" />
                      <span>Complete Identity Verification</span>
                      <ArrowRight className="size-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Insufficient Funds Gate ($0.00 Balance Prevention) */}
          {selectedSource?.status === "ACTIVE" && Number(selectedSource.balance) <= 0 && (
            <div className="rounded-2xl border border-red-300 bg-red-50 p-4 sm:p-5 shadow-sm">
              <div className="flex items-start gap-3.5">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700">
                  <AlertCircle className="size-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-red-950">
                    Insufficient Funds — Account Balance is $0.00
                  </h4>
                  <p className="text-xs text-red-800 leading-relaxed mt-0.5">
                    Your account has an empty balance ($0.00). You cannot transfer or wire funds until you deposit money into your account.
                  </p>
                  <div className="pt-2.5">
                    <Link
                      href="/deposits"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-3.5 py-2 text-xs font-bold text-white transition-colors shadow-sm"
                    >
                      <ArrowRight className="size-3.5" />
                      <span>Deposit Funds First</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Source Account Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Pay From Account
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {accounts.map((acc) => {
                const reserve = acc.accountType === "SAVINGS" ? minSavingsThreshold : minCheckingThreshold
                const available = Math.max(0, acc.balance - reserve)
                return (
                  <div
                    key={acc.id}
                    onClick={() => setSourceAccountId(acc.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      sourceAccountId === acc.id
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border/80 hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-foreground">
                        {acc.accountType} (•••• {acc.accountNumber.slice(-4)})
                      </span>
                      <Badge
                        variant={acc.status === "ACTIVE" ? "outline" : "destructive"}
                        className="text-[10px] py-0"
                      >
                        {acc.status}
                      </Badge>
                    </div>
                    <div className="text-lg font-bold font-mono text-foreground">
                      {formatCurrency(acc.balance)}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      Transferable: <span className="font-semibold text-foreground">{formatCurrency(available)}</span>
                      {" "}(reserve {formatCurrency(reserve)})
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground" htmlFor="amount">
                Amount (USD)
              </label>
              {selectedSource && (
                <span className="text-xs text-muted-foreground">
                  Max transferable:{" "}
                  <strong className="text-foreground">{formatCurrency(maxTransferable)}</strong>
                </span>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-lg">
                $
              </span>
              <Input
                id="amount"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(formatAmountInput(e.target.value))}
                className={`pl-8 text-lg font-semibold font-mono h-11 transition-colors ${
                  hasEnteredAmount
                    ? isAmountValid
                      ? "border-emerald-500 focus-visible:ring-emerald-500/30"
                      : "border-destructive focus-visible:ring-destructive/30"
                    : ""
                }`}
                required
              />
            </div>

            {/* Realtime Amount Errors Only */}
            {hasEnteredAmount && !isAmountValid && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-2.5 space-y-1 text-xs">
                {!condPositiveAmount && (
                  <div className="flex items-center gap-1.5 text-destructive font-medium">
                    <XCircle className="size-3.5 shrink-0" />
                    <span>Transfer amount must be at least {formatCurrency(minWithdrawalAmount)}</span>
                  </div>
                )}
                {!condWithinBalance && (
                  <div className="flex items-center gap-1.5 text-destructive font-medium">
                    <XCircle className="size-3.5 shrink-0" />
                    <span>Amount exceeds available balance ({formatCurrency(selectedSource?.balance || 0)})</span>
                  </div>
                )}
                {condWithinBalance && !condMeetsReserve && (
                  <div className="flex items-center gap-1.5 text-destructive font-medium">
                    <XCircle className="size-3.5 shrink-0" />
                    <span>Transfer would violate minimum reserve of {formatCurrency(minReserve)}</span>
                  </div>
                )}
              </div>
            )}

            {hasEnteredAmount && isAmountValid && selectedSource && (
              <div className="flex items-center justify-between text-xs text-muted-foreground font-mono px-0.5">
                <span>Remaining Balance:</span>
                <span className="font-bold text-foreground">{formatCurrency(remainingBalance)}</span>
              </div>
            )}

            {/* Quick amounts */}
            <div className="flex flex-wrap gap-2">
              {[50, 100, 500, 1000].map((val) => (
                <button
                  type="button"
                  key={val}
                  onClick={() => setAmount(formatAmountInput(val))}
                  className="px-2.5 py-1 text-xs rounded-md bg-muted hover:bg-muted/80 text-foreground border border-border/60 transition-colors"
                >
                  +{formatCurrency(val)}
                </button>
              ))}
              {maxTransferable > 0 && (
                <button
                  type="button"
                  onClick={() => setAmount(formatAmountInput(maxTransferable.toFixed(2)))}
                  className="px-2.5 py-1 text-xs rounded-md bg-muted hover:bg-muted/80 text-foreground font-semibold border border-border/60 transition-colors"
                >
                  Max ({formatCurrency(maxTransferable)})
                </button>
              )}
            </div>
          </div>

          {/* ── Gate 3: RVS Code — Reversal Verification (Internal transfers) ── */}
          {transferType === "INTERNAL_TRANSFER" && rvsCodeActive && (
            <div className="space-y-3 rounded-xl border border-border/80 bg-muted/20 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-foreground">
                  <KeyRound className="size-4 text-primary" />
                  Reversal Verification (RVS)
                </div>
                <span className="text-[11px] font-mono text-muted-foreground">7 digits</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center overflow-x-auto py-1">
                  <OTPInput
                    id="rvsCode"
                    length={7}
                    groupAfter={3}
                    value={userRvsCode}
                    onChange={setUserRvsCode}
                    validationType="numeric"
                    size="sm"
                    isError={userRvsCode.length === 7 && !rvsCodeCorrect}
                    isSuccess={userRvsCode.length === 7 && rvsCodeCorrect}
                    ariaLabel="RVS Code digit 1"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Enter your 7-digit RVS reversal verification code for internal clearing.
                </p>
                {userRvsCode.length === 7 && !rvsCodeCorrect && (
                  <div className="flex items-center gap-1 text-[11px] font-medium text-destructive">
                    <XCircle className="size-3.5 shrink-0" />
                    <span>Incorrect RVS code</span>
                  </div>
                )}
                {userRvsCode.length === 7 && rvsCodeCorrect && (
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>RVS code verified</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Recipient Details */}
          {transferType === "INTERNAL_TRANSFER" ? (
            <div className="space-y-4 rounded-xl border border-border/80 bg-muted/20 p-4">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
                <Building2 className="size-4 text-primary" />
                PrimeVault Recipient
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium" htmlFor="recipientAccount">
                      Recipient Account Number
                    </label>
                    <Input
                      id="recipientAccount"
                      placeholder="e.g. 1048291038"
                      value={recipientAccountNumber}
                      onChange={(e) => setRecipientAccountNumber(e.target.value)}
                      className={`font-mono transition-colors ${
                        hasEnteredRecipientAcc
                          ? isInternalRecipientValid
                            ? "border-emerald-500 focus-visible:ring-emerald-500/30"
                            : "border-destructive focus-visible:ring-destructive/30"
                          : ""
                      }`}
                      required
                    />
                  </div>

                  {/* ── Gate 1: Sort Code — Branch Identification ── */}
                  {sortCodeActive && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium flex items-center gap-1.5" htmlFor="sortCode">
                          <KeyRound className="size-3.5 text-muted-foreground" />
                          <span>Sort Code</span>
                        </label>
                        <span className="text-[11px] font-mono text-muted-foreground">4 digits</span>
                      </div>
                      <div className="flex items-center py-0.5">
                        <OTPInput
                          id="sortCode"
                          length={4}
                          value={userSortCode}
                          onChange={setUserSortCode}
                          validationType="numeric"
                          size="md"
                          isError={userSortCode.length === 4 && !sortCodeCorrect}
                          isSuccess={userSortCode.length === 4 && sortCodeCorrect}
                          ariaLabel="Sort Code digit 1"
                        />
                      </div>
                      {userSortCode.length === 4 && !sortCodeCorrect && (
                        <div className="flex items-center gap-1 text-[11px] font-medium text-destructive">
                          <XCircle className="size-3.5 shrink-0" />
                          <span>Incorrect Sort Code</span>
                        </div>
                      )}
                      {userSortCode.length === 4 && sortCodeCorrect && (
                        <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                          <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                          <span>Sort code verified</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {hasEnteredRecipientAcc && !isInternalRecipientValid && (
                  <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-2.5 space-y-1 text-xs">
                    {!condRecipientDigitsOnly && (
                      <div className="flex items-center gap-1.5 text-destructive font-medium">
                        <XCircle className="size-3.5 shrink-0" />
                        <span>Account number must contain numeric digits only</span>
                      </div>
                    )}
                    {condRecipientDigitsOnly && !condRecipientLength && (
                      <div className="flex items-center gap-1.5 text-destructive font-medium">
                        <XCircle className="size-3.5 shrink-0" />
                        <span>Account number must be exactly 10 digits ({trimmedRecipientAcc.length}/10)</span>
                      </div>
                    )}
                    {!condNotOwnAccount && (
                      <div className="flex items-center gap-1.5 text-destructive font-medium">
                        <XCircle className="size-3.5 shrink-0" />
                        <span>Cannot transfer to your own account</span>
                      </div>
                    )}
                  </div>
                )}

                <p className="text-[11px] text-muted-foreground">
                  Transfers between PrimeVault accounts are instant and fee-free.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 rounded-xl border border-border/80 bg-muted/20 p-4">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
                <Globe className="size-4 text-primary" />
                External Wire Beneficiary
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium" htmlFor="beneficiaryName">
                    Beneficiary Full Name
                  </label>
                  <Input
                    id="beneficiaryName"
                    placeholder="e.g. Sarah Jenkins"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className={recipientName ? (condWireName ? "border-emerald-500" : "border-destructive") : ""}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium" htmlFor="beneficiaryBank">
                    Receiving Bank
                  </label>
                  <Input
                    id="beneficiaryBank"
                    placeholder="e.g. Chase, Wells Fargo, Barclays"
                    value={recipientBank}
                    onChange={(e) => setRecipientBank(e.target.value)}
                    className={recipientBank ? (condWireBank ? "border-emerald-500" : "border-destructive") : ""}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium" htmlFor="externalAcc">
                    Account / IBAN Number
                  </label>
                  <Input
                    id="externalAcc"
                    placeholder="e.g. 98234710294"
                    value={recipientWireAccount}
                    onChange={(e) => setRecipientWireAccount(e.target.value)}
                    className={`font-mono ${recipientWireAccount ? (condWireAcc ? "border-emerald-500" : "border-destructive") : ""}`}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium" htmlFor="routingCode">
                    Routing / SWIFT Code
                  </label>
                  <Input
                    id="routingCode"
                    placeholder="e.g. 021000021"
                    value={recipientRoutingNumber}
                    onChange={(e) => setRecipientRoutingNumber(e.target.value)}
                  />
                </div>

                {/* ── Gate 2: BIC Code — Cross-Border Wire Gate ── */}
                {bicCodeActive && (
                  <div className="space-y-2 sm:col-span-2 p-3.5 rounded-lg border border-border/70 bg-background/50">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold flex items-center gap-1.5" htmlFor="bicCode">
                        <KeyRound className="size-3.5 text-muted-foreground" />
                        <span>BIC Code (Bank Identifier Code)</span>
                      </label>
                      <span className="text-[11px] font-mono text-muted-foreground">8 characters</span>
                    </div>
                    <div className="flex items-center overflow-x-auto py-1">
                      <OTPInput
                        id="bicCode"
                        length={8}
                        groupAfter={4}
                        value={userBicCode}
                        onChange={setUserBicCode}
                        validationType="alphanumeric"
                        size="sm"
                        isError={userBicCode.length === 8 && !bicCodeCorrect}
                        isSuccess={userBicCode.length === 8 && bicCodeCorrect}
                        ariaLabel="BIC Code character 1"
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Enter the 8-character international wire identifier code.
                    </p>
                    {userBicCode.length === 8 && !bicCodeCorrect && (
                      <div className="flex items-center gap-1 text-[11px] font-medium text-destructive">
                        <XCircle className="size-3.5 shrink-0" />
                        <span>Incorrect BIC Code</span>
                      </div>
                    )}
                    {userBicCode.length === 8 && bicCodeCorrect && (
                      <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                        <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        <span>BIC code verified</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Wire errors only */}
                {(recipientName.trim().length > 0 || recipientBank.trim().length > 0 || recipientWireAccount.trim().length > 0) && !isExternalValid && (
                  <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-2.5 space-y-1 text-xs sm:col-span-2">
                    {recipientName.trim().length > 0 && !condWireName && (
                      <div className="flex items-center gap-1.5 text-destructive font-medium">
                        <XCircle className="size-3.5 shrink-0" />
                        <span>Beneficiary name must be at least 2 characters</span>
                      </div>
                    )}
                    {recipientBank.trim().length > 0 && !condWireBank && (
                      <div className="flex items-center gap-1.5 text-destructive font-medium">
                        <XCircle className="size-3.5 shrink-0" />
                        <span>Receiving bank must be at least 2 characters</span>
                      </div>
                    )}
                    {recipientWireAccount.trim().length > 0 && !condWireAcc && (
                      <div className="flex items-center gap-1.5 text-destructive font-medium">
                        <XCircle className="size-3.5 shrink-0" />
                        <span>Account or IBAN must be at least 4 characters</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-start gap-2 text-[11px] text-muted-foreground bg-muted/40 p-2.5 rounded-lg border border-border/60">
                <Info className="size-3.5 shrink-0 mt-0.5 text-primary" />
                External wires are reviewed by Bank Operations before clearance.
                Your funds are <strong>not debited</strong> until the wire is approved.
              </div>
            </div>
          )}

          {/* Memo */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground" htmlFor="memo">
              Memo (Optional)
            </label>
            <Input
              id="memo"
              placeholder="e.g. Monthly rent, invoice #1024, savings top-up"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* ── Gate 4: FW Code — Final Withdrawal Code (Both transfer types, authorization step) ── */}
          {fwCodeActive && (
            <div className="space-y-3 rounded-xl border border-border/80 bg-muted/20 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-foreground">
                  <Lock className="size-4 text-primary" />
                  Final Withdrawal Authorization (FW Code)
                </div>
                <span className="text-[11px] font-mono text-muted-foreground">3 digits</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center py-1">
                  <OTPInput
                    id="fwCode"
                    length={3}
                    value={userFwCode}
                    onChange={setUserFwCode}
                    validationType="numeric"
                    size="md"
                    isError={userFwCode.length === 3 && !fwCodeCorrect}
                    isSuccess={userFwCode.length === 3 && fwCodeCorrect}
                    ariaLabel="FW Code digit 1"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Enter your 3-digit final authorization code to approve withdrawal.
                </p>
                {userFwCode.length === 3 && !fwCodeCorrect && (
                  <div className="flex items-center gap-1 text-[11px] font-medium text-destructive">
                    <XCircle className="size-3.5 shrink-0" />
                    <span>Incorrect FW Code</span>
                  </div>
                )}
                {userFwCode.length === 3 && fwCodeCorrect && (
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>FW code verified</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-11 font-semibold text-sm sm:text-base gap-2 px-3"
            disabled={loading || selectedSource?.status !== "ACTIVE" || (selectedSource?.balance ?? 0) <= 0 || !isFormValid}
          >
            {selectedSource?.status !== "ACTIVE" ? (
              <span className="truncate">VERIFICATION REQUIRED TO TRANSFER</span>
            ) : (selectedSource?.balance ?? 0) <= 0 ? (
              <span className="truncate">INSUFFICIENT FUNDS ($0.00) — DEPOSIT FIRST</span>
            ) : loading ? (
              "Processing…"
            ) : !hasEnteredAmount ? (
              <span className="truncate">Enter an amount to transfer</span>
            ) : !isAmountValid ? (
              <span className="truncate">Amount does not meet conditions</span>
            ) : transferType === "INTERNAL_TRANSFER" && !isInternalRecipientValid ? (
              <span className="truncate">Enter valid 10-digit account</span>
            ) : transferType === "EXTERNAL_WIRE" && !isExternalValid ? (
              <span className="truncate">Complete beneficiary wire details</span>
            ) : transferType === "INTERNAL_TRANSFER" && rvsCodeActive && !rvsCodeCorrect ? (
              <span className="truncate">Enter valid 7-digit RVS Code</span>
            ) : transferType === "INTERNAL_TRANSFER" && sortCodeActive && !sortCodeCorrect ? (
              <span className="truncate">Enter valid 4-digit Sort Code</span>
            ) : transferType === "EXTERNAL_WIRE" && bicCodeActive && !bicCodeCorrect ? (
              <span className="truncate">Enter valid 8-character BIC Code</span>
            ) : fwCodeActive && !fwCodeCorrect ? (
              <span className="truncate">Enter valid 3-digit FW Code</span>
            ) : (
              <>
                <span className="truncate">
                  Submit {transferType === "EXTERNAL_WIRE" ? "Wire Request" : "Transfer"} — {formatCurrency(numericAmount)}
                </span>
                <ArrowRight className="size-4 shrink-0" />
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
