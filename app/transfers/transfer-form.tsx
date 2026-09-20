"use client"

import * as React from "react"
import { createInternalTransfer, createExternalWire } from "@/lib/actions/transfers"
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
} from "lucide-react"
import { formatCurrency, formatAmountInput, parseAmount } from "@/lib/utils"

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
}

export function TransferForm({
  accounts,
  minCheckingThreshold,
  minSavingsThreshold,
  minWithdrawalAmount = 10,
}: TransferFormProps) {
  const [transferType, setTransferType] = React.useState<"INTERNAL_TRANSFER" | "EXTERNAL_WIRE">(
    "INTERNAL_TRANSFER"
  )
  const [sourceAccountId, setSourceAccountId] = React.useState<string>(accounts[0]?.id || "")
  const [amount, setAmount] = React.useState("")
  const [description, setDescription] = React.useState("")

  // Internal
  const [recipientAccountNumber, setRecipientAccountNumber] = React.useState("")

  // External wire
  const [recipientName, setRecipientName] = React.useState("")
  const [recipientBank, setRecipientBank] = React.useState("")
  const [recipientWireAccount, setRecipientWireAccount] = React.useState("")
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

  // Overall form validity
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
          <div className="flex rounded-lg bg-muted p-1 border border-border/60">
            <button
              type="button"
              onClick={() => setTransferType("INTERNAL_TRANSFER")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
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

            {/* Realtime Amount Validation Conditions */}
            {hasEnteredAmount && (
              <div className="rounded-lg border border-border/80 bg-muted/40 p-3 space-y-2 text-xs">
                <div className="font-semibold text-foreground flex items-center justify-between">
                  <span>Transfer Conditions</span>
                  {isAmountValid ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="size-3.5" /> All conditions met
                    </span>
                  ) : (
                    <span className="text-destructive font-medium flex items-center gap-1">
                      <AlertCircle className="size-3.5" /> Requirements pending
                    </span>
                  )}
                </div>

                <div className="space-y-1 pt-1 border-t border-border/40">
                  {/* Condition 1: Meets minimum withdrawal threshold */}
                  <div
                    className={`flex items-center gap-2 ${
                      condPositiveAmount ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
                    }`}
                  >
                    {condPositiveAmount ? (
                      <CheckCircle2 className="size-3.5 shrink-0" />
                    ) : (
                      <XCircle className="size-3.5 shrink-0" />
                    )}
                    <span>Meets minimum transfer limit ({formatCurrency(minWithdrawalAmount)})</span>
                  </div>

                  {/* Condition 2: Within balance */}
                  <div
                    className={`flex items-center gap-2 ${
                      condWithinBalance ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
                    }`}
                  >
                    {condWithinBalance ? (
                      <CheckCircle2 className="size-3.5 shrink-0" />
                    ) : (
                      <XCircle className="size-3.5 shrink-0" />
                    )}
                    <span>Within available balance ({formatCurrency(selectedSource?.balance || 0)})</span>
                  </div>

                  {/* Condition 3: Meets Reserve */}
                  <div
                    className={`flex items-center gap-2 ${
                      condMeetsReserve ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
                    }`}
                  >
                    {condMeetsReserve ? (
                      <CheckCircle2 className="size-3.5 shrink-0" />
                    ) : (
                      <XCircle className="size-3.5 shrink-0" />
                    )}
                    <span>Maintains minimum reserve of {formatCurrency(minReserve)}</span>
                  </div>
                </div>

                {isAmountValid && selectedSource && (
                  <div className="pt-2 border-t border-border/40 flex items-center justify-between text-muted-foreground font-mono">
                    <span>Remaining Balance:</span>
                    <span className="font-bold text-foreground">{formatCurrency(remainingBalance)}</span>
                  </div>
                )}
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
              <div className="space-y-2">
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

                {hasEnteredRecipientAcc && (
                  <div className="rounded-lg border border-border/80 bg-muted/40 p-2.5 space-y-1.5 text-xs">
                    <div className="font-semibold text-foreground flex items-center justify-between">
                      <span>Recipient Validation</span>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {trimmedRecipientAcc.length} / 10 digits
                      </span>
                    </div>
                    <div className="space-y-1 pt-1 border-t border-border/40">
                      <div
                        className={`flex items-center gap-2 ${
                          condRecipientLength
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-muted-foreground"
                        }`}
                      >
                        {condRecipientLength ? (
                          <CheckCircle2 className="size-3.5 shrink-0" />
                        ) : (
                          <Clock className="size-3.5 shrink-0" />
                        )}
                        <span>Exactly 10 digits</span>
                      </div>
                      <div
                        className={`flex items-center gap-2 ${
                          condRecipientDigitsOnly
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-destructive"
                        }`}
                      >
                        {condRecipientDigitsOnly ? (
                          <CheckCircle2 className="size-3.5 shrink-0" />
                        ) : (
                          <XCircle className="size-3.5 shrink-0" />
                        )}
                        <span>Numeric digits only</span>
                      </div>
                      <div
                        className={`flex items-center gap-2 ${
                          condNotOwnAccount
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-destructive"
                        }`}
                      >
                        {condNotOwnAccount ? (
                          <CheckCircle2 className="size-3.5 shrink-0" />
                        ) : (
                          <XCircle className="size-3.5 shrink-0" />
                        )}
                        <span>Cannot transfer to own account</span>
                      </div>
                    </div>
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

                {/* Wire conditions check */}
                <div className="rounded-lg border border-border/80 bg-muted/40 p-2.5 space-y-1 text-xs sm:col-span-2">
                  <div className="font-semibold text-foreground mb-1">Wire Details Validation</div>
                  <div className={`flex items-center gap-2 ${condWireName ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                    {condWireName ? <CheckCircle2 className="size-3.5 shrink-0" /> : <Clock className="size-3.5 shrink-0" />}
                    <span>Beneficiary name entered (min. 2 characters)</span>
                  </div>
                  <div className={`flex items-center gap-2 ${condWireBank ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                    {condWireBank ? <CheckCircle2 className="size-3.5 shrink-0" /> : <Clock className="size-3.5 shrink-0" />}
                    <span>Receiving bank entered (min. 2 characters)</span>
                  </div>
                  <div className={`flex items-center gap-2 ${condWireAcc ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                    {condWireAcc ? <CheckCircle2 className="size-3.5 shrink-0" /> : <Clock className="size-3.5 shrink-0" />}
                    <span>Account or IBAN specified (min. 4 characters)</span>
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2 text-[11px] text-amber-700 dark:text-amber-400 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
                <Info className="size-3.5 shrink-0 mt-0.5" />
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

          <Button
            type="submit"
            className="w-full h-11 font-semibold text-sm sm:text-base gap-2 px-3"
            disabled={loading || !isFormValid}
          >
            {loading ? (
              "Processing…"
            ) : !hasEnteredAmount ? (
              <span className="truncate">Enter an amount to transfer</span>
            ) : !isAmountValid ? (
              <span className="truncate">Amount does not meet conditions</span>
            ) : transferType === "INTERNAL_TRANSFER" && !isInternalRecipientValid ? (
              <span className="truncate">Enter valid 10-digit account</span>
            ) : transferType === "EXTERNAL_WIRE" && !isExternalValid ? (
              <span className="truncate">Complete beneficiary wire details</span>
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
