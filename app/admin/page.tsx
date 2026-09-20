import type { Metadata } from "next"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { Navbar } from "@/components/Navbar"
import { AdminControls } from "./admin-controls"

export const metadata: Metadata = {
  title: "Admin Control Desk",
  description:
    "Institutional back-office administration, transfer queue verification, account status management, and central bank clearing settings.",
}

export default async function AdminPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/admin/login")
  }

  if (user.role !== "ADMIN") {
    redirect("/dashboard")
  }

  // Ensure bank settings exist
  const bankSettings = await db.bankSetting.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      bankName: "PrimeVault Central Clearing",
      accountName: "PrimeVault Treasury Reserves",
      accountNumber: "1099482019",
      routingNumber: "021000021",
      swiftBic: "PVLTUS33XXX",
      depositInstructions:
        "Include your Deposit Reference ID in the memo. Payment evidence will be reviewed by Bank Operations.",
      minCheckingThreshold: 100,
      minSavingsThreshold: 500,
      minDepositAmount: 10,
      minWithdrawalAmount: 10,
    },
    update: {},
  })

  // Pending transfers & deposit requests
  const pendingTransactions = await db.transaction.findMany({
    where: { status: "PENDING" },
    include: {
      sourceAccount: { include: { user: true } },
      destinationAccount: { include: { user: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  // All customers (exclude admin accounts)
  const allUsers = await db.user.findMany({
    where: { role: "USER" },
    include: { accounts: { orderBy: { accountType: "asc" } } },
    orderBy: { createdAt: "desc" },
  })

  // Audit logs
  const auditLogs = await db.auditLog.findMany({
    include: { admin: true },
    orderBy: { createdAt: "desc" },
    take: 30,
  })

  const totalAccounts = allUsers.reduce((sum: number, u: any) => sum + u.accounts.length, 0)
  const totalLiquidity = allUsers.reduce(
    (sum: number, u: any) => sum + u.accounts.reduce((aSum: number, a: any) => aSum + Number(a.balance), 0),
    0
  )
  const completedCount = await db.transaction.count({ where: { status: "COMPLETED" } })
  const depositRequestCount = pendingTransactions.filter((t: any) => t.type === "DEPOSIT_REQUEST").length
  const wireCount = pendingTransactions.filter((t: any) => t.type === "EXTERNAL_WIRE").length

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col">
      <Navbar
        user={{
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        }}
      />
      <main className="flex-1 container mx-auto max-w-7xl p-4 sm:p-6 lg:p-8 space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Bank Operations &amp; Back-Office Desk
          </h1>
          <p className="text-sm text-muted-foreground">
            Approve transfers, verify deposits, manage customer accounts, and configure bank settings
          </p>
        </div>

        <AdminControls
          stats={{
            totalUsers: allUsers.length,
            totalAccounts,
            pendingCount: pendingTransactions.length,
            depositRequestCount,
            wireCount,
            totalLiquidity,
            completedCount,
          }}
          pendingTransactions={pendingTransactions.map((tx: any) => ({
            id: tx.id,
            referenceId: tx.referenceId,
            type: tx.type,
            amount: Number(tx.amount),
            currency: tx.currency,
            status: tx.status,
            createdAt: tx.createdAt.toISOString(),
            description: tx.description,
            recipientName: tx.recipientName,
            recipientBank: tx.recipientBank,
            recipientAccountNumber: tx.recipientAccountNumber,
            recipientRoutingNumber: tx.recipientRoutingNumber,
            senderName: tx.sourceAccount?.user?.name || tx.destinationAccount?.user?.name || "System",
            senderAccount: tx.sourceAccount?.accountNumber || tx.destinationAccount?.accountNumber || "N/A",
            // Deposit proof fields
            senderBank: tx.senderBank,
            depositReference: tx.depositReference,
            paymentProof: tx.paymentProof,
          }))}
          users={allUsers.map((u: any) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            createdAt: u.createdAt.toISOString(),
            accounts: u.accounts.map((a: any) => ({
              id: a.id,
              accountNumber: a.accountNumber,
              accountType: a.accountType,
              balance: Number(a.balance),
              status: a.status,
            })),
          }))}
          auditLogs={auditLogs.map((log: any) => ({
            id: log.id,
            adminName: log.admin.name,
            action: log.action,
            details: log.details,
            createdAt: log.createdAt.toISOString(),
          }))}
          bankSettings={{
            bankName: bankSettings.bankName,
            accountName: bankSettings.accountName,
            accountNumber: bankSettings.accountNumber,
            routingNumber: bankSettings.routingNumber,
            swiftBic: bankSettings.swiftBic,
            depositInstructions: bankSettings.depositInstructions,
            minCheckingThreshold: Number(bankSettings.minCheckingThreshold),
            minSavingsThreshold: Number(bankSettings.minSavingsThreshold),
            minDepositAmount: Number(bankSettings.minDepositAmount),
            minWithdrawalAmount: Number(bankSettings.minWithdrawalAmount),
          }}
        />
      </main>
    </div>
  )
}
