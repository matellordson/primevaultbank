"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  KeyRound,
  Globe,
  Clock,
  ShieldAlert,
  ShieldCheck,
  Lock,
  CheckCircle2,
  AlertCircle,
  Headphones,
  RotateCw,
  X,
  ArrowRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { OTPInput } from "@/components/ui/otp-input"
import { formatCurrency } from "@/lib/utils"
import {
  verifyPhaseCode,
  getTransactionVerificationState,
} from "@/lib/actions/transfers"

export interface VerificationState {
  id: string
  referenceId: string
  amount: number
  type: string
  recipientName: string
  recipientBank: string
  recipientAccountNumber: string
  verificationPhase: string
  bicReleaseAt: string | null
  rvsReleaseAt: string | null
  limitClearedAt: string | null
  secondsRemainingBic: number
  secondsRemainingRvs: number
  createdAt: string
}

interface VerificationPipelineModalProps {
  initialState: VerificationState
  onClose?: () => void
  onCompleted?: () => void
}

function computeFreshPhaseAndSeconds(state: VerificationState): VerificationState {
  const now = Date.now()
  let phase = state.verificationPhase

  let secBic = 0
  if (state.bicReleaseAt) {
    const diff = Math.ceil((new Date(state.bicReleaseAt).getTime() - now) / 1000)
    secBic = diff > 0 ? diff : 0
    if (phase === "REVIEW_BIC" && secBic <= 0) {
      phase = "BIC_REQUIRED"
    }
  } else {
    secBic = state.secondsRemainingBic || 0
  }

  let secRvs = 0
  if (state.rvsReleaseAt) {
    const diff = Math.ceil((new Date(state.rvsReleaseAt).getTime() - now) / 1000)
    secRvs = diff > 0 ? diff : 0
    if (phase === "REVIEW_RVS" && secRvs <= 0) {
      phase = "RVS_REQUIRED"
    }
  } else {
    secRvs = state.secondsRemainingRvs || 0
  }

  return {
    ...state,
    verificationPhase: phase,
    secondsRemainingBic: secBic,
    secondsRemainingRvs: secRvs,
  }
}

export function VerificationPipelineModal({
  initialState,
  onClose,
  onCompleted,
}: VerificationPipelineModalProps) {
  const router = useRouter()
  const initialResolved = computeFreshPhaseAndSeconds(initialState)
  const [txState, setTxState] = React.useState<VerificationState>(initialResolved)
  const [inputCode, setInputCode] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null)

  // Countdown timers
  const [secondsBic, setSecondsBic] = React.useState(initialResolved.secondsRemainingBic)
  const [secondsRvs, setSecondsRvs] = React.useState(initialResolved.secondsRemainingRvs)

  // Sync state if props change
  React.useEffect(() => {
    const resolved = computeFreshPhaseAndSeconds(initialState)
    setTxState(resolved)
    setSecondsBic(resolved.secondsRemainingBic)
    setSecondsRvs(resolved.secondsRemainingRvs)
  }, [initialState])

  // Real-time ticking for BIC review
  React.useEffect(() => {
    if (txState.verificationPhase !== "REVIEW_BIC" || secondsBic <= 0) return
    const interval = setInterval(() => {
      setSecondsBic((prev) => {
        if (prev <= 1) {
          // Timer finished — auto unlock BIC_REQUIRED immediately
          setTxState((s) => ({ ...s, verificationPhase: "BIC_REQUIRED", secondsRemainingBic: 0 }))
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [txState.verificationPhase, secondsBic])

  // Real-time ticking for RVS review
  React.useEffect(() => {
    if (txState.verificationPhase !== "REVIEW_RVS" || secondsRvs <= 0) return
    const interval = setInterval(() => {
      setSecondsRvs((prev) => {
        if (prev <= 1) {
          // Timer finished — auto unlock RVS_REQUIRED immediately
          setTxState((s) => ({ ...s, verificationPhase: "RVS_REQUIRED", secondsRemainingRvs: 0 }))
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [txState.verificationPhase, secondsRvs])

  // Fast background polling (instant on mount + every 2 seconds + on tab focus)
  React.useEffect(() => {
    if (txState.verificationPhase === "COMPLETED") return

    let isMounted = true

    const poll = async () => {
      try {
        const fresh = await getTransactionVerificationState(txState.id)
        if (!isMounted || !fresh) return
        const resolved = computeFreshPhaseAndSeconds(fresh)
        if (
          resolved.verificationPhase !== txState.verificationPhase ||
          Math.abs(resolved.secondsRemainingBic - secondsBic) > 2 ||
          Math.abs(resolved.secondsRemainingRvs - secondsRvs) > 2
        ) {
          setTxState(resolved)
          setSecondsBic(resolved.secondsRemainingBic)
          setSecondsRvs(resolved.secondsRemainingRvs)
          if (resolved.verificationPhase !== txState.verificationPhase) {
            setInputCode("")
            setError(null)
          }
        }
      } catch {}
    }

    // Trigger immediate read on mount (0ms delay)
    poll()

    // 2-second fast sync interval
    const interval = setInterval(poll, 2000)

    // Sync immediately when user switches back to this browser tab
    const handleFocus = () => {
      poll()
    }
    window.addEventListener("focus", handleFocus)

    return () => {
      isMounted = false
      clearInterval(interval)
      window.removeEventListener("focus", handleFocus)
    }
  }, [txState.id, txState.verificationPhase, secondsBic, secondsRvs])

  // Clear code input whenever phase changes
  React.useEffect(() => {
    setInputCode("")
    setError(null)
  }, [txState.verificationPhase])

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // Handle Code Submission
  const handleSubmitCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await verifyPhaseCode({
        transactionId: txState.id,
        code: inputCode,
      })

      setLoading(false)

      if (res.error) {
        setError(res.error)
        return
      }

      if (res.success && res.nextPhase) {
        // Refresh state
        const fresh = await getTransactionVerificationState(txState.id)
        if (fresh) {
          setTxState(fresh)
          setSecondsBic(fresh.secondsRemainingBic)
          setSecondsRvs(fresh.secondsRemainingRvs)
        } else {
          setTxState((s) => ({ ...s, verificationPhase: res.nextPhase! }))
        }

        setInputCode("")
        if (res.nextPhase === "COMPLETED") {
          setSuccessMsg(res.message || "Transfer verification cleared!")
          if (onCompleted) onCompleted()
          router.refresh()
        }
      }
    } catch (err: any) {
      setLoading(false)
      setError("An unexpected error occurred. Please try again.")
    }
  }

  // Refresh status manually
  const handleManualRefresh = async () => {
    setLoading(true)
    try {
      const fresh = await getTransactionVerificationState(txState.id)
      if (fresh) {
        setTxState(fresh)
        setSecondsBic(fresh.secondsRemainingBic)
        setSecondsRvs(fresh.secondsRemainingRvs)
      }
    } catch {}
    setLoading(false)
  }

  // Determine current step index (1 to 5)
  const getStepNumber = () => {
    switch (txState.verificationPhase) {
      case "SORT_CODE_REQUIRED":
        return 1
      case "REVIEW_BIC":
      case "BIC_REQUIRED":
        return 2
      case "REVIEW_RVS":
      case "RVS_REQUIRED":
        return 3
      case "LIMIT_HOLD":
        return 4
      case "FW_REQUIRED":
        return 5
      case "COMPLETED":
        return 5
      default:
        return 1
    }
  }

  const currentStep = getStepNumber()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="relative w-full max-w-lg rounded-2xl border border-border/90 bg-card p-5 sm:p-7 text-card-foreground shadow-2xl space-y-5">
        {/* Header / Transaction Summary Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-border/70">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-muted-foreground">
              {txState.referenceId}
            </span>
            <Badge variant="outline" className="text-[10px] py-0">
              {formatCurrency(txState.amount)}
            </Badge>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors p-1"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Step Progress Dots */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Security Clearance Pipeline</span>
            <span>Step {currentStep} of 5</span>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {[1, 2, 3, 4, 5].map((step) => {
              const isPast = step < currentStep
              const isCurrent = step === currentStep
              return (
                <div
                  key={step}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    isPast
                      ? "bg-emerald-500"
                      : isCurrent
                      ? "bg-primary animate-pulse"
                      : "bg-muted"
                  }`}
                />
              )
            })}
          </div>
        </div>

        {/* Error notification */}
        {error && (
          <div className="flex items-start gap-2 p-3 text-xs rounded-lg bg-destructive/10 text-destructive border border-destructive/20 animate-in fade-in">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* ── PHASE 1: SORT CODE ── */}
        {txState.verificationPhase === "SORT_CODE_REQUIRED" && (
          <div className="space-y-4 text-center py-2">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
              <KeyRound className="size-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Institution Sort Code Required</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Please enter your 4-digit financial institution and branch routing Sort Code to begin clearance.
              </p>
            </div>

            <form onSubmit={handleSubmitCode} className="space-y-4 pt-1">
              <div className="flex justify-center py-2">
                <OTPInput
                  id="sortCodeModal"
                  length={4}
                  value={inputCode}
                  onChange={setInputCode}
                  validationType="numeric"
                  size="md"
                  autoFocus
                  ariaLabel="Sort Code digit 1"
                />
              </div>

              <Button
                type="submit"
                disabled={loading || inputCode.length !== 4}
                className="w-full font-semibold h-10 gap-1.5"
              >
                {loading ? "Verifying…" : "Verify Sort Code"}
                <ArrowRight className="size-4" />
              </Button>
            </form>
          </div>
        )}

        {/* ── PHASE 2A: REVIEW TIMER (WAITING FOR BIC) ── */}
        {txState.verificationPhase === "REVIEW_BIC" && (
          <div className="space-y-4 text-center py-2">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-xs">
              <Clock className="size-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Transfer Under Review</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Bank Operations is conducting regulatory cross-border clearing. The BIC clearance code will unlock automatically upon review completion.
              </p>
            </div>

            {/* Countdown Box */}
            <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                Compliance Review Period Remaining
              </span>
              <div className="text-3xl font-mono font-black text-amber-700 dark:text-amber-300">
                {formatTimer(secondsBic)}
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleManualRefresh}
                disabled={loading}
                className="text-xs gap-1.5"
              >
                <RotateCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
                Check Review Status
              </Button>
            </div>
          </div>
        )}

        {/* ── PHASE 2B: BIC CODE UNLOCKED ── */}
        {txState.verificationPhase === "BIC_REQUIRED" && (
          <div className="space-y-4 text-center py-2">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
              <Globe className="size-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold">International BIC Code Required</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Review period cleared. Enter your 8-character Bank Identifier Code (BIC / SWIFT) to authorize wire transfer.
              </p>
            </div>

            <form onSubmit={handleSubmitCode} className="space-y-4 pt-1">
              <div className="flex justify-center overflow-x-auto py-2">
                <OTPInput
                  id="bicCodeModal"
                  length={8}
                  groupAfter={4}
                  value={inputCode}
                  onChange={setInputCode}
                  validationType="alphanumeric"
                  size="sm"
                  autoFocus
                  ariaLabel="BIC Code character 1"
                />
              </div>

              <Button
                type="submit"
                disabled={loading || inputCode.length !== 8}
                className="w-full font-semibold h-10 gap-1.5"
              >
                {loading ? "Verifying…" : "Verify BIC Code"}
                <ArrowRight className="size-4" />
              </Button>
            </form>
          </div>
        )}

        {/* ── PHASE 3A: REVIEW TIMER (WAITING FOR RVS) ── */}
        {txState.verificationPhase === "REVIEW_RVS" && (
          <div className="space-y-4 text-center py-2">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-xs">
              <Clock className="size-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Secondary Clearance in Review</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                BIC verified. Reversal protocol clearing is active. The 7-digit RVRS code entry will unlock automatically.
              </p>
            </div>

            {/* Countdown Box */}
            <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                Clearing Protocol Period Remaining
              </span>
              <div className="text-3xl font-mono font-black text-amber-700 dark:text-amber-300">
                {formatTimer(secondsRvs)}
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleManualRefresh}
                disabled={loading}
                className="text-xs gap-1.5"
              >
                <RotateCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
                Check Clearing Status
              </Button>
            </div>
          </div>
        )}

        {/* ── PHASE 3B: RVS CODE UNLOCKED ── */}
        {txState.verificationPhase === "RVS_REQUIRED" && (
          <div className="space-y-4 text-center py-2">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
              <ShieldCheck className="size-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Reversal Verification (RVRS) Code</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Enter your 7-digit Full Reversal Verification (RVRS) Code for institutional settlement.
              </p>
            </div>

            <form onSubmit={handleSubmitCode} className="space-y-4 pt-1">
              <div className="flex justify-center overflow-x-auto py-2">
                <OTPInput
                  id="rvsCodeModal"
                  length={7}
                  groupAfter={3}
                  value={inputCode}
                  onChange={setInputCode}
                  validationType="numeric"
                  size="sm"
                  autoFocus
                  ariaLabel="RVS Code digit 1"
                />
              </div>

              <Button
                type="submit"
                disabled={loading || inputCode.length !== 7}
                className="w-full font-semibold h-10 gap-1.5"
              >
                {loading ? "Verifying…" : "Verify RVRS Code"}
                <ArrowRight className="size-4" />
              </Button>
            </form>
          </div>
        )}

        {/* ── PHASE 4: WITHDRAWAL LIMIT REACHED (VIP / ADMIN HOLD) ── */}
        {txState.verificationPhase === "LIMIT_HOLD" && (
          <div className="space-y-4 text-center py-2">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-xs">
              <ShieldAlert className="size-6" />
            </div>
            <div className="space-y-1">
              <Badge variant="warning" className="text-[10px]">
                Tier Compliance Checkpoint
              </Badge>
              <h3 className="text-lg font-bold text-foreground">
                Account Withdrawal Limit Reached
              </h3>
            </div>

            <div className="text-xs text-muted-foreground leading-relaxed p-4 rounded-xl border border-border/80 bg-muted/40 text-left space-y-2.5">
              <p>
                Under Federal Financial Compliance Regulations (FinCEN / OFAC) and PrimeVault Institutional Guidelines, this transaction amount exceeds automated self-clearance limits.
              </p>
              <p className="font-semibold text-foreground">
                Please contact the <strong>VIP Center</strong> or your <strong>Bank Administrator</strong> to authorize and adjust your withdrawal clearance limit for this transaction.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleManualRefresh}
                disabled={loading}
                className="w-full sm:w-auto text-xs gap-1.5 font-semibold"
              >
                <RotateCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
                Check Authorization Status
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  // Direct to support or close
                  if (typeof window !== "undefined") {
                    window.location.href = "mailto:support@primevaultbank.com?subject=Withdrawal%20Limit%20Authorization%20" + txState.referenceId
                  }
                }}
                className="w-full sm:w-auto text-xs gap-1.5 font-semibold bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Headphones className="size-3.5" />
                Contact VIP Support
              </Button>
            </div>
          </div>
        )}

        {/* ── PHASE 5: FINAL WARNING / FINAL WITHDRAWAL CODE (FW CODE) ── */}
        {txState.verificationPhase === "FW_REQUIRED" && (
          <div className="space-y-4 text-center py-2">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-xs">
              <Lock className="size-6" />
            </div>
            <div>
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Badge variant="success" className="text-[10px]">
                  Limit Authorized by Admin
                </Badge>
              </div>
              <h3 className="text-lg font-bold">Final Withdrawal Authorization (FW)</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Withdrawal limit cleared. Enter your 3-digit FW Final Warning / Authorization Code to release and settle funds.
              </p>
            </div>

            <form onSubmit={handleSubmitCode} className="space-y-4 pt-1">
              <div className="flex justify-center py-2">
                <OTPInput
                  id="fwCodeModal"
                  length={3}
                  value={inputCode}
                  onChange={setInputCode}
                  validationType="numeric"
                  size="md"
                  autoFocus
                  ariaLabel="FW Code digit 1"
                />
              </div>

              <Button
                type="submit"
                disabled={loading || inputCode.length !== 3}
                className="w-full font-semibold h-10 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {loading ? "Authorizing…" : "Authorize & Complete Transfer"}
                <CheckCircle2 className="size-4" />
              </Button>
            </form>
          </div>
        )}

        {/* ── PHASE COMPLETED: SUCCESS RECEIPT ── */}
        {txState.verificationPhase === "COMPLETED" && (
          <div className="space-y-4 text-center py-2">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-sm">
              <CheckCircle2 className="size-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Verification Cleared!</h3>
              <p className="text-xs text-muted-foreground mt-1">
                All 5 security stages have been verified and cleared by PrimeVault Operations.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-border/80 bg-muted/30 text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reference</span>
                <span className="font-mono font-bold text-foreground">{txState.referenceId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-mono font-bold text-foreground">{formatCurrency(txState.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Beneficiary</span>
                <span className="font-medium text-foreground">{txState.recipientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Clearance Status</span>
                <Badge variant="success" className="text-[10px]">
                  Authorized &amp; Cleared
                </Badge>
              </div>
            </div>

            <Button
              type="button"
              onClick={() => {
                if (onClose) onClose()
                router.refresh()
              }}
              className="w-full font-semibold"
            >
              Close Receipt
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
