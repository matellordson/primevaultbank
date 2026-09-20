"use client"

import * as React from "react"
import {
  approveTransfer,
  rejectTransfer,
  adjustBalance,
  toggleAccountStatus,
  updateBankSettings,
} from "@/lib/actions/admin"
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
  }
  pendingTransactions: PendingTx[]
  users: {
    id: string
    name: string
    email: string
    role: string
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
  }
}

type Tab = "PENDING" | "CUSTOMERS" | "AUDIT" | "SETTINGS"

export function AdminControls({
  stats,
  pendingTransactions,
  users,
  auditLogs,
  bankSettings,
}: AdminControlsProps) {
  const [activeTab, setActiveTab] = React.useState<Tab>("PENDING")
  const [processingId, setProcessingId] = React.useState<string | null>(null)
  const [message, setMessage] = React.useState<{ text: string; type: "success" | "error" } | null>(null)

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
    else showMessage(res.message || "Settings saved.", "success")
  }

  const pendingWires = pendingTransactions.filter((t) => t.type === "EXTERNAL_WIRE")
  const pendingDeposits = pendingTransactions.filter((t) => t.type === "DEPOSIT_REQUEST")

  const tabs: { id: Tab; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: "PENDING", label: "Transfer Queue", icon: SendHorizonal, badge: stats.wireCount },
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: "Pending Wires", value: stats.wireCount, icon: Clock, color: "text-amber-500" },
          { label: "Pending Deposits", value: stats.depositRequestCount, icon: Download, color: "text-blue-500" },
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
        {tabs.map(({ id, label, icon: Icon, badge }) => (
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
              <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-bold text-white">
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
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Reference / Date</TableHead>
                        <TableHead>From Account</TableHead>
                        <TableHead>Beneficiary</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingWires.map((tx) => (
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
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
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
                      ))}
                    </TableBody>
                  </Table>
                </div>
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
                <div className="overflow-x-auto">
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
                                Verify &amp; Credit
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
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border/60">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{user.name}</span>
                          <Badge variant={user.role === "ADMIN" ? "destructive" : "secondary"} className="text-[10px]">
                            {user.role}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">{user.email}</div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Joined: {new Date(user.createdAt).toLocaleDateString()}
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
                                variant={acc.status === "ACTIVE" ? "outline" : "destructive"}
                                className="text-[10px] py-0"
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
              <div className="overflow-x-auto">
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

                {/* Real-time Adjustment Validation & Projected Balance */}
                {adjAmount.trim().length > 0 && (
                  <div className="rounded-lg border border-border/80 bg-muted/40 p-2.5 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between font-semibold text-foreground">
                      <span>Adjustment Condition</span>
                      {parseAmount(adjAmount) > 0 &&
                      (adjType === "CREDIT" || parseAmount(adjAmount) <= adjustingAccount.currentBalance) ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="size-3.5" /> Ready
                        </span>
                      ) : (
                        <span className="text-destructive font-medium flex items-center gap-1">
                          <AlertCircle className="size-3.5" /> Condition unmet
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 pt-1 border-t border-border/40">
                      <div
                        className={`flex items-center gap-2 ${
                          parseAmount(adjAmount) > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
                        }`}
                      >
                        {parseAmount(adjAmount) > 0 ? (
                          <CheckCircle2 className="size-3.5 shrink-0" />
                        ) : (
                          <XCircle className="size-3.5 shrink-0" />
                        )}
                        <span>Amount greater than $0.00</span>
                      </div>

                      {adjType === "DEBIT" && (
                        <div
                          className={`flex items-center gap-2 ${
                            parseAmount(adjAmount) <= adjustingAccount.currentBalance
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-destructive"
                          }`}
                        >
                          {parseAmount(adjAmount) <= adjustingAccount.currentBalance ? (
                            <CheckCircle2 className="size-3.5 shrink-0" />
                          ) : (
                            <XCircle className="size-3.5 shrink-0" />
                          )}
                          <span>
                            Debit within balance ({formatCurrency(adjustingAccount.currentBalance)})
                          </span>
                        </div>
                      )}
                    </div>

                    {parseAmount(adjAmount) > 0 &&
                      (adjType === "CREDIT" || parseAmount(adjAmount) <= adjustingAccount.currentBalance) && (
                        <div className="pt-1.5 border-t border-border/40 flex items-center justify-between font-mono text-muted-foreground">
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
    </div>
  )
}
