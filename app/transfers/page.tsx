import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { TransferForm } from "./transfer-form"

export const metadata: Metadata = {
  title: "Transfer Funds",
  description:
    "Execute instant internal transfers between checking and savings or submit external wire requests for bank review.",
}

export default async function TransfersPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  if (user.role === "ADMIN") redirect("/admin")

  const settings = await db.bankSetting.findUnique({ where: { id: "default" } })
  const minCheckingThreshold = settings ? Number(settings.minCheckingThreshold) : 100
  const minSavingsThreshold = settings ? Number(settings.minSavingsThreshold) : 500
  const minWithdrawalAmount = settings ? Number(settings.minWithdrawalAmount ?? 10) : 10

  const accounts = user.accounts.map((a) => ({
    id: a.id,
    accountNumber: a.accountNumber,
    accountType: a.accountType,
    balance: Number(a.balance),
    status: a.status,
  }))

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Transfer Funds</h1>
        <p className="text-sm text-muted-foreground">
          Execute instant internal transfers or submit external wire requests for bank review
        </p>
      </div>

      <TransferForm
        accounts={accounts}
        minCheckingThreshold={minCheckingThreshold}
        minSavingsThreshold={minSavingsThreshold}
        minWithdrawalAmount={minWithdrawalAmount}
      />
    </div>
  )
}
