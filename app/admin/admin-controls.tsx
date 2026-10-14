"use client"

import * as React from "react"
import {
  approveTransfer,
  rejectTransfer,
  adjustBalance,
  toggleAccountStatus,
  updateBankSettings,
  adminFastForwardBic,
  adminFastForwardRvs,
  adminClearLimitHold,
  updateUserTransferLimit,
} from "@/lib/actions/admin"
import { markEmailSent } from "@/lib/actions/email-actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  Lock,
  Unlock,
  AlertCircle,
  Activity,
  PlusCircle,
  MinusCircle,
  Download,
  Settings,
  SendHorizonal,
  FileText,
  KeyRound,
  ShieldCheck,
  Zap,
  Sliders,
  Mail,
  Copy,
  Check,
  ExternalLink,
  Inbox,
  Archive,
} from "lucide-react"
import { formatCurrency, formatAmountInput, parseAmount } from "@/lib/utils"

type TransactionType =
  | "EXTERNAL_WIRE"
  | "DEPOSIT_REQUEST"
  | "INTERNAL_TRANSFER"
  | "MANUAL_DEPOSIT"
  | "ADMIN_ADJUSTMENT"

interface PendingTx {
  id: string
  referenceId: string
  type: TransactionType
  amount: number
  currency: string
  status: string
  createdAt: string
  description?: string | null
  recipientName?: string | null
  recipientBank?: string | null
  recipientAccountNumber?: string | null
  recipientRoutingNumber?: string | null
  senderName: string
  senderAccount: string
  senderBank?: string | null
  depositReference?: string | null
  paymentProof?: string | null
  verificationPhase?: string | null
  bicReleaseAt?: string | null
  rvsReleaseAt?: string | null
  limitClearedAt?: string | null
}

export interface EmailQueueItemUI {
  id: string
  toEmail: string
  toName: string
  subject: string
  bodyHtml: string
  bodyText: string
  trigger: string
  referenceId?: string | null
  sentAt?: string | null
  createdAt: string
}

interface AdminControlsProps {
  stats: {
    totalUsers: number
    totalAccounts: number
    pendingCount: number
    depositRequestCount: number
    wireCount: number
    totalLiquidity: number
    completedCount: number
    unsentEmailCount?: number
  }
  emails?: {
    unsent: EmailQueueItemUI[]
    sent: EmailQueueItemUI[]
  }
  pendingTransactions: PendingTx[]
  users: {
    id: string
    name: string
    email: string
    role: string
    transferLimit?: number | null
    createdAt: string
    accounts: {
      id: string
      accountNumber: string
      accountType: string
      balance: number
      status: string
    }[]
  }[]
  auditLogs: {
    id: string
    adminName: string
    action: string
    details?: string | null
    createdAt: string
  }[]
  bankSettings: {
    bankName: string
    accountName: string
    accountNumber: string
    routingNumber: string
    swiftBic: string
    depositInstructions: string
    minCheckingThreshold: number
    minSavingsThreshold: number
    minDepositAmount: number
    minWithdrawalAmount: number
    sortCode?: string
    bicCode?: string
    rvsCode?: string
    fwCode?: string
  }
}

type Tab = "PENDING" | "EMAILS" | "CUSTOMERS" | "AUDIT" | "SETTINGS"

export function AdminControls({
  stats,
  emails,
  pendingTransactions,
  users,
  auditLogs,
  bankSettings,
}: AdminControlsProps) {
  const [activeTab, setActiveTab] = React.useState<Tab>("PENDING")
  const [processingId, setProcessingId] = React.useState<string | null>(null)
  const [message, setMessage] = React.useState<{ text: string; type: "success" | "error" } | null>(null)

  // Manual email mailing system state
  const [emailList, setEmailList] = React.useState<{
    unsent: EmailQueueItemUI[]
    sent: EmailQueueItemUI[]
  }>({
    unsent: emails?.unsent ?? [],
    sent: emails?.sent ?? [],
  })
  const [selectedEmail, setSelectedEmail] = React.useState<EmailQueueItemUI | null>(null)
  const [copyFeedback, setCopyFeedback] = React.useState<string | null>(null)
  const [markingSentId, setMarkingSentId] = React.useState<string | null>(null)
  const [emailTabMode, setEmailTabMode] = React.useState<"UNSENT" | "SENT">("UNSENT")
  const [emailBodyFormat, setEmailBodyFormat] = React.useState<"text" | "html">("text")

  React.useEffect(() => {
    if (emails) {
      setEmailList({
        unsent: emails.unsent ?? [],
        sent: emails.sent ?? [],
      })
    }
  }, [emails])

  function copyToClipboard(text: string, fieldName: string) {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text)
    } else {
      const textarea = document.createElement("textarea")
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand("copy")
      document.body.removeChild(textarea)
    }
    setCopyFeedback(fieldName)
    setTimeout(() => {
      setCopyFeedback((curr) => (curr === fieldName ? null : curr))
    }, 2500)
  }

  async function handleMarkEmailSent(email: EmailQueueItemUI) {
    setMarkingSentId(email.id)
    const res = await markEmailSent(email.id)
    setMarkingSentId(null)
    if (res.error) {
      showMessage(res.error, "error")
    } else {
      const updatedSentItem: EmailQueueItemUI = {
        ...email,
        sentAt: new Date().toISOString(),
      }
      setEmailList((prev) => ({
        unsent: prev.unsent.filter((e) => e.id !== email.id),
        sent: [updatedSentItem, ...prev.sent],
      }))
      if (selectedEmail?.id === email.id) {
        setSelectedEmail(updatedSentItem)
      }
      showMessage(`Email marked as sent to ${email.toEmail}.`, "success")
    }
  }

  // Balance adjustment modal
  const [adjustingAccount, setAdjustingAccount] = React.useState<{
    id: string
    accountNumber: string
    userName: string
    currentBalance: number
  } | null>(null)
  const [adjAmount, setAdjAmount] = React.useState("")
  const [adjType, setAdjType] = React.useState<"CREDIT" | "DEBIT">("CREDIT")
  const [adjNotes, setAdjNotes] = React.useState("")
  const [adjLoading, setAdjLoading] = React.useState(false)

  // Reject modal
  const [rejectingId, setRejectingId] = React.useState<string | null>(null)
  const [rejectReason, setRejectReason] = React.useState("")

  // Proof viewer modal
  const [viewingTx, setViewingTx] = React.useState<PendingTx | null>(null)

  // User transfer limit modal
  const [adjustingLimitUser, setAdjustingLimitUser] = React.useState<{
    id: string
    name: string
    email: string
    currentLimit: number
  } | null>(null)
  const [newLimit, setNewLimit] = React.useState("")
  const [limitLoading, setLimitLoading] = React.useState(false)

  // Bank Settings form state
  const [settingsForm, setSettingsForm] = React.useState(bankSettings)
  const [settingsLoading, setSettingsLoading] = React.useState(false)

  function showMessage(text: string, type: "success" | "error") {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 5000)
  }

  async function handleApprove(id: string) {
    setProcessingId(id)
    const res = await approveTransfer(id, "Approved by Bank Operations Desk")
    setProcessingId(null)
    if (res.error) showMessage(res.error, "error")
    else { showMessage(res.message || "Approved successfully.", "success"); setTimeout(() => window.location.reload(), 1200) }
  }

  async function handleRejectSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!rejectingId) return
    setProcessingId(rejectingId)
    const res = await rejectTransfer(rejectingId, rejectReason || "Declined by compliance desk")
    setProcessingId(null)
    setRejectingId(null)
    setRejectReason("")
    if (res.error) showMessage(res.error, "error")
    else { showMessage(res.message || "Transaction declined.", "success"); setTimeout(() => window.location.reload(), 1200) }
  }

  async function handleAdjustSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!adjustingAccount) return
    setAdjLoading(true)
    const parsed = parseAmount(adjAmount)
    if (parsed <= 0) {
      showMessage("Please enter a valid amount.", "error")
      setAdjLoading(false)
      return
    }
    const res = await adjustBalance({
      accountId: adjustingAccount.id,
      amount: parsed,
      type: adjType,
      notes: adjNotes || `Administrative ${adjType.toLowerCase()}`,
    })
    setAdjLoading(false)
    if (res.error) showMessage(res.error, "error")
    else {
      setAdjustingAccount(null)
      setAdjAmount("")
      setAdjNotes("")
      showMessage(res.message || "Balance adjusted.", "success")
      setTimeout(() => window.location.reload(), 1200)
    }
  }

  async function handleToggleStatus(accountId: string) {
    const res = await toggleAccountStatus(accountId)
    if (res.error) showMessage(res.error, "error")
    else { showMessage(res.message || "Status changed.", "success"); setTimeout(() => window.location.reload(), 1200) }
  }

  async function handleUpdateLimitSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!adjustingLimitUser) return
    const parsed = parseAmount(newLimit)
    if (parsed < 0) {
      showMessage("Please enter a valid transfer limit (0 or greater).", "error")
      return
    }
    setLimitLoading(true)
    const res = await updateUserTransferLimit(adjustingLimitUser.id, parsed)
    setLimitLoading(false)
    if (res.error) {
      showMessage(res.error, "error")
    } else {
      setAdjustingLimitUser(null)
      showMessage(res.message || "Transfer limit updated successfully.", "success")
      setTimeout(() => window.location.reload(), 1000)
    }
  }

  async function handleSettingsSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSettingsLoading(true)
    const res = await updateBankSettings({
      ...settingsForm,
      minCheckingThreshold: Number(settingsForm.minCheckingThreshold),
      minSavingsThreshold: Number(settingsForm.minSavingsThreshold),
      minDepositAmount: Number(settingsForm.minDepositAmount),
      minWithdrawalAmount: Number(settingsForm.minWithdrawalAmount),
    })
    setSettingsLoading(false)
    if (res.error) showMessage(res.error, "error")
    else {
      showMessage(res.message || "Settings saved.", "success")
      setTimeout(() => window.location.reload(), 1000)
    }
  }

  const pendingWires = pendingTransactions.filter(
    (t) => t.type === "EXTERNAL_WIRE" || t.type === "INTERNAL_TRANSFER"
  )
  const pendingDeposits = pendingTransactions.filter((t) => t.type === "DEPOSIT_REQUEST")

  async function handleFastForwardBic(id: string) {
    setProcessingId(id)
    const res = await adminFastForwardBic(id)
    setProcessingId(null)
    if (res.error) showMessage(res.error, "error")
    else { showMessage(res.message || "BIC code unlocked.", "success"); setTimeout(() => window.location.reload(), 1200) }
  }

  async function handleFastForwardRvs(id: string) {
    setProcessingId(id)
    const res = await adminFastForwardRvs(id)
    setProcessingId(null)
    if (res.error) showMessage(res.error, "error")
    else { showMessage(res.message || "RVRS code unlocked.", "success"); setTimeout(() => window.location.reload(), 1200) }
  }

  async function handleClearLimitHold(id: string) {
    setProcessingId(id)
    const res = await adminClearLimitHold(id)
    setProcessingId(null)
    if (res.error) showMessage(res.error, "error")
    else { showMessage(res.message || "Limit authorized. FW code unlocked.", "success"); setTimeout(() => window.location.reload(), 1200) }
  }

  function getPhaseLabel(phase?: string | null) {
    switch (phase) {
      case "SORT_CODE_REQUIRED": return { label: "Phase 1: Sort Code", color: "bg-violet-100 text-violet-900 border-violet-300 font-bold" }
      case "REVIEW_BIC": return { label: "Phase 2: BIC Review", color: "bg-amber-100 text-amber-900 border-amber-300 font-bold" }
      case "BIC_REQUIRED": return { label: "Phase 2: BIC Code", color: "bg-blue-100 text-blue-900 border-blue-300 font-bold" }
      case "REVIEW_RVS": return { label: "Phase 3: RVRS Review", color: "bg-amber-100 text-amber-900 border-amber-300 font-bold" }
      case "RVS_REQUIRED": return { label: "Phase 3: RVRS Code", color: "bg-cyan-100 text-cyan-900 border-cyan-300 font-bold" }
      case "LIMIT_HOLD": return { label: "Phase 4: Limit Hold", color: "bg-rose-100 text-rose-900 border-rose-300 font-bold" }
      case "FW_REQUIRED": return { label: "Phase 5: Final Code", color: "bg-orange-100 text-orange-900 border-orange-300 font-bold" }
      case "COMPLETED": return { label: "Verified", color: "bg-emerald-100 text-emerald-900 border-emerald-300 font-bold" }
      default: return null
    }
  }


  const tabs: { id: Tab; label: string; icon: React.ElementType; badge?: number; badgeColor?: string }[] = [
    { id: "PENDING", label: "Transfer Queue", icon: SendHorizonal, badge: stats.wireCount },
    {
      id: "EMAILS",
      label: "Email Desk",
      icon: Mail,
      badge: emailList.unsent.length,
      badgeColor: "bg-rose-100 text-rose-900 border border-rose-300",
    },
    { id: "CUSTOMERS", label: "Customers", icon: Users },
    { id: "AUDIT", label: "Audit Trail", icon: Activity },
    { id: "SETTINGS", label: "Bank Settings", icon: Settings },
  ]

  return (
    <div className="space-y-6">
      {/* Alert banner */}
      {message && (
        <div
          className={`flex items-center gap-2 p-3.5 rounded-lg border text-sm ${
            message.type === "success"
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
              : "bg-destructive/10 text-destructive border-destructive/20"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="size-4 shrink-0" />
          ) : (
            <AlertCircle className="size-4 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: "Pending Wires", value: stats.wireCount, icon: Clock, color: "text-amber-500" },
          { label: "Pending Deposits", value: stats.depositRequestCount, icon: Download, color: "text-blue-500" },
          { label: "Unsent Emails", value: emailList.unsent.length, icon: Mail, color: "text-rose-500" },
          { label: "Customers", value: stats.totalUsers, icon: Users, color: "text-primary" },
          {
            label: "System Liquidity",
            value: formatCurrency(stats.totalLiquidity),
            icon: DollarSign,
            color: "text-emerald-500",
            isString: true,
          },
          { label: "Settled", value: stats.completedCount, icon: CheckCircle2, color: "text-emerald-500" },
        ].map((kpi) => {
          const Icon = kpi.icon
          return (
            <Card key={kpi.label} className="shadow-sm border-border/80">
              <CardHeader className="pb-1 pt-4 px-4">
                <CardDescription className="text-[10px] font-semibold uppercase tracking-wider truncate">
                  {kpi.label}
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="flex items-end justify-between gap-1">
                  <span className={`font-extrabold ${kpi.isString ? "text-lg" : "text-2xl"} text-foreground leading-none`}>
                    {kpi.value}
                  </span>
                  <Icon className={`size-5 ${kpi.color} shrink-0`} />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/80 gap-1 overflow-x-auto">
        {tabs.map(({ id, label, icon: Icon, badge, badgeColor }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 whitespace-nowrap transition-all ${
              activeTab === id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="size-4" />
            {label}
            {badge != null && badge > 0 && (
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${badgeColor || "bg-amber-100 text-amber-900 border border-amber-300"}`}>
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── TAB 1: TRANSFER QUEUE ── */}
      {activeTab === "PENDING" && (
        <div className="space-y-6">
          {/* External Wires */}
          <Card className="shadow-sm border-border/80">
            <CardHeader>
              <div className="flex items-center gap-2">
                <SendHorizonal className="size-4 text-amber-500" />
                <CardTitle className="text-base">External Wire Requests</CardTitle>
                {pendingWires.length > 0 && (
                  <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-bold text-white">
                    {pendingWires.length}
                  </span>
                )}
              </div>
              <CardDescription>
                Approve to debit the sender and mark as settled. Reject to decline without any fund movement.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingWires.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground text-center">
                  <CheckCircle2 className="size-8 text-emerald-500 mb-2" />
                  <p className="font-medium text-foreground text-sm">No pending wires</p>
                  <p className="text-xs mt-0.5">All external wire requests have been processed.</p>
                </div>
              ) : (
              <>
                {/* Mobile card list */}
                <div className="sm:hidden divide-y divide-border/60">
                  {pendingWires.map((tx) => {
                    const phase = getPhaseLabel(tx.verificationPhase)
                    return (
                      <div key={tx.id} className="py-4 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="font-mono text-xs font-bold">{tx.referenceId}</div>
                            <div className="text-[11px] text-muted-foreground">
                              {new Date(tx.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </div>
                            {phase && (
                              <span className={`inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded border ${phase.color}`}>
                                {phase.label}
                              </span>
                            )}
                          </div>
                          <span className="font-mono font-bold text-base">{formatCurrency(tx.amount)}</span>
                        </div>
                        <div className="text-xs space-y-1">
                          <div><span className="text-muted-foreground">From: </span><span className="font-semibold">{tx.senderName}</span> <span className="font-mono text-muted-foreground">•••• {tx.senderAccount.slice(-4)}</span></div>
                          <div><span className="text-muted-foreground">To: </span><span className="font-semibold">{tx.recipientName || "N/A"}</span> {tx.recipientBank && <span className="text-muted-foreground">– {tx.recipientBank}</span>}</div>
                        </div>
                        {/* Phase-specific admin bypass actions */}
                        {tx.verificationPhase === "REVIEW_BIC" && (
                          <Button
                            size="sm"
                            onClick={() => handleFastForwardBic(tx.id)}
                            disabled={processingId === tx.id}
                            className="w-full bg-amber-500 hover:bg-amber-600 text-white gap-1 text-xs h-8"
                          >
                            <Zap className="size-3.5" />
                            Release BIC Now
                          </Button>
                        )}
                        {tx.verificationPhase === "REVIEW_RVS" && (
                          <Button
                            size="sm"
                            onClick={() => handleFastForwardRvs(tx.id)}
                            disabled={processingId === tx.id}
                            className="w-full bg-amber-500 hover:bg-amber-600 text-white gap-1 text-xs h-8"
                          >
                            <Zap className="size-3.5" />
                            Release RVRS Now
                          </Button>
                        )}
                        {tx.verificationPhase === "LIMIT_HOLD" && (
                          <Button
                            size="sm"
                            onClick={() => handleClearLimitHold(tx.id)}
                            disabled={processingId === tx.id}
                            className="w-full bg-rose-600 hover:bg-rose-700 text-white gap-1 text-xs h-8"
                          >
                            <ShieldCheck className="size-3.5" />
                            Authorize Limit & Release FW
                          </Button>
                        )}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleApprove(tx.id)}
                            disabled={processingId === tx.id}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-1 text-xs h-9"
                          >
                            <CheckCircle2 className="size-3.5" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setRejectingId(tx.id)}
                            disabled={processingId === tx.id}
                            className="flex-1 gap-1 text-xs h-9"
                          >
                            <XCircle className="size-3.5" />
                            Decline
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Desktop table */}
                <div className="hidden sm:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Reference / Date</TableHead>
                        <TableHead>From Account</TableHead>
                        <TableHead>Beneficiary</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Verification Phase</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingWires.map((tx) => {
                        const phase = getPhaseLabel(tx.verificationPhase)
                        return (
                          <TableRow key={tx.id}>
                            <TableCell>
                              <div className="font-mono text-xs font-bold">{tx.referenceId}</div>
                              <div className="text-[11px] text-muted-foreground">
                                {new Date(tx.createdAt).toLocaleString("en-US", {
                                  month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                                })}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-xs font-semibold">{tx.senderName}</div>
                              <div className="font-mono text-[11px] text-muted-foreground">
                                •••• {tx.senderAccount.slice(-4)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-xs font-semibold">{tx.recipientName || "N/A"}</div>
                              <div className="text-[11px] text-muted-foreground">
                                {tx.recipientBank} {tx.recipientAccountNumber ? `(${tx.recipientAccountNumber})` : ""}
                              </div>
                              {tx.recipientRoutingNumber && (
                                <div className="text-[10px] text-muted-foreground/70">
                                  Routing: {tx.recipientRoutingNumber}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="font-mono font-bold text-sm">{formatCurrency(tx.amount)}</span>
                            </TableCell>
                            <TableCell>
                              {phase ? (
                                <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded border ${phase.color}`}>
                                  {phase.label}
                                </span>
                              ) : (
                                <span className="text-[11px] text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2 flex-wrap">
                                {tx.verificationPhase === "REVIEW_BIC" && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleFastForwardBic(tx.id)}
                                    disabled={processingId === tx.id}
                                    className="bg-amber-500 hover:bg-amber-600 text-white gap-1 text-xs h-8"
                                  >
                                    <Zap className="size-3.5" />
                                    Release BIC
                                  </Button>
                                )}
                                {tx.verificationPhase === "REVIEW_RVS" && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleFastForwardRvs(tx.id)}
                                    disabled={processingId === tx.id}
                                    className="bg-amber-500 hover:bg-amber-600 text-white gap-1 text-xs h-8"
                                  >
                                    <Zap className="size-3.5" />
                                    Release RVRS
                                  </Button>
                                )}
                                {tx.verificationPhase === "LIMIT_HOLD" && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleClearLimitHold(tx.id)}
                                    disabled={processingId === tx.id}
                                    className="bg-rose-600 hover:bg-rose-700 text-white gap-1 text-xs h-8"
                                  >
                                    <ShieldCheck className="size-3.5" />
                                    Authorize Limit
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  onClick={() => handleApprove(tx.id)}
                                  disabled={processingId === tx.id}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 text-xs h-8"
                                >
                                  <CheckCircle2 className="size-3.5" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => setRejectingId(tx.id)}
                                  disabled={processingId === tx.id}
                                  className="gap-1 text-xs h-8"
                                >
                                  <XCircle className="size-3.5" />
                                  Decline
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </>

              )}
            </CardContent>
          </Card>

          {/* Deposit Requests */}
          <Card className="shadow-sm border-border/80">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Download className="size-4 text-blue-500" />
                <CardTitle className="text-base">Deposit Verification Queue</CardTitle>
                {pendingDeposits.length > 0 && (
                  <span className="rounded-full bg-blue-500 px-2 py-0.5 text-[11px] font-bold text-white">
                    {pendingDeposits.length}
                  </span>
                )}
              </div>
              <CardDescription>
                Review proof of payment submitted by customers. Approve to credit their account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingDeposits.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground text-center">
                  <CheckCircle2 className="size-8 text-emerald-500 mb-2" />
                  <p className="font-medium text-foreground text-sm">No pending deposits</p>
                  <p className="text-xs mt-0.5">All deposit requests have been processed.</p>
                </div>
              ) : (
                <>
                  {/* Mobile card list */}
                  <div className="sm:hidden divide-y divide-border/60">
                    {pendingDeposits.map((tx) => (
                      <div key={tx.id} className="py-4 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="font-mono text-xs font-bold">{tx.referenceId}</div>
                            <div className="text-[11px] text-muted-foreground">
                              {new Date(tx.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </div>
                          </div>
                          <span className="font-mono font-bold text-base text-emerald-600 dark:text-emerald-400">
                            +{formatCurrency(tx.amount)}
                          </span>
                        </div>
                        <div className="text-xs space-y-1">
                          <div><span className="text-muted-foreground">From: </span><span className="font-semibold">{tx.senderName}</span> <span className="font-mono text-muted-foreground">•••• {tx.senderAccount.slice(-4)}</span></div>
                          <div><span className="text-muted-foreground">Bank: </span>{tx.senderBank || "N/A"}</div>
                          {tx.depositReference && <div><span className="text-muted-foreground">Ref: </span><span className="font-mono">{tx.depositReference}</span></div>}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setViewingTx(tx)}
                            className="flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            <FileText className="size-3" />
                            View proof
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleApprove(tx.id)}
                            disabled={processingId === tx.id}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-1 text-xs h-9"
                          >
                            <CheckCircle2 className="size-3.5" />
                            Verify & Credit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setRejectingId(tx.id)}
                            disabled={processingId === tx.id}
                            className="flex-1 gap-1 text-xs h-9"
                          >
                            <XCircle className="size-3.5" />
                            Decline
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop table */}
                  <div className="hidden sm:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Reference / Date</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Sending Bank</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Proof</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingDeposits.map((tx) => (
                          <TableRow key={tx.id}>
                            <TableCell>
                              <div className="font-mono text-xs font-bold">{tx.referenceId}</div>
                              <div className="text-[11px] text-muted-foreground">
                                {new Date(tx.createdAt).toLocaleString("en-US", {
                                  month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                                })}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-xs font-semibold">{tx.senderName}</div>
                              <div className="font-mono text-[11px] text-muted-foreground">
                                Acc: •••• {tx.senderAccount.slice(-4)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-xs">{tx.senderBank || "N/A"}</div>
                              {tx.depositReference && (
                                <div className="font-mono text-[10px] text-muted-foreground">
                                  Ref: {tx.depositReference}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                                +{formatCurrency(tx.amount)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <button
                                type="button"
                                onClick={() => setViewingTx(tx)}
                                className="flex items-center gap-1 text-xs text-primary hover:underline"
                              >
                                <FileText className="size-3" />
                                View proof
                              </button>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleApprove(tx.id)}
                                  disabled={processingId === tx.id}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 text-xs h-8"
                                >
                                  <CheckCircle2 className="size-3.5" />
                                  Verify & Credit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => setRejectingId(tx.id)}
                                  disabled={processingId === tx.id}
                                  className="gap-1 text-xs h-8"
                                >
                                  <XCircle className="size-3.5" />
                                  Decline
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>

              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── TAB: EMAIL DESK (MANUAL MAILING SYSTEM) ── */}
      {activeTab === "EMAILS" && (
        <div className="space-y-6">
          <Card className="shadow-sm border-border/80">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Mail className="size-5 text-rose-500" />
                    <CardTitle className="text-base font-bold">Manual Email Dispatch Desk</CardTitle>
                    {emailList.unsent.length > 0 && (
                      <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[11px] font-bold text-white">
                        {emailList.unsent.length} pending
                      </span>
                    )}
                  </div>
                </div>

                {/* Sub-view switcher */}
                <div className="flex items-center gap-1.5 p-1 rounded-lg bg-muted/60 border border-border/60 shrink-0">
                  <button
                    type="button"
                    onClick={() => setEmailTabMode("UNSENT")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                      emailTabMode === "UNSENT"
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Inbox className="size-3.5" />
                    Pending Unsent
                    {emailList.unsent.length > 0 && (
                      <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white">
                        {emailList.unsent.length}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmailTabMode("SENT")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                      emailTabMode === "SENT"
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Archive className="size-3.5" />
                    Sent Archive
                    <span className="ml-1 text-[11px] text-muted-foreground">({emailList.sent.length})</span>
                  </button>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {/* ── SUB-VIEW: PENDING UNSENT ── */}
              {emailTabMode === "UNSENT" && (
                <div className="space-y-4">
                  {emailList.unsent.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-14 text-center">
                      <div className="size-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="size-6" />
                      </div>
                      <p className="font-bold text-foreground text-sm">All Emails Dispatched</p>
                      <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                        There are no pending customer notifications.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border/60">
                        {emailList.unsent.map((item) => {
                          const isWelcome = item.trigger === "ACCOUNT_CREATED"
                          return (
                            <div
                              key={item.id}
                              className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-muted/30 px-2 rounded-lg transition-colors"
                            >
                              <div className="space-y-1.5 min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge
                                    className={`text-[10px] font-bold ${
                                      isWelcome
                                        ? "border-blue-300 text-blue-900 bg-blue-100"
                                        : "border-emerald-300 text-emerald-900 bg-emerald-100"
                                    }`}
                                  >
                                    {isWelcome ? "Account Welcome" : "Transaction Confirmed"}
                                  </Badge>

                                  {item.referenceId && (
                                    <span className="font-mono text-[11px] text-muted-foreground">
                                      Ref: {item.referenceId}
                                    </span>
                                  )}

                                  <span className="text-[11px] text-muted-foreground">
                                    • {new Date(item.createdAt).toLocaleString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                </div>

                                <div className="text-sm font-semibold truncate text-foreground">
                                  {item.subject}
                                </div>

                                <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                                  <span className="font-medium text-foreground">{item.toName}</span>
                                  <span>&lt;{item.toEmail}&gt;</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <a
                                  href={`mailto:${item.toEmail}?subject=${encodeURIComponent(item.subject)}&body=${encodeURIComponent(item.bodyText)}`}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                  title="Quick open in system mail client"
                                >
                                  <ExternalLink className="size-3" />
                                  <span className="hidden sm:inline">Mail Client</span>
                                </a>

                                <Button
                                  size="sm"
                                  onClick={() => setSelectedEmail(item)}
                                  className="text-xs h-8 gap-1.5 font-semibold"
                                >
                                  <Copy className="size-3.5" />
                                  View &amp; Copy
                                </Button>

                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleMarkEmailSent(item)}
                                  disabled={markingSentId === item.id}
                                  className="text-xs h-8 gap-1 border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
                                >
                                  <CheckCircle2 className="size-3.5" />
                                  {markingSentId === item.id ? "Marking…" : "Mark Sent"}
                                </Button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                  )}
                </div>
              )}

              {/* ── SUB-VIEW: SENT ARCHIVE ── */}
              {emailTabMode === "SENT" && (
                <div className="space-y-4">
                  {emailList.sent.length === 0 ? (
                    <div className="py-12 text-center text-xs text-muted-foreground">
                      No sent emails in archive yet.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Type</TableHead>
                            <TableHead>Recipient</TableHead>
                            <TableHead>Subject</TableHead>
                            <TableHead>Sent At</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {emailList.sent.map((item) => {
                            const isWelcome = item.trigger === "ACCOUNT_CREATED"
                            return (
                              <TableRow key={item.id}>
                                <TableCell>
                                  <Badge
                                    className={`text-[10px] font-bold ${
                                      isWelcome
                                        ? "border-blue-300 text-blue-900 bg-blue-100"
                                        : "border-emerald-300 text-emerald-900 bg-emerald-100"
                                    }`}
                                  >
                                    {isWelcome ? "Welcome" : "Transaction"}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="text-xs font-semibold">{item.toName}</div>
                                  <div className="text-[11px] text-muted-foreground font-mono">{item.toEmail}</div>
                                </TableCell>
                                <TableCell>
                                  <div className="text-xs max-w-xs truncate font-medium">{item.subject}</div>
                                  {item.referenceId && (
                                    <div className="text-[10px] text-muted-foreground font-mono">
                                      Ref: {item.referenceId}
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                                    {item.sentAt
                                      ? new Date(item.sentAt).toLocaleString("en-US", {
                                          month: "short",
                                          day: "numeric",
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })
                                      : "Sent"}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setSelectedEmail(item)}
                                    className="text-xs h-7 gap-1"
                                  >
                                    <FileText className="size-3" />
                                    View Copy
                                  </Button>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── TAB 2: CUSTOMERS ── */}
      {activeTab === "CUSTOMERS" && (
        <Card className="shadow-sm border-border/80">
          <CardHeader>
            <CardTitle className="text-base">Customer Portfolio Directory</CardTitle>
            <CardDescription>
              View all registered accounts, freeze / unfreeze, and perform balance adjustments
            </CardDescription>
          </CardHeader>
          <CardContent>
            {users.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No customers registered yet.</p>
            ) : (
              <div className="space-y-5">
                {users.map((user) => (
                  <div key={user.id} className="p-4 rounded-xl border border-border/80 bg-card space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{user.name}</span>
                          <Badge variant={user.role === "ADMIN" ? "destructive" : "secondary"} className="text-[10px]">
                            {user.role}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">{user.email}</div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs">
                          <ShieldCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-muted-foreground text-[11px]">Transfer Limit:</span>
                          <span className="font-mono font-bold text-foreground">
                            {formatCurrency(user.transferLimit ?? 10000)}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setAdjustingLimitUser({
                              id: user.id,
                              name: user.name,
                              email: user.email,
                              currentLimit: user.transferLimit ?? 10000,
                            })
                            setNewLimit((user.transferLimit ?? 10000).toString())
                          }}
                          className="text-xs h-7 gap-1"
                        >
                          <Sliders className="size-3" />
                          Set Limit
                        </Button>
                        <span className="text-xs text-muted-foreground hidden lg:inline">
                          Joined: {new Date(user.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {user.accounts.map((acc) => (
                        <div
                          key={acc.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/60"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold">{acc.accountType}</span>
                              <Badge
                                variant={acc.status === "ACTIVE" ? "success" : "destructive"}
                                className="text-[10px] py-0 font-bold"
                              >
                                {acc.status}
                              </Badge>
                            </div>
                            <div className="font-mono text-xs text-muted-foreground">
                              {acc.accountNumber}
                            </div>
                            <div className="font-mono font-bold text-base text-foreground mt-1">
                              {formatCurrency(acc.balance)}
                            </div>
                          </div>

                          <div className="flex flex-col gap-1.5 items-end">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setAdjustingAccount({
                                  id: acc.id,
                                  accountNumber: acc.accountNumber,
                                  userName: user.name,
                                  currentBalance: acc.balance,
                                })
                              }
                              className="text-xs h-7 gap-1"
                            >
                              <DollarSign className="size-3" />
                              Adjust
                            </Button>
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(acc.id)}
                              className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              {acc.status === "ACTIVE" ? (
                                <>
                                  <Lock className="size-3 text-red-500" />
                                  <span>Freeze</span>
                                </>
                              ) : (
                                <>
                                  <Unlock className="size-3 text-emerald-500" />
                                  <span>Unfreeze</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── TAB 3: AUDIT TRAIL ── */}
      {activeTab === "AUDIT" && (
        <Card className="shadow-sm border-border/80">
          <CardHeader>
            <CardTitle className="text-base">Administrative Audit Trail</CardTitle>
            <CardDescription>
              Immutable record of all administrative actions, approvals, and adjustments
            </CardDescription>
          </CardHeader>
          <CardContent>
            {auditLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No audit logs yet.</p>
            ) : (
              <>
                {/* Mobile card list */}
                <div className="sm:hidden divide-y divide-border/60">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="py-3 space-y-1">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <Badge variant="outline" className="font-mono text-[10px]">{log.action}</Badge>
                        <span className="text-[11px] text-muted-foreground font-mono">
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-xs font-semibold">{log.adminName}</div>
                      {log.details && <div className="text-xs text-muted-foreground break-words">{log.details}</div>}
                    </div>
                  ))}
                </div>

                {/* Desktop table */}
                <div className="hidden sm:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Admin</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-xs font-semibold">{log.adminName}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono text-[10px]">
                              {log.action}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-foreground max-w-[300px] truncate">
                            {log.details}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>

            )}
          </CardContent>
        </Card>
      )}

      {/* ── TAB 4: BANK SETTINGS ── */}
      {activeTab === "SETTINGS" && (
        <Card className="shadow-sm border-border/80">
          <CardHeader>
            <CardTitle className="text-base">Treasury Account &amp; Bank Settings</CardTitle>
            <CardDescription>
              Update the account details customers use to make deposits, and set minimum reserve thresholds.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSettingsSubmit} className="space-y-6 max-w-2xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium" htmlFor="bankName">Bank Name</label>
                  <Input
                    id="bankName"
                    value={settingsForm.bankName}
                    onChange={(e) => setSettingsForm((f) => ({ ...f, bankName: e.target.value }))}
                    placeholder="e.g. PrimeVault Central Clearing"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium" htmlFor="accountName">Account / Beneficiary Name</label>
                  <Input
                    id="accountName"
                    value={settingsForm.accountName}
                    onChange={(e) => setSettingsForm((f) => ({ ...f, accountName: e.target.value }))}
                    placeholder="e.g. PrimeVault Treasury Reserves"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium" htmlFor="accountNumber">Account Number</label>
                  <Input
                    id="accountNumber"
                    value={settingsForm.accountNumber}
                    onChange={(e) => setSettingsForm((f) => ({ ...f, accountNumber: e.target.value }))}
                    placeholder="e.g. 1099482019"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium" htmlFor="routingNumber">Routing Number</label>
                  <Input
                    id="routingNumber"
                    value={settingsForm.routingNumber}
                    onChange={(e) => setSettingsForm((f) => ({ ...f, routingNumber: e.target.value }))}
                    placeholder="e.g. 021000021"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium" htmlFor="swiftBic">SWIFT / BIC Code</label>
                  <Input
                    id="swiftBic"
                    value={settingsForm.swiftBic}
                    onChange={(e) => setSettingsForm((f) => ({ ...f, swiftBic: e.target.value }))}
                    placeholder="e.g. PVLTUS33XXX"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-medium" htmlFor="depositInstructions">
                    Deposit Instructions (shown to customers)
                  </label>
                  <textarea
                    id="depositInstructions"
                    rows={3}
                    value={settingsForm.depositInstructions}
                    onChange={(e) => setSettingsForm((f) => ({ ...f, depositInstructions: e.target.value }))}
                    className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Instructions for customers to follow when making a deposit…"
                  />
                </div>
              </div>

              <div className="border-t border-border/60 pt-4">
                <h3 className="text-sm font-semibold mb-3">Minimum Reserve Thresholds</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Customers must maintain at least this balance in each account type to initiate transfers.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium" htmlFor="minChecking">
                      Checking Account Minimum ($)
                    </label>
                    <Input
                      id="minChecking"
                      type="number"
                      min="0"
                      step="0.01"
                      value={settingsForm.minCheckingThreshold}
                      onChange={(e) =>
                        setSettingsForm((f) => ({ ...f, minCheckingThreshold: Number(e.target.value) }))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium" htmlFor="minSavings">
                      Savings Account Minimum ($)
                    </label>
                    <Input
                      id="minSavings"
                      type="number"
                      min="0"
                      step="0.01"
                      value={settingsForm.minSavingsThreshold}
                      onChange={(e) =>
                        setSettingsForm((f) => ({ ...f, minSavingsThreshold: Number(e.target.value) }))
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-border/60 pt-4">
                <h3 className="text-sm font-semibold mb-3">Transaction Limits</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Set the minimum amounts allowed per deposit and withdrawal / transfer request.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium" htmlFor="minDepositAmount">
                      Minimum Deposit Amount ($)
                    </label>
                    <Input
                      id="minDepositAmount"
                      type="number"
                      min="1"
                      step="0.01"
                      value={settingsForm.minDepositAmount}
                      onChange={(e) =>
                        setSettingsForm((f) => ({ ...f, minDepositAmount: Number(e.target.value) }))
                      }
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium" htmlFor="minWithdrawalAmount">
                      Minimum Withdrawal Amount ($)
                    </label>
                    <Input
                      id="minWithdrawalAmount"
                      type="number"
                      min="1"
                      step="0.01"
                      value={settingsForm.minWithdrawalAmount}
                      onChange={(e) =>
                        setSettingsForm((f) => ({ ...f, minWithdrawalAmount: Number(e.target.value) }))
                      }
                      required
                    />
                  </div>
                </div>
              </div>

              {/* ── SECURITY VERIFICATION CODES ── */}
              <div className="border-t border-border/60 pt-4">
                <div className="flex items-center gap-2 mb-1">
                  <KeyRound className="size-4 text-primary" />
                  <h3 className="text-sm font-semibold">Transaction Security Verification Codes</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  Configure the 4 gate codes requested from users at different stages of transfer initiation.
                  Leave any field blank to disable that verification gate.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Sort Code */}
                  <div className="space-y-1.5 p-3 rounded-lg border border-border/70 bg-muted/20">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold" htmlFor="sortCodeInput">
                        Sort Code (4 digits)
                      </label>
                      <Badge className="text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-300">
                        Internal Transfers
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Identifies financial institution &amp; branch. Triggered after recipient account is filled.
                    </p>
                    <Input
                      id="sortCodeInput"
                      maxLength={4}
                      value={settingsForm.sortCode ?? ""}
                      onChange={(e) =>
                        setSettingsForm((f) => ({ ...f, sortCode: e.target.value.replace(/\D/g, "").slice(0, 4) }))
                      }
                      className="font-mono tracking-widest"
                    />
                  </div>

                  {/* BIC Code */}
                  <div className="space-y-1.5 p-3 rounded-lg border border-border/70 bg-muted/20">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold" htmlFor="bicCodeInput">
                        BIC Code (8 characters)
                      </label>
                      <Badge className="text-[10px] font-bold bg-cyan-100 text-cyan-900 border border-cyan-300">
                        External Wires
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Cross-border wire transfer code. Triggered after external wire beneficiary details.
                    </p>
                    <Input
                      id="bicCodeInput"
                      maxLength={8}
                      value={settingsForm.bicCode ?? ""}
                      onChange={(e) =>
                        setSettingsForm((f) => ({ ...f, bicCode: e.target.value.toUpperCase().slice(0, 8) }))
                      }
                      className="font-mono tracking-widest uppercase"
                    />
                  </div>

                  {/* RVS Code */}
                  <div className="space-y-1.5 p-3 rounded-lg border border-border/70 bg-muted/20">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold" htmlFor="rvsCodeInput">
                        RVS Code (7 digits)
                      </label>
                      <Badge className="text-[10px] font-bold bg-violet-100 text-violet-900 border border-violet-300">
                        Internal Transfers
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Full reversal verification code. Triggered after transfer amount entry.
                    </p>
                    <Input
                      id="rvsCodeInput"
                      maxLength={7}
                      value={settingsForm.rvsCode ?? ""}
                      onChange={(e) =>
                        setSettingsForm((f) => ({ ...f, rvsCode: e.target.value.replace(/\D/g, "").slice(0, 7) }))
                      }
                      className="font-mono tracking-widest"
                    />
                  </div>

                  {/* FW Code */}
                  <div className="space-y-1.5 p-3 rounded-lg border border-border/70 bg-muted/20">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold" htmlFor="fwCodeInput">
                        FW Code (3 digits)
                      </label>
                      <Badge className="text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                        All Transfers
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Final withdrawal authorization code. Triggered as the final step before submission.
                    </p>
                    <Input
                      id="fwCodeInput"
                      maxLength={3}
                      value={settingsForm.fwCode ?? ""}
                      onChange={(e) =>
                        setSettingsForm((f) => ({ ...f, fwCode: e.target.value.replace(/\D/g, "").slice(0, 3) }))
                      }
                      className="font-mono tracking-widest"
                    />
                  </div>
                </div>
              </div>

              <Button type="submit" className="font-semibold" disabled={settingsLoading}>
                {settingsLoading ? "Saving…" : "Save Bank Settings"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ── BALANCE ADJUSTMENT MODAL ── */}
      {adjustingAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <Card className="w-full max-w-md shadow-2xl border-border bg-card overflow-hidden my-auto">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Manual Balance Adjustment</CardTitle>
              <CardDescription>
                Account{" "}
                <strong className="text-foreground font-mono">{adjustingAccount.accountNumber}</strong>{" "}
                &mdash; {adjustingAccount.userName}
                <br />
                <span className="text-xs">
                  Current balance:{" "}
                  <strong className="text-foreground">{formatCurrency(adjustingAccount.currentBalance)}</strong>
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAdjustSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjType("CREDIT")}
                    className={`flex items-center justify-center gap-1.5 p-2.5 rounded-lg border text-xs font-bold transition-all ${
                      adjType === "CREDIT"
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                        : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <PlusCircle className="size-4" />
                    Credit (Add)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjType("DEBIT")}
                    className={`flex items-center justify-center gap-1.5 p-2.5 rounded-lg border text-xs font-bold transition-all ${
                      adjType === "DEBIT"
                        ? "border-red-500 bg-red-500/10 text-red-700 dark:text-red-400"
                        : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <MinusCircle className="size-4" />
                    Debit (Remove)
                  </button>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium" htmlFor="adjAmount">
                      Adjustment Amount ($)
                    </label>
                    {adjustingAccount && (
                      <span className="text-xs text-muted-foreground">
                        Current: <strong className="text-foreground">{formatCurrency(adjustingAccount.currentBalance)}</strong>
                      </span>
                    )}
                  </div>
                  <Input
                    id="adjAmount"
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={adjAmount}
                    onChange={(e) => setAdjAmount(formatAmountInput(e.target.value))}
                    className={
                      adjAmount.trim().length > 0
                        ? parseAmount(adjAmount) > 0 &&
                          (adjType === "CREDIT" || parseAmount(adjAmount) <= adjustingAccount.currentBalance)
                          ? "border-emerald-500"
                          : "border-destructive"
                        : ""
                    }
                    required
                  />
                </div>

                {/* Real-time Adjustment Errors Only */}
                {adjAmount.trim().length > 0 &&
                  (parseAmount(adjAmount) <= 0 || (adjType === "DEBIT" && parseAmount(adjAmount) > adjustingAccount.currentBalance)) && (
                    <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-2.5 space-y-1 text-xs">
                      {parseAmount(adjAmount) <= 0 && (
                        <div className="flex items-center gap-1.5 text-destructive font-medium">
                          <XCircle className="size-3.5 shrink-0" />
                          <span>Amount must be greater than $0.00</span>
                        </div>
                      )}
                      {adjType === "DEBIT" && parseAmount(adjAmount) > adjustingAccount.currentBalance && (
                        <div className="flex items-center gap-1.5 text-destructive font-medium">
                          <XCircle className="size-3.5 shrink-0" />
                          <span>Debit exceeds account balance ({formatCurrency(adjustingAccount.currentBalance)})</span>
                        </div>
                      )}
                    </div>
                )}

                {/* Projected New Balance */}
                {adjAmount.trim().length > 0 &&
                  parseAmount(adjAmount) > 0 &&
                  (adjType === "CREDIT" || parseAmount(adjAmount) <= adjustingAccount.currentBalance) && (
                    <div className="flex items-center justify-between font-mono text-xs text-muted-foreground px-0.5">
                      <span>Projected New Balance:</span>
                      <span
                        className={`font-bold ${
                          adjType === "CREDIT"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-foreground"
                        }`}
                      >
                        {formatCurrency(
                          adjType === "CREDIT"
                            ? adjustingAccount.currentBalance + parseAmount(adjAmount)
                            : adjustingAccount.currentBalance - parseAmount(adjAmount)
                        )}
                      </span>
                    </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-medium" htmlFor="adjNotes">
                    Memo / Reason
                  </label>
                  <Input
                    id="adjNotes"
                    placeholder="e.g. Verified deposit credit, fee refund…"
                    value={adjNotes}
                    onChange={(e) => setAdjNotes(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => setAdjustingAccount(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="w-full font-semibold"
                    disabled={
                      adjLoading ||
                      !adjAmount.trim() ||
                      parseAmount(adjAmount) <= 0 ||
                      (adjType === "DEBIT" && parseAmount(adjAmount) > adjustingAccount.currentBalance)
                    }
                  >
                    {adjLoading
                      ? "Applying…"
                      : !adjAmount.trim()
                      ? "Enter Amount"
                      : parseAmount(adjAmount) <= 0
                      ? "Invalid Amount"
                      : adjType === "DEBIT" && parseAmount(adjAmount) > adjustingAccount.currentBalance
                      ? "Exceeds Balance"
                      : `Apply ${adjType === "CREDIT" ? "Credit" : "Debit"}`}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── REJECT MODAL ── */}
      {rejectingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <Card className="w-full max-w-md shadow-2xl border-border bg-card overflow-hidden my-auto">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Decline Transaction</CardTitle>
              <CardDescription>
                Provide a reason. For external wires: no funds will be moved (they were never deducted).
                For deposits: no credit will be issued.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRejectSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium" htmlFor="rejectReason">
                    Decline Reason
                  </label>
                  <Input
                    id="rejectReason"
                    placeholder="e.g. Invalid routing number, insufficient evidence, suspicious activity…"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => setRejectingId(null)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="destructive" className="w-full font-semibold">
                    Confirm Decline
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── PAYMENT PROOF VIEWER MODAL ── */}
      {viewingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <Card className="w-full max-w-lg shadow-2xl border-border bg-card overflow-hidden my-auto">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Payment Proof — {viewingTx.referenceId}</CardTitle>
              <CardDescription>
                Submitted by {viewingTx.senderName} for{" "}
                <span className="font-semibold text-emerald-600">{formatCurrency(viewingTx.amount)}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg border border-border/60 bg-muted/30 p-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-xs">Sending Bank</span>
                  <span className="font-semibold">{viewingTx.senderBank || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-xs">Transfer Reference</span>
                  <span className="font-mono font-semibold">{viewingTx.depositReference || "—"}</span>
                </div>
                <div className="border-t border-border/40 pt-3">
                  <p className="text-xs text-muted-foreground mb-1">Proof of Payment</p>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {viewingTx.paymentProof || "No proof text provided."}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <Button variant="outline" className="w-full" onClick={() => setViewingTx(null)}>
                  Close
                </Button>
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                  onClick={async () => {
                    setViewingTx(null)
                    await handleApprove(viewingTx.id)
                  }}
                  disabled={processingId === viewingTx.id}
                >
                  <CheckCircle2 className="size-4 mr-1" />
                  Verify &amp; Credit
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── TRANSFER LIMIT MODAL ── */}
      {adjustingLimitUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <Card className="w-full max-w-md shadow-2xl border-border bg-card overflow-hidden my-auto">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="size-4 text-primary" />
                <CardTitle className="text-base">Customer Transfer Clearance Limit</CardTitle>
              </div>
              <CardDescription>
                Set unique maximum transfer clearance limit for{" "}
                <span className="font-semibold text-foreground">{adjustingLimitUser.name}</span> ({adjustingLimitUser.email})
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateLimitSubmit} className="space-y-4">
                <div className="p-3 rounded-lg bg-muted/40 border border-border/60 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Current Clearance Limit:</span>
                  <span className="font-mono font-bold text-foreground text-sm">
                    {formatCurrency(adjustingLimitUser.currentLimit)}
                  </span>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold" htmlFor="newLimit">
                    New Transfer Limit ($)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-sm">
                      $
                    </span>
                    <Input
                      id="newLimit"
                      type="text"
                      className="pl-7 font-mono text-sm"
                      placeholder="e.g. 25,000"
                      value={newLimit}
                      onChange={(e) => setNewLimit(formatAmountInput(e.target.value))}
                      required
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Transfers exceeding this clearance limit will be blocked or held for administrative authorization.
                  </p>
                </div>

                {/* Quick Presets */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-muted-foreground">
                    Quick Select Preset:
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[2500, 5000, 10000, 25000, 50000, 100000, 250000, 1000000].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setNewLimit(preset.toLocaleString("en-US"))}
                        className="py-1 px-1.5 text-[11px] font-medium rounded border border-border/80 bg-muted/30 hover:bg-muted text-foreground transition-colors truncate"
                      >
                        ${preset >= 1000000 ? `${preset / 1000000}M` : preset >= 1000 ? `${preset / 1000}k` : preset}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => setAdjustingLimitUser(null)}
                    disabled={limitLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={limitLoading || !newLimit.trim()}
                    className="w-full font-semibold"
                  >
                    {limitLoading ? "Saving…" : "Update Limit"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── EMAIL DISPATCH ASSISTANT MODAL ── */}
      {selectedEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <Card className="w-full max-w-2xl shadow-2xl border-border bg-card overflow-hidden my-auto max-h-[92vh] flex flex-col">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Mail className="size-4 text-primary" />
                    <CardTitle className="text-base font-bold">Email Dispatch Assistant</CardTitle>
                    <Badge
                      className={`text-[10px] font-bold ${
                        selectedEmail.trigger === "ACCOUNT_CREATED"
                          ? "border-blue-300 text-blue-900 bg-blue-100"
                          : "border-emerald-300 text-emerald-900 bg-emerald-100"
                      }`}
                    >
                      {selectedEmail.trigger === "ACCOUNT_CREATED" ? "Account Welcome" : "Transaction Confirmed"}
                    </Badge>
                  </div>
                </div>

                {selectedEmail.sentAt ? (
                  <Badge className="bg-emerald-100 text-emerald-900 border border-emerald-300 hover:bg-emerald-200 font-bold text-[10px] shrink-0 gap-1 shadow-xs">
                    <CheckCircle2 className="size-3" />
                    Dispatched
                  </Badge>
                ) : (
                  <Badge className="bg-rose-100 text-rose-900 border border-rose-300 font-bold text-[10px] shrink-0">
                    Pending Send
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
              {/* One-Click Launch Mail Client */}
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-primary flex items-center gap-1.5 text-xs">
                    <Zap className="size-3.5" />
                    Fast Auto-Fill Launcher
                  </span>
                  <span className="text-[10px] text-muted-foreground">Zero typing required</span>
                </div>
                <a
                  href={`mailto:${selectedEmail.toEmail}?subject=${encodeURIComponent(selectedEmail.subject)}&body=${encodeURIComponent(selectedEmail.bodyText)}`}
                  className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-md bg-primary text-primary-foreground font-semibold text-xs hover:opacity-90 transition-opacity"
                >
                  <ExternalLink className="size-3.5" />
                  Launch Mail Client with Pre-filled Content
                </a>
              </div>

              {/* Recipient Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground">1. Recipient Email (To:)</label>
                  <span className="text-[11px] text-muted-foreground">{selectedEmail.toName}</span>
                </div>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={selectedEmail.toEmail}
                    className="font-mono text-xs bg-muted/40 h-9"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(selectedEmail.toEmail, "to")}
                    className="shrink-0 text-xs h-9 px-3 gap-1.5 font-medium"
                  >
                    {copyFeedback === "to" ? (
                      <>
                        <Check className="size-3.5 text-emerald-600" />
                        <span className="text-emerald-600 font-semibold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="size-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Subject Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">2. Subject Line</label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={selectedEmail.subject}
                    className="text-xs bg-muted/40 font-medium h-9"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(selectedEmail.subject, "subject")}
                    className="shrink-0 text-xs h-9 px-3 gap-1.5 font-medium"
                  >
                    {copyFeedback === "subject" ? (
                      <>
                        <Check className="size-3.5 text-emerald-600" />
                        <span className="text-emerald-600 font-semibold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="size-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Email Body Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground">3. Message Body</label>
                  <div className="flex items-center gap-2">
                    <div className="flex rounded-md border border-border/80 overflow-hidden text-[10px]">
                      <button
                        type="button"
                        onClick={() => setEmailBodyFormat("text")}
                        className={`px-2 py-0.5 ${
                          emailBodyFormat === "text" ? "bg-muted font-bold text-foreground" : "text-muted-foreground hover:bg-muted/50"
                        }`}
                      >
                        Plain Text
                      </button>
                      <button
                        type="button"
                        onClick={() => setEmailBodyFormat("html")}
                        className={`px-2 py-0.5 ${
                          emailBodyFormat === "html" ? "bg-muted font-bold text-foreground" : "text-muted-foreground hover:bg-muted/50"
                        }`}
                      >
                        HTML
                      </button>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        copyToClipboard(
                          emailBodyFormat === "text" ? selectedEmail.bodyText : selectedEmail.bodyHtml,
                          "body"
                        )
                      }
                      className="text-xs h-7 px-2.5 gap-1 font-medium"
                    >
                      {copyFeedback === "body" ? (
                        <>
                          <Check className="size-3 text-emerald-600" />
                          <span className="text-emerald-600 font-semibold">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="size-3" />
                          <span>Copy Body</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {emailBodyFormat === "text" ? (
                  <pre className="p-3.5 rounded-lg bg-muted/40 font-mono text-xs whitespace-pre-wrap max-h-56 overflow-y-auto border border-border/70 select-all leading-relaxed text-foreground">
                    {selectedEmail.bodyText}
                  </pre>
                ) : (
                  <div className="border border-border/70 rounded-lg overflow-hidden max-h-56 overflow-y-auto bg-white p-2">
                    <iframe
                      srcDoc={selectedEmail.bodyHtml}
                      title="HTML Email Preview"
                      className="w-full h-52 border-0"
                      sandbox="allow-same-origin"
                    />
                  </div>
                )}
              </div>

              {/* Reference information */}
              {selectedEmail.referenceId && (
                <div className="text-[11px] text-muted-foreground font-mono">
                  Internal Tracking Reference: {selectedEmail.referenceId}
                </div>
              )}
            </CardContent>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border/60 bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const combined = `To: ${selectedEmail.toEmail}\nSubject: ${selectedEmail.subject}\n\n${selectedEmail.bodyText}`
                  copyToClipboard(combined, "all")
                }}
                className="w-full sm:w-auto text-xs gap-1.5"
              >
                {copyFeedback === "all" ? (
                  <>
                    <Check className="size-3.5 text-emerald-600" />
                    <span className="text-emerald-600 font-semibold">All Details Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5" />
                    <span>Copy All (To + Subject + Body)</span>
                  </>
                )}
              </Button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedEmail(null)}
                  className="flex-1 sm:flex-none text-xs"
                >
                  Close
                </Button>

                {!selectedEmail.sentAt ? (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleMarkEmailSent(selectedEmail)}
                    disabled={markingSentId === selectedEmail.id}
                    className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-1.5"
                  >
                    <CheckCircle2 className="size-3.5" />
                    {markingSentId === selectedEmail.id ? "Saving…" : "Mark as Sent"}
                  </Button>
                ) : (
                  <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="size-3.5" />
                    Dispatched on {new Date(selectedEmail.sentAt).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
