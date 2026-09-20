import type { Metadata } from "next"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { DepositForm } from "./deposit-form"
import { formatCurrency } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { CheckCircle2, Clock, XCircle } from "lucide-react"

export const metadata: Metadata = {
  title: "Deposit Funds",
  description:
    "Send funds to the PrimeVault treasury account and submit payment proof for administrative verification and account crediting.",
}

export default async function DepositsPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")

  if (user.role === "ADMIN") redirect("/admin")

  // Load bank settings (with default fallback)
  const settings = await db.bankSetting.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      bankName: "PrimeVault Central Clearing",
      accountName: "PrimeVault Treasury Reserves",
      accountNumber: "1099482019",
      routingNumber: "021000021",
      swiftBic: "PVLTUS33XXX",
      depositInstructions:
        "Include your Deposit Reference ID in the transfer memo. Once payment is sent, submit the proof below.",
      minCheckingThreshold: 100,
      minSavingsThreshold: 500,
      minDepositAmount: 10,
      minWithdrawalAmount: 10,
    },
    update: {},
  })

  const accountIds = user.accounts.map((a: any) => a.id)

  // User's deposit requests
  const depositHistory = await db.transaction.findMany({
    where: {
      type: "DEPOSIT_REQUEST",
      destinationAccountId: { in: accountIds },
    },
    include: { destinationAccount: true },
    orderBy: { createdAt: "desc" },
    take: 10,
  })

  const accounts = user.accounts.map((a: any) => ({
    id: a.id,
    accountNumber: a.accountNumber,
    accountType: a.accountType,
    balance: Number(a.balance),
    status: a.status,
  }))

  function getStatusBadge(status: string) {
    switch (status) {
      case "COMPLETED":
        return (
          <Badge variant="success" className="gap-1">
            <CheckCircle2 className="size-3" />
            Credited
          </Badge>
        )
      case "PENDING":
        return (
          <Badge variant="warning" className="gap-1">
            <Clock className="size-3 animate-pulse" />
            Under Review
          </Badge>
        )
      case "REJECTED":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="size-3" />
            Declined
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Make a Deposit</h1>
        <p className="text-sm text-muted-foreground">
          Send funds to the PrimeVault treasury account and submit your proof of payment for verification
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Payment Instructions */}
        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Step 1 — Bank Transfer Details</CardTitle>
            <CardDescription>
              Send your deposit to the following account. Include your reference ID in the memo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: "Bank Name", value: settings.bankName },
                { label: "Account Name", value: settings.accountName },
                { label: "Account Number", value: settings.accountNumber },
                { label: "Routing Number", value: settings.routingNumber },
                ...(settings.swiftBic ? [{ label: "SWIFT / BIC", value: settings.swiftBic }] : []),
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-start justify-between gap-4 py-2 border-b border-border/40 last:border-0"
                >
                  <span className="text-xs text-muted-foreground shrink-0">{row.label}</span>
                  <span className="text-xs font-semibold text-right font-mono break-all">{row.value}</span>
                </div>
              ))}
            </div>

            {settings.depositInstructions && (
              <div className="mt-4 rounded-lg bg-blue-500/10 border border-blue-500/20 p-3 text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                <strong className="block mb-1">Instructions</strong>
                {settings.depositInstructions}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: Deposit Form */}
        <DepositForm accounts={accounts} minDepositAmount={Number(settings.minDepositAmount ?? 10)} />
      </div>

      {/* Deposit History */}
      {depositHistory.length > 0 && (
        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Deposit Request History</CardTitle>
            <CardDescription>Your recent deposit submissions and their status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>To Account</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {depositHistory.map((tx: any) => (
                    <TableRow key={tx.id}>
                      <TableCell className="font-mono text-xs font-bold">{tx.referenceId}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(tx.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell className="text-xs">
                        {tx.destinationAccount?.accountType || "—"}
                      </TableCell>
                      <TableCell className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                        +{formatCurrency(Number(tx.amount))}
                      </TableCell>
                      <TableCell>{getStatusBadge(tx.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
