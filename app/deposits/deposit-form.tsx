"use client"

import * as React from "react"
import { createDepositRequest } from "@/lib/actions/transfers"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Clock, AlertCircle, ArrowRight, Info, CheckCircle2, XCircle } from "lucide-react"
import { formatCurrency, formatAmountInput, parseAmount } from "@/lib/utils"

interface Account {
  id: string
  accountNumber: string
  accountType: string
  balance: number
  status: string
}

export function DepositForm({
  accounts,
  minDepositAmount = 10,
}: {
  accounts: Account[]
  minDepositAmount?: number
}) {
  const [destinationAccountId, setDestinationAccountId] = React.useState(accounts[0]?.id || "")
  const [amount, setAmount] = React.useState("")
  const [senderBank, setSenderBank] = React.useState("")
  const [depositReference, setDepositReference] = React.useState("")
  const [paymentProof, setPaymentProof] = React.useState("")

  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [receipt, setReceipt] = React.useState<{
    referenceId: string
    message: string
    amountFormatted: string
  } | null>(null)

  const selectedDest = accounts.find((a) => a.id === destinationAccountId)
  const numericAmount = parseAmount(amount)
  const hasEnteredAmount = amount.trim().length > 0

  // Real-time validation conditions
  const condPositiveAmount = numericAmount >= minDepositAmount
  const condSenderBank = senderBank.trim().length >= 2
  const condReference = depositReference.trim().length >= 4
  const condProof = paymentProof.trim().length >= 10

  const isFormValid = condPositiveAmount && condSenderBank && condReference && condProof
  const projectedBalance = (selectedDest?.balance || 0) + numericAmount

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const parsedAmount = parseAmount(amount)
    if (parsedAmount < minDepositAmount) {
      setError(`Please enter a deposit amount of at least ${formatCurrency(minDepositAmount)}.`)
      return
    }

    setLoading(true)
    const res = await createDepositRequest({
      destinationAccountId,
      amount: parsedAmount,
      senderBank,
      depositReference,
      paymentProof,
    })
    setLoading(false)

    if (res.error) {
      setError(res.error)
    } else if (res.success && res.referenceId) {
      setReceipt({
        referenceId: res.referenceId,
        message: res.message || "Deposit submitted.",
        amountFormatted: formatCurrency(parsedAmount),
      })
    }
  }

  function handleReset() {
    setReceipt(null)
    setAmount("")
    setSenderBank("")
    setDepositReference("")
    setPaymentProof("")
    setError(null)
  }

  // ── Success receipt ──
  if (receipt) {
    return (
      <Card className="border-border/80 shadow-md">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-amber-500/10 text-amber-500 mb-2">
            <Clock className="size-8 animate-pulse" />
          </div>
          <CardTitle className="text-xl">Deposit Request Submitted</CardTitle>
          <CardDescription>{receipt.message}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl bg-muted/50 p-4 space-y-3 border border-border/60">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Reference ID</span>
              <span className="font-mono font-bold text-foreground">{receipt.referenceId}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Amount Requested</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                +{receipt.amountFormatted}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Status</span>
              <Badge variant="warning">Pending Review</Badge>
            </div>
          </div>
          <div className="mt-3 flex items-start gap-2 text-[11px] text-blue-700 dark:text-blue-300 bg-blue-500/10 p-2.5 rounded-lg border border-blue-500/20">
            <Info className="size-3.5 shrink-0 mt-0.5" />
            Your deposit request is under review. Bank Operations will verify your payment
            and credit your account. You will see the balance update once approved.
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleReset} className="w-full">
            Submit Another Deposit
          </Button>
        </CardFooter>
      </Card>
    )
  }

  // ── Deposit Form ──
  return (
    <Card className="border-border/80 shadow-md">
      <CardHeader>
        <CardTitle className="text-base">Step 2 — Submit Payment Proof</CardTitle>
        <CardDescription>
          After sending the funds, fill in the details below so Bank Operations can verify and credit your account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-start gap-2 p-3 text-sm rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Destination Account */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Credit To Account
            </label>
            <div className="grid grid-cols-1 gap-2">
              {accounts.map((acc) => (
                <div
                  key={acc.id}
                  onClick={() => setDestinationAccountId(acc.id)}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                    destinationAccountId === acc.id
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border/80 hover:bg-muted/50"
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold">
                      {acc.accountType} (•••• {acc.accountNumber.slice(-4)})
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                      Balance: {formatCurrency(acc.balance)}
                    </div>
                  </div>
                  <Badge
                    variant={acc.status === "ACTIVE" ? "outline" : "destructive"}
                    className="text-[10px]"
                  >
                    {acc.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground" htmlFor="depositAmount">
                Deposit Amount (USD)
              </label>
              {selectedDest && (
                <span className="text-xs text-muted-foreground">
                  Current balance: <strong className="text-foreground">{formatCurrency(selectedDest.balance)}</strong>
                </span>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-lg">
                $
              </span>
              <Input
                id="depositAmount"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(formatAmountInput(e.target.value))}
                className={`pl-8 text-lg font-semibold font-mono h-11 transition-colors ${
                  hasEnteredAmount
                    ? condPositiveAmount
                      ? "border-emerald-500 focus-visible:ring-emerald-500/30"
                      : "border-destructive focus-visible:ring-destructive/30"
                    : ""
                }`}
                required
              />
            </div>

            {/* Real-time Amount Condition and Projected Balance */}
            {hasEnteredAmount && (
              <div className="rounded-lg border border-border/80 bg-muted/40 p-2.5 space-y-1.5 text-xs">
                <div className="flex items-center justify-between font-semibold text-foreground">
                  <span>Deposit Condition</span>
                  <div
                    className={`flex items-center gap-1 font-bold ${
                      condPositiveAmount ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
                    }`}
                  >
                    {condPositiveAmount ? (
                      <>
                        <CheckCircle2 className="size-3.5" /> Minimum {formatCurrency(minDepositAmount)} met
                      </>
                    ) : (
                      <>
                        <XCircle className="size-3.5" /> Minimum deposit is {formatCurrency(minDepositAmount)}
                      </>
                    )}
                  </div>
                </div>

                {condPositiveAmount && selectedDest && (
                  <div className="pt-1.5 border-t border-border/40 flex items-center justify-between text-muted-foreground font-mono">
                    <span>Projected Balance After Credit:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(projectedBalance)}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {[100, 500, 1000, 5000].map((val) => (
                <button
                  type="button"
                  key={val}
                  onClick={() => setAmount(formatAmountInput(val))}
                  className="px-2.5 py-1 text-xs rounded-md bg-muted hover:bg-muted/80 text-foreground border border-border/60 transition-colors"
                >
                  +{formatCurrency(val)}
                </button>
              ))}
            </div>
          </div>

          {/* Sender Bank */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium" htmlFor="senderBank">
                Your Sending Bank
              </label>
              {senderBank.trim().length > 0 && (
                <span className={`text-[11px] flex items-center gap-1 ${condSenderBank ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                  {condSenderBank ? <CheckCircle2 className="size-3" /> : <Clock className="size-3" />}
                  {condSenderBank ? "Valid" : "Min. 2 characters"}
                </span>
              )}
            </div>
            <Input
              id="senderBank"
              placeholder="e.g. Chase, Bank of America, Citibank"
              value={senderBank}
              onChange={(e) => setSenderBank(e.target.value)}
              className={senderBank.trim().length > 0 ? (condSenderBank ? "border-emerald-500" : "border-destructive") : ""}
              required
            />
          </div>

          {/* Transfer Reference */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium" htmlFor="depositRef">
                Transfer / Confirmation Number
              </label>
              {depositReference.trim().length > 0 && (
                <span className={`text-[11px] flex items-center gap-1 ${condReference ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                  {condReference ? <CheckCircle2 className="size-3" /> : <Clock className="size-3" />}
                  {condReference ? "Valid" : "Min. 4 characters"}
                </span>
              )}
            </div>
            <Input
              id="depositRef"
              placeholder="e.g. TXN2847483920 — from your bank receipt"
              value={depositReference}
              onChange={(e) => setDepositReference(e.target.value)}
              className={`font-mono ${depositReference.trim().length > 0 ? (condReference ? "border-emerald-500" : "border-destructive") : ""}`}
              required
            />
          </div>

          {/* Payment Proof */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium" htmlFor="paymentProof">
                Proof of Payment
              </label>
              <span
                className={`text-[11px] flex items-center gap-1 font-mono ${
                  condProof
                    ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                    : "text-muted-foreground"
                }`}
              >
                {condProof ? <CheckCircle2 className="size-3" /> : <Clock className="size-3" />}
                {paymentProof.trim().length} / 10 characters minimum
              </span>
            </div>
            <textarea
              id="paymentProof"
              rows={4}
              placeholder="Paste your bank transfer receipt details, transaction confirmation text, or any other evidence of payment here…"
              value={paymentProof}
              onChange={(e) => setPaymentProof(e.target.value)}
              className={`w-full resize-none rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors ${
                paymentProof.trim().length > 0
                  ? condProof
                    ? "border-emerald-500 focus-visible:ring-emerald-500/30"
                    : "border-destructive focus-visible:ring-destructive/30"
                  : "border-input"
              }`}
              required
            />
            <p className="text-[11px] text-muted-foreground">
              Include transaction ID, date, amount, and any screenshot text for faster verification.
            </p>
          </div>

          <Button
            type="submit"
            className="w-full h-11 font-semibold gap-2"
            disabled={loading || !isFormValid}
          >
            {loading ? (
              "Submitting…"
            ) : !hasEnteredAmount ? (
              "Enter a deposit amount"
            ) : !condPositiveAmount ? (
              "Amount must be at least $1.00"
            ) : !condSenderBank ? (
              "Enter sending bank name"
            ) : !condReference ? (
              "Enter confirmation reference"
            ) : !condProof ? (
              "Provide payment proof (min. 10 characters)"
            ) : (
              <>
                <span>Submit Deposit — {formatCurrency(numericAmount)}</span>
                <ArrowRight className="size-4" />
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
