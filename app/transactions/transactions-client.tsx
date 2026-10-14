"use client"

import * as React from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatCurrency } from "@/lib/utils"
import {
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Printer,
  Download,
  Receipt,
  ShieldCheck,
  ArrowUpDown,
  RefreshCw,
  Send,
  Building,
  CreditCard,
  Landmark,
  X,
  FileSpreadsheet,
  AlertCircle,
} from "lucide-react"

export interface TransactionItem {
  id: string
  referenceId: string
  type: string
  amount: number
  fee: number
  currency: string
  status: string
  description?: string | null
  recipientName?: string | null
  recipientBank?: string | null
  recipientAccountNumber?: string | null
  recipientRoutingNumber?: string | null
  senderBank?: string | null
  depositReference?: string | null
  paymentProof?: string | null
  adminNotes?: string | null
  verificationPhase?: string | null
  createdAt: string
  processedAt?: string | null
  sourceAccountId?: string | null
  destinationAccountId?: string | null
  sourceAccount?: {
    id: string
    accountNumber: string
    accountType: string
  } | null
  destinationAccount?: {
    id: string
    accountNumber: string
    accountType: string
  } | null
}

interface TransactionsClientProps {
  user: {
    id: string
    name: string
    email: string
    role: string
    accounts: Array<{
      id: string
      accountNumber: string
      accountType: string
      balance: number
      status: string
    }>
  }
  transactions: TransactionItem[]
}

export function TransactionsClient({ user, transactions }: TransactionsClientProps) {
  const [searchTerm, setSearchTerm] = React.useState("")
  const [selectedAccount, setSelectedAccount] = React.useState<string>("ALL")
  const [selectedType, setSelectedType] = React.useState<string>("ALL")
  const [selectedStatus, setSelectedStatus] = React.useState<string>("ALL")
  const [sortBy, setSortBy] = React.useState<"date_desc" | "date_asc" | "amount_desc" | "amount_asc">("date_desc")

  const [copiedRef, setCopiedRef] = React.useState<string | null>(null)
  const [selectedTx, setSelectedTx] = React.useState<TransactionItem | null>(null)

  const userAccountIds = React.useMemo(() => new Set(user.accounts.map((a) => a.id)), [user.accounts])

  // Helper to determine if a transaction is a Credit (+) or Debit (-) for this customer
  const isTransactionCredit = React.useCallback(
    (tx: TransactionItem) => {
      if (tx.type === "DEPOSIT_REQUEST" || tx.type === "MANUAL_DEPOSIT") return true
      if (tx.destinationAccountId && userAccountIds.has(tx.destinationAccountId) && !userAccountIds.has(tx.sourceAccountId || "")) {
        return true
      }
      return false
    },
    [userAccountIds]
  )

  // Copy helper
  const handleCopy = (text: string, refId: string) => {
    navigator.clipboard.writeText(text)
    setCopiedRef(refId)
    setTimeout(() => setCopiedRef(null), 2000)
  }

  // Filtered and sorted transactions
  const filteredTransactions = React.useMemo(() => {
    return transactions
      .filter((tx) => {
        // Search query
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase().trim()
          const matchRef = tx.referenceId.toLowerCase().includes(q)
          const matchDesc = (tx.description || "").toLowerCase().includes(q)
          const matchRecipient = (tx.recipientName || "").toLowerCase().includes(q)
          const matchBank = (tx.recipientBank || tx.senderBank || "").toLowerCase().includes(q)
          const matchType = tx.type.toLowerCase().replace(/_/g, " ").includes(q)
          if (!matchRef && !matchDesc && !matchRecipient && !matchBank && !matchType) {
            return false
          }
        }

        // Account filter
        if (selectedAccount !== "ALL") {
          const matchesSource = tx.sourceAccountId === selectedAccount
          const matchesDest = tx.destinationAccountId === selectedAccount
          if (!matchesSource && !matchesDest) return false
        }

        // Type filter
        if (selectedType !== "ALL") {
          if (tx.type !== selectedType) return false
        }

        // Status filter
        if (selectedStatus !== "ALL") {
          if (tx.status !== selectedStatus) return false
        }

        return true
      })
      .sort((a, b) => {
        if (sortBy === "date_desc") {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        }
        if (sortBy === "date_asc") {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        }
        if (sortBy === "amount_desc") {
          return b.amount - a.amount
        }
        if (sortBy === "amount_asc") {
          return a.amount - b.amount
        }
        return 0
      })
  }, [transactions, searchTerm, selectedAccount, selectedType, selectedStatus, sortBy])

  // Summary Metrics calculations
  const metrics = React.useMemo(() => {
    let totalCredits = 0
    let totalDebits = 0
    let pendingCount = 0
    let pendingAmount = 0

    transactions.forEach((tx) => {
      if (tx.status === "COMPLETED") {
        if (isTransactionCredit(tx)) {
          totalCredits += tx.amount
        } else {
          totalDebits += tx.amount
        }
      } else if (tx.status === "PENDING") {
        pendingCount += 1
        pendingAmount += tx.amount
      }
    })

    return { totalCredits, totalDebits, pendingCount, pendingAmount, totalCount: transactions.length }
  }, [transactions, isTransactionCredit])

  // CSV Export Handler
  const handleExportCSV = () => {
    const headers = [
      "Reference ID",
      "Date",
      "Type",
      "Direction",
      "Amount (USD)",
      "Fee (USD)",
      "Status",
      "Source Account",
      "Destination / Recipient",
      "Recipient Bank",
      "Description",
    ]

    const rows = filteredTransactions.map((tx) => {
      const isCredit = isTransactionCredit(tx)
      return [
        `"${tx.referenceId}"`,
        `"${new Date(tx.createdAt).toISOString()}"`,
        `"${tx.type.replace(/_/g, " ")}"`,
        `"${isCredit ? "CREDIT (+)" : "DEBIT (-)"}"`,
        `"${tx.amount.toFixed(2)}"`,
        `"${tx.fee.toFixed(2)}"`,
        `"${tx.status}"`,
        `"${tx.sourceAccount?.accountNumber ? `••••${tx.sourceAccount.accountNumber.slice(-4)} (${tx.sourceAccount.accountType})` : "External Deposit"}"`,
        `"${tx.recipientName || tx.destinationAccount?.accountNumber || "PrimeVault Reserves"}"`,
        `"${tx.recipientBank || tx.senderBank || "PrimeVault Central"}"`,
        `"${(tx.description || "").replace(/"/g, '""')}"`,
      ].join(",")
    })

    const csvContent = [headers.join(","), ...rows].join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", `PrimeVault_Transactions_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Print Statement Handler
  const handlePrint = () => {
    window.print()
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "INTERNAL_TRANSFER":
        return { label: "Internal Transfer", color: "bg-blue-100 text-blue-900 border-blue-300" }
      case "EXTERNAL_WIRE":
        return { label: "External Wire", color: "bg-indigo-100 text-indigo-900 border-indigo-300" }
      case "DEPOSIT_REQUEST":
        return { label: "Wire Deposit", color: "bg-emerald-100 text-emerald-900 border-emerald-300" }
      case "MANUAL_DEPOSIT":
        return { label: "Treasury Deposit", color: "bg-emerald-100 text-emerald-900 border-emerald-300" }
      case "ADMIN_ADJUSTMENT":
        return { label: "Balance Adjustment", color: "bg-purple-100 text-purple-900 border-purple-300" }
      default:
        return { label: type.replace(/_/g, " "), color: "bg-slate-100 text-slate-800 border-slate-300" }
    }
  }

  const hasActiveFilters =
    Boolean(searchTerm.trim()) ||
    selectedAccount !== "ALL" ||
    selectedType !== "ALL" ||
    selectedStatus !== "ALL" ||
    sortBy !== "date_desc"

  const handleResetFilters = () => {
    setSearchTerm("")
    setSelectedAccount("ALL")
    setSelectedType("ALL")
    setSelectedStatus("ALL")
    setSortBy("date_desc")
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Transaction History
            </h1>
            <Badge className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-bold">
              Real-Time Clearing
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Complete institutional audit trail of incoming settlements, outbound wire transfers, and internal portfolio movements.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="text-xs gap-1.5 font-bold border-slate-300 text-slate-700 bg-white hover:bg-slate-50 shadow-xs"
          >
            <FileSpreadsheet className="size-3.5 text-emerald-600" />
            Export CSV
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="text-xs gap-1.5 font-bold border-slate-300 text-slate-700 bg-white hover:bg-slate-50 shadow-xs"
          >
            <Printer className="size-3.5 text-slate-600" />
            Print Ledger
          </Button>

          <Link href="/transfers">
            <Button size="sm" className="text-xs gap-1.5 font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs">
              <Send className="size-3.5" />
              Transfer Funds
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Overview Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Total Inflow (Credits)</span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <ArrowDownLeft className="size-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-mono font-extrabold text-slate-900">
            {formatCurrency(metrics.totalCredits)}
          </div>
          <p className="text-[11px] text-emerald-700 font-medium">Settled deposits &amp; incoming wires</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Total Outflow (Debits)</span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-red-50 text-red-600">
              <ArrowUpRight className="size-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-mono font-extrabold text-slate-900">
            {formatCurrency(metrics.totalDebits)}
          </div>
          <p className="text-[11px] text-slate-500 font-medium">Dispatched wires &amp; outgoing transfers</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Pending Settlements</span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <Clock className="size-4 animate-pulse" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-mono font-extrabold text-slate-900">
            {formatCurrency(metrics.pendingAmount)}
          </div>
          <p className="text-[11px] text-amber-800 font-medium">
            {metrics.pendingCount} transaction{metrics.pendingCount === 1 ? "" : "s"} under review
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Ledger Records</span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Receipt className="size-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-mono font-extrabold text-slate-900">
            {metrics.totalCount}
          </div>
          <p className="text-[11px] text-blue-700 font-medium">Audited &amp; cryptographically secured</p>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <Input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search reference, recipient name, bank, memo…"
              className="pl-9 text-xs h-9 bg-slate-50/70 border-slate-200 focus:bg-white"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Account Filter */}
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-700 py-1.5 px-2.5 outline-none hover:bg-slate-100 transition-colors"
            >
              <option value="ALL">All Accounts</option>
              {user.accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.accountType === "CHECKING" ? "Checking" : "Savings"} •••{acc.accountNumber.slice(-4)}
                </option>
              ))}
            </select>

            {/* Type Filter */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-700 py-1.5 px-2.5 outline-none hover:bg-slate-100 transition-colors"
            >
              <option value="ALL">All Transfer Types</option>
              <option value="INTERNAL_TRANSFER">Internal Transfer</option>
              <option value="EXTERNAL_WIRE">External Wire</option>
              <option value="DEPOSIT_REQUEST">Wire Deposit</option>
              <option value="MANUAL_DEPOSIT">Treasury Deposit</option>
              <option value="ADMIN_ADJUSTMENT">Adjustment</option>
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-700 py-1.5 px-2.5 outline-none hover:bg-slate-100 transition-colors"
            >
              <option value="ALL">All Statuses</option>
              <option value="COMPLETED">Completed / Settled</option>
              <option value="PENDING">Pending Review</option>
              <option value="REJECTED">Declined / Failed</option>
            </select>

            {/* Sort Filter */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="rounded-lg border border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-700 py-1.5 px-2.5 outline-none hover:bg-slate-100 transition-colors"
            >
              <option value="date_desc">Newest First</option>
              <option value="date_asc">Oldest First</option>
              <option value="amount_desc">Highest Amount</option>
              <option value="amount_asc">Lowest Amount</option>
            </select>

            {hasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="text-xs h-8 text-slate-500 hover:text-slate-800 gap-1 px-2"
              >
                <RefreshCw className="size-3" />
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* Results Counter */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
          <span>
            Showing <strong>{filteredTransactions.length}</strong> of <strong>{transactions.length}</strong> recorded transactions
          </span>
          {hasActiveFilters && (
            <span className="text-[11px] text-blue-600 font-semibold">
              Filters applied
            </span>
          )}
        </div>
      </div>

      {/* Transactions Table & Empty State */}
      {filteredTransactions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-xs space-y-3">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <Clock className="size-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No transactions match your criteria</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {transactions.length === 0
              ? "You haven't initiated any transfers or received deposits yet. Fund your account to start your ledger."
              : "Try adjusting your search terms, date range, or status filters to locate your transaction."}
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            {hasActiveFilters ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetFilters}
                className="text-xs font-semibold"
              >
                Clear Filters
              </Button>
            ) : (
              <>
                <Link href="/deposits">
                  <Button size="sm" className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white">
                    Deposit Funds
                  </Button>
                </Link>
                <Link href="/transfers">
                  <Button size="sm" variant="outline" className="text-xs font-bold">
                    Make a Transfer
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">Date &amp; Time</th>
                  <th className="py-3.5 px-4">Reference</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Counterparty / Details</th>
                  <th className="py-3.5 px-4">Account</th>
                  <th className="py-3.5 px-4 text-right">Amount</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransactions.map((tx) => {
                  const isCredit = isTransactionCredit(tx)
                  const typeInfo = getTypeLabel(tx.type)
                  const dateObj = new Date(tx.createdAt)
                  const formattedDate = dateObj.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                  const formattedTime = dateObj.toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })

                  // Account display
                  const associatedAccount = isCredit
                    ? tx.destinationAccount
                    : tx.sourceAccount || tx.destinationAccount

                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                      onClick={() => setSelectedTx(tx)}
                    >
                      {/* Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-900">{formattedDate}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{formattedTime}</div>
                      </td>

                      {/* Reference */}
                      <td className="py-3.5 px-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-slate-800">
                          <span>{tx.referenceId}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(tx.referenceId, tx.referenceId)}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                            title="Copy Reference"
                          >
                            {copiedRef === tx.referenceId ? (
                              <Check className="size-3 text-emerald-600" />
                            ) : (
                              <Copy className="size-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Type Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold border ${typeInfo.color}`}>
                          {typeInfo.label}
                        </span>
                      </td>

                      {/* Counterparty / Details */}
                      <td className="py-3.5 px-4 max-w-[220px]">
                        <div className="font-bold text-slate-900 truncate">
                          {tx.recipientName || tx.senderBank || tx.description || "PrimeVault Clearing"}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {tx.recipientBank ? `${tx.recipientBank}` : tx.depositReference ? `Dep. Ref: ${tx.depositReference}` : tx.description || "Self-clearing"}
                        </div>
                      </td>

                      {/* Account */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {associatedAccount ? (
                          <div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700">
                            <CreditCard className="size-3 text-slate-400" />
                            <span>
                              {associatedAccount.accountType === "CHECKING" ? "Checking" : "Savings"} •••{associatedAccount.accountNumber.slice(-4)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div
                          className={`font-mono text-sm font-extrabold ${
                            isCredit ? "text-emerald-900" : "text-slate-900"
                          }`}
                        >
                          {isCredit ? "+" : "-"}{formatCurrency(tx.amount)}
                        </div>
                        {tx.fee > 0 && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            Fee: {formatCurrency(tx.fee)}
                          </div>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {tx.status === "COMPLETED" ? (
                          <Badge variant="success" className="text-[10px] gap-1">
                            <CheckCircle2 className="size-3 text-emerald-700" />
                            Settled
                          </Badge>
                        ) : tx.status === "PENDING" ? (
                          <Badge variant="warning" className="text-[10px] gap-1">
                            <Clock className="size-3 text-amber-700 animate-pulse" />
                            Pending
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-[10px] gap-1">
                            <XCircle className="size-3 text-red-700" />
                            Declined
                          </Badge>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedTx(tx)}
                          className="h-7 text-xs gap-1 font-semibold text-blue-700 hover:text-blue-800 hover:bg-blue-50"
                        >
                          <Receipt className="size-3.5" />
                          Receipt
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Official Electronic Receipt Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg bg-blue-600 text-white">
                  <Receipt className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Official Electronic Receipt</h3>
                  <p className="text-[10px] text-slate-500 font-mono">Federal Reserve Wire &amp; Central Clearing Record</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedTx(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Receipt Body */}
            <div className="p-6 space-y-5 text-xs">
              {/* Top Banner with Large Amount */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-center space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Total Settlement Amount
                </span>
                <div
                  className={`text-3xl font-extrabold font-mono ${
                    isTransactionCredit(selectedTx) ? "text-emerald-900" : "text-slate-900"
                  }`}
                >
                  {isTransactionCredit(selectedTx) ? "+" : "-"}{formatCurrency(selectedTx.amount)}
                </div>
                <div className="flex items-center justify-center gap-2 pt-1">
                  {selectedTx.status === "COMPLETED" ? (
                    <Badge variant="success" className="text-xs">
                      Settlement Completed
                    </Badge>
                  ) : selectedTx.status === "PENDING" ? (
                    <Badge variant="warning" className="text-xs">
                      Clearing in Progress
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-xs">
                      Declined / Cancelled
                    </Badge>
                  )}
                  <span className="text-[11px] text-slate-400">•</span>
                  <span className="text-[11px] font-mono text-slate-500">
                    {new Date(selectedTx.createdAt).toLocaleString("en-US", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
              </div>

              {/* Transaction Metadata Grid */}
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
                <div className="flex items-center justify-between p-3">
                  <span className="text-slate-500 font-semibold">Reference ID:</span>
                  <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900">
                    <span>{selectedTx.referenceId}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(selectedTx.referenceId, "modal")}
                      className="text-slate-400 hover:text-slate-700"
                      title="Copy"
                    >
                      {copiedRef === "modal" ? (
                        <Check className="size-3 text-emerald-600" />
                      ) : (
                        <Copy className="size-3" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3">
                  <span className="text-slate-500 font-semibold">Channel / Type:</span>
                  <span className="font-bold text-slate-900">{getTypeLabel(selectedTx.type).label}</span>
                </div>

                {selectedTx.sourceAccount && (
                  <div className="flex items-center justify-between p-3">
                    <span className="text-slate-500 font-semibold">Origin Account:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {selectedTx.sourceAccount.accountType} •••{selectedTx.sourceAccount.accountNumber.slice(-4)}
                    </span>
                  </div>
                )}

                {selectedTx.recipientName && (
                  <div className="flex items-center justify-between p-3">
                    <span className="text-slate-500 font-semibold">Recipient Beneficiary:</span>
                    <span className="font-bold text-slate-900">{selectedTx.recipientName}</span>
                  </div>
                )}

                {selectedTx.recipientBank && (
                  <div className="flex items-center justify-between p-3">
                    <span className="text-slate-500 font-semibold">Recipient Institution:</span>
                    <span className="font-bold text-slate-900">{selectedTx.recipientBank}</span>
                  </div>
                )}

                {selectedTx.recipientAccountNumber && (
                  <div className="flex items-center justify-between p-3">
                    <span className="text-slate-500 font-semibold">Masked Recipient Acct:</span>
                    <span className="font-mono font-bold text-slate-900">
                      ••••{selectedTx.recipientAccountNumber.slice(-4)}
                    </span>
                  </div>
                )}

                {selectedTx.senderBank && (
                  <div className="flex items-center justify-between p-3">
                    <span className="text-slate-500 font-semibold">Originating Deposit Bank:</span>
                    <span className="font-bold text-slate-900">{selectedTx.senderBank}</span>
                  </div>
                )}

                {selectedTx.depositReference && (
                  <div className="flex items-center justify-between p-3">
                    <span className="text-slate-500 font-semibold">Deposit Reference:</span>
                    <span className="font-mono font-bold text-slate-900">{selectedTx.depositReference}</span>
                  </div>
                )}

                {selectedTx.description && (
                  <div className="flex items-center justify-between p-3">
                    <span className="text-slate-500 font-semibold">Memo / Purpose:</span>
                    <span className="text-slate-900 font-medium max-w-[250px] text-right truncate">
                      {selectedTx.description}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between p-3">
                  <span className="text-slate-500 font-semibold">Processing Fee:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {selectedTx.fee > 0 ? formatCurrency(selectedTx.fee) : "$0.00 (Waived)"}
                  </span>
                </div>
              </div>

              {/* Security Compliance Footer */}
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1 text-[11px] text-slate-500">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <ShieldCheck className="size-3.5 text-blue-600" />
                  <span>Institutional Assurance &amp; FDIC Protection</span>
                </div>
                <p>
                  This electronic advice is issued by PrimeVault Bank, Member FDIC. Electronic transactions are subject to FinCEN and Office of Foreign Assets Control verification protocols.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedTx(null)}
                  className="text-xs"
                >
                  Close
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => window.print()}
                  className="text-xs gap-1.5 font-bold bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Printer className="size-3.5" />
                  Print Receipt
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
