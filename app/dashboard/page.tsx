import type { Metadata } from "next"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CopyButton } from "@/components/CopyButton"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  CreditCard,
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  PlusCircle,
  PiggyBank,
  Wallet,
  Download,
} from "lucide-react"
import { redirect } from "next/navigation"
import { formatCurrency } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Dashboard",
  description:
    "Overview of your checking and savings accounts, net liquidity, quick actions, and recent transaction records.",
}

export default async function DashboardPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  if (user.role === "ADMIN") redirect("/admin")

  const accountIds = user.accounts.map((a) => a.id)

  const transactions = await db.transaction.findMany({
    where: {
      OR: [
        { sourceAccountId: { in: accountIds } },
        { destinationAccountId: { in: accountIds } },
      ],
    },
    include: {
      sourceAccount: true,
      destinationAccount: true,
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  })

  const totalBalance = user.accounts.reduce((sum, acc) => sum + Number(acc.balance), 0)

  const checkingAcc = user.accounts.find((a) => a.accountType === "CHECKING")
  const savingsAcc = user.accounts.find((a) => a.accountType === "SAVINGS")

  function getStatusBadge(status: string) {
    switch (status) {
      case "COMPLETED":
        return (
          <Badge variant="success" className="gap-1 font-medium">
            <CheckCircle2 className="size-3" />
            Completed
          </Badge>
        )
      case "PENDING":
        return (
          <Badge variant="warning" className="gap-1 font-medium">
            <Clock className="size-3 animate-pulse" />
            Under Review
          </Badge>
        )
      case "REJECTED":
        return (
          <Badge variant="destructive" className="gap-1 font-medium">
            <XCircle className="size-3" />
            Declined
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Welcome back, {user.name}
          </h1>
          <p className="text-sm text-muted-foreground">PrimeVault Portfolio Overview</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/deposits">
            <Button variant="outline" className="gap-2 font-semibold">
              <Download className="size-4" />
              Deposit
            </Button>
          </Link>
          <Link href="/transfers">
            <Button className="gap-2 font-semibold shadow-sm">
              <ArrowLeftRight className="size-4" />
              Transfer
            </Button>
          </Link>
        </div>
      </div>

      {/* Account Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Portfolio */}
        <Card className="shadow-sm border-border/80 bg-card text-card-foreground">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Wallet className="size-4" />
                </div>
                <CardDescription className="font-semibold text-foreground">
                  Total Net Liquidity
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                USD
              </Badge>
            </div>
            <CardTitle className="text-3xl font-extrabold text-foreground tracking-tight">
              {formatCurrency(totalBalance)}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>FDIC Insured Simulation</span>
            </div>
          </CardContent>
        </Card>

        {/* Checking Account */}
        <Card className="shadow-sm border-border/80">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="size-4 text-muted-foreground" />
                <CardDescription className="font-semibold text-foreground">
                  Prime Checking
                </CardDescription>
              </div>
              <Badge
                variant={checkingAcc?.status === "ACTIVE" ? "outline" : "destructive"}
                className="text-[10px]"
              >
                {checkingAcc?.status || "ACTIVE"}
              </Badge>
            </div>
            <CardTitle className="text-2xl font-bold">
              {formatCurrency(Number(checkingAcc?.balance || 0))}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Account Number</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-medium text-foreground">
                  {checkingAcc?.accountNumber || "—"}
                </span>
                {checkingAcc?.accountNumber && (
                  <CopyButton text={checkingAcc.accountNumber} title="Copy Checking Account Number" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Savings Account */}
        <Card className="shadow-sm border-border/80">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PiggyBank className="size-4 text-muted-foreground" />
                <CardDescription className="font-semibold text-foreground">
                  Vault High-Yield Savings
                </CardDescription>
              </div>
              <Badge variant="success" className="text-[10px]">
                4.85% APY
              </Badge>
            </div>
            <CardTitle className="text-2xl font-bold">
              {formatCurrency(Number(savingsAcc?.balance || 0))}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Account Number</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-medium text-foreground">
                  {savingsAcc?.accountNumber || "—"}
                </span>
                {savingsAcc?.accountNumber && (
                  <CopyButton text={savingsAcc.accountNumber} title="Copy Savings Account Number" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card className="shadow-sm border-border/80">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Recent Transactions</CardTitle>
            <CardDescription>Live ledger of incoming and outgoing activity</CardDescription>
          </div>
          <Link href="/transfers">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <PlusCircle className="size-3.5" />
              New Transfer
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
              <Clock className="size-10 stroke-[1.5] mb-3 text-muted-foreground/60" />
              <p className="font-medium text-foreground">No transaction history yet</p>
              <p className="text-sm mt-1">
                Make a transfer or deposit to see activity here.
              </p>
              <div className="flex items-center gap-3 mt-4">
                <Link href="/deposits">
                  <Button variant="outline" size="sm">Make Deposit</Button>
                </Link>
                <Link href="/transfers">
                  <Button size="sm">Transfer Funds</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type &amp; Reference</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => {
                    const isSender = accountIds.includes(tx.sourceAccountId || "")
                    const isRecipient = accountIds.includes(tx.destinationAccountId || "")
                    const isOutgoing = isSender && !isRecipient

                    return (
                      <TableRow key={tx.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex size-8 items-center justify-center rounded-full ${
                                isOutgoing
                                  ? "bg-red-500/10 text-red-600 dark:text-red-400"
                                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              }`}
                            >
                              {isOutgoing ? (
                                <ArrowUpRight className="size-4" />
                              ) : (
                                <ArrowDownLeft className="size-4" />
                              )}
                            </div>
                            <div>
                              <div className="font-semibold text-xs">
                                {tx.type.replace(/_/g, " ")}
                              </div>
                              <div className="font-mono text-[11px] text-muted-foreground">
                                {tx.referenceId}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-xs">
                            {tx.recipientName || tx.description || "Transfer"}
                          </div>
                          {tx.recipientBank && (
                            <div className="text-[11px] text-muted-foreground">{tx.recipientBank}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(tx.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </TableCell>
                        <TableCell>{getStatusBadge(tx.status)}</TableCell>
                        <TableCell
                          className={`text-right font-mono font-semibold text-sm ${
                            isOutgoing
                              ? "text-foreground"
                              : "text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {isOutgoing ? "-" : "+"}
                          {formatCurrency(Number(tx.amount))}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
