import type { Metadata } from "next"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { TransactionsClient } from "./transactions-client"

export const metadata: Metadata = {
  title: "Transaction History | PrimeVault Bank",
  description:
    "Comprehensive institutional ledger, real-time wire clearing status, deposit records, and official statement receipts.",
}

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function TransactionsPage() {
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
  })

  // Serialize user accounts
  const serializedAccounts = user.accounts.map((acc: any) => ({
    id: acc.id,
    accountNumber: acc.accountNumber,
    accountType: acc.accountType,
    balance: Number(acc.balance),
    status: acc.status,
  }))

  const serializedTransactions = transactions.map((tx: any) => ({
    id: tx.id,
    referenceId: tx.referenceId,
    type: tx.type,
    amount: Number(tx.amount),
    fee: Number(tx.fee || 0),
    currency: tx.currency,
    status: tx.status,
    description: tx.description,
    recipientName: tx.recipientName,
    recipientBank: tx.recipientBank,
    recipientAccountNumber: tx.recipientAccountNumber,
    recipientRoutingNumber: tx.recipientRoutingNumber,
    senderBank: tx.senderBank,
    depositReference: tx.depositReference,
    paymentProof: tx.paymentProof,
    adminNotes: tx.adminNotes,
    verificationPhase: tx.verificationPhase,
    createdAt: tx.createdAt.toISOString(),
    processedAt: tx.processedAt ? tx.processedAt.toISOString() : null,
    sourceAccountId: tx.sourceAccountId,
    destinationAccountId: tx.destinationAccountId,
    sourceAccount: tx.sourceAccount
      ? {
          id: tx.sourceAccount.id,
          accountNumber: tx.sourceAccount.accountNumber,
          accountType: tx.sourceAccount.accountType,
        }
      : null,
    destinationAccount: tx.destinationAccount
      ? {
          id: tx.destinationAccount.id,
          accountNumber: tx.destinationAccount.accountNumber,
          accountType: tx.destinationAccount.accountType,
        }
      : null,
  }))

  return (
    <TransactionsClient
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        accounts: serializedAccounts,
      }}
      transactions={serializedTransactions}
    />
  )
}
