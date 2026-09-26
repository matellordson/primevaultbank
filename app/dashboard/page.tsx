import type { Metadata } from "next"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { DashboardClient } from "@/components/DashboardClient"

export const metadata: Metadata = {
  title: "Dashboard | Prime Vault Bank",
  description:
    "Overview of your checking and savings accounts, net liquidity, quick actions, and recent transaction records.",
}

export default async function DashboardPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  if (user.role === "ADMIN") redirect("/admin")

  const accountIds = user.accounts.map((a: any) => a.id)

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

  // Serialize user for client component
  const serializedUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    accounts: user.accounts.map((acc: any) => ({
      id: acc.id,
      accountNumber: acc.accountNumber,
      accountType: acc.accountType,
      balance: Number(acc.balance),
      status: acc.status,
    })),
  }

  const serializedTransactions = transactions.map((tx: any) => ({
    id: tx.id,
    referenceId: tx.referenceId,
    type: tx.type,
    amount: Number(tx.amount),
    status: tx.status,
    description: tx.description,
    recipientName: tx.recipientName,
    createdAt: tx.createdAt.toISOString(),
  }))

  return (
    <DashboardClient
      user={serializedUser}
      transactions={serializedTransactions}
    />
  )
}
