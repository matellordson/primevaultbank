"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { createInternalTransfer, createExternalWire, getTransactionVerificationState } from "@/lib/actions/transfers"
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
  Lock,
} from "lucide-react"
import { formatCurrency, formatAmountInput, parseAmount } from "@/lib/utils"
import {
  VerificationPipelineModal,
  VerificationState,
} from "@/components/VerificationPipelineModal"

interface Account {
  id: string
  accountNumber: string
  accountType: string
  balance: number
  status: string
}

interface TransferFormProps {
  accounts: Account[]
  minCheckingThreshold: number
  minSavingsThreshold: number
  minWithdrawalAmount?: number
  userTransferLimit?: number
  initialActiveVerification?: VerificationState | null
}

export function TransferForm({
  accounts,
  minCheckingThreshold,
  minSavingsThreshold,
  minWithdrawalAmount = 10,
  userTransferLimit = 10000,
  initialActiveVerification,
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
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => { setMounted(true) }, [])
  const [receipt, setReceipt] = React.useState<{
    referenceId: string
    isPending?: boolean
    message: string
    amountFormatted: string
    type: string
  } | null>(null)

  // Staggered modal state
  const [activeVerification, setActiveVerification] = React.useState<VerificationState | null>(
    initialActiveVerification || null
  )
  const [verificationModalOpen, setVerificationModalOpen] = React.useState<boolean>(!!initialActiveVerification)


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
  const condWithinUserLimit = userTransferLimit ? numericAmount <= userTransferLimit : true
  const isAmountValid =
    hasEnteredAmount && condPositiveAmount && condWithinBalance && condMeetsReserve && condWithinUserLimit
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

  // Overall form validity — checks amount and recipient
  const isFormValid =
    isAmountValid &&
    (transferType === "INTERNAL_TRANSFER" ? isInternalRecipientValid : isExternalValid)

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

    if (userTransferLimit && parsedAmount > userTransferLimit) {
      setError(`Transfer amount exceeds your authorized clearance limit of ${formatCurrency(userTransferLimit)}. Please contact Admin to increase your limit.`)
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
    } else if (res.success && res.transactionId) {
      // Launch 5-phase sequential verification modal
      setActiveVerification({
        id: res.transactionId,
        referenceId: res.referenceId,
        amount: parsedAmount,
        type: transferType === "INTERNAL_TRANSFER" ? "Internal Transfer" : "External Wire",
        recipientName: transferType === "INTERNAL_TRANSFER" ? `Account #${recipientAccountNumber}` : recipientName,
        recipientBank: transferType === "INTERNAL_TRANSFER" ? "PrimeVault Bank" : recipientBank,
        recipientAccountNumber: transferType === "INTERNAL_TRANSFER" ? recipientAccountNumber : recipientWireAccount,
        verificationPhase: (res as any).verificationPhase || "SORT_CODE_REQUIRED",
        bicReleaseAt: null,
        rvsReleaseAt: null,
        limitClearedAt: null,
        secondsRemainingBic: 0,
        secondsRemainingRvs: 0,
        createdAt: new Date().toISOString(),
      })
      setVerificationModalOpen(true)
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
    setError(null)
    setActiveVerification(null)
    setVerificationModalOpen(false)
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
    <>
      {/* Sequential Security Verification Modal */}
      {activeVerification && verificationModalOpen && (
        <VerificationPipelineModal
          initialState={activeVerification}
          onClose={() => setVerificationModalOpen(false)}
          onCompleted={() => {
            // Receipt screen after completion
            setReceipt({
              referenceId: activeVerification.referenceId,
              isPending: true,
              message: "Transfer submitted and cleared through all 5 security protocols.",
              amountFormatted: formatCurrency(activeVerification.amount),
              type: activeVerification.type,
            })
            setActiveVerification(null)
            setVerificationModalOpen(false)
          }}
        />
      )}

      {/* Verification Resume Banner — shown when modal is dismissed but transfer still in pipeline */}
      {activeVerification && activeVerification.verificationPhase !== "COMPLETED" && !verificationModalOpen && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 sm:p-5 shadow-sm">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="flex size-10 sm:size-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 mt-0.5 sm:mt-0">
              <Lock className="size-5 sm:size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-bold text-foreground">Transfer Under Security Clearance</h4>
                <span className="rounded-full bg-amber-200 border border-amber-400 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                  {activeVerification.referenceId}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Your transfer of{" "}
                <span className="font-semibold text-foreground">{formatCurrency(activeVerification.amount)}</span>{" "}
                is awaiting security verification. Complete the pending step to release your funds.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={async () => {
              if (activeVerification?.id) {
                const fresh = await getTransactionVerificationState(activeVerification.id)
                if (fresh) setActiveVerification(fresh)
              }
              setVerificationModalOpen(true)
            }}
            className="flex items-center justify-center gap-1.5 w-full sm:w-auto shrink-0 whitespace-nowrap rounded-xl bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 sm:py-2 text-xs font-bold transition-all shadow-md shadow-amber-600/20"
          >
            <ArrowRight className="size-3.5" />
            Resume Verification
          </button>
        </div>
      )}

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
                          variant={acc.status === "ACTIVE" ? "success" : "destructive"}
                          className="text-[10px] py-0 font-bold"
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
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground" htmlFor="amount">
                    Amount (USD)
                  </label>
                  {userTransferLimit != null && (
                    <span className="text-[10px] font-bold text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                      Clearance Limit: {formatCurrency(userTransferLimit)}
                    </span>
                  )}
                </div>
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
                  {condWithinBalance && condMeetsReserve && !condWithinUserLimit && (
                    <div className="flex items-center gap-1.5 text-destructive font-medium">
                      <XCircle className="size-3.5 shrink-0" />
                      <span>
                        Amount exceeds your clearance transfer limit of {formatCurrency(userTransferLimit || 10000)}. Contact Administrator to adjust.
                      </span>
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

            {/* Recipient Details */}
            {transferType === "INTERNAL_TRANSFER" ? (
              <div className="space-y-4 rounded-xl border border-border/80 bg-muted/20 p-4">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
                  <Building2 className="size-4 text-primary" />
                  PrimeVault Recipient
                </div>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium" htmlFor="recipientAccount">
                      Recipient Account Number (10 digits)
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
                    Transfers between PrimeVault accounts are processed instantly with progressive security clearance.
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
                  External wires undergo institutional security clearing across verification checkpoints before funds are debited.
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

            <Button
              type="submit"
              className="w-full h-11 font-semibold text-sm sm:text-base gap-2 px-3"
              disabled={mounted && (loading || selectedSource?.status !== "ACTIVE" || (selectedSource?.balance ?? 0) <= 0 || !isFormValid)}
            >
              {selectedSource?.status !== "ACTIVE" ? (
                <span className="truncate">VERIFICATION REQUIRED TO TRANSFER</span>
              ) : (selectedSource?.balance ?? 0) <= 0 ? (
                <span className="truncate">INSUFFICIENT FUNDS ($0.00) — DEPOSIT FIRST</span>
              ) : loading ? (
                "Processing…"
              ) : (
                <>
                  <span>Proceed to Security Clearance</span>
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </>
  )
}
