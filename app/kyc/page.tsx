import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { KycClient } from "./kyc-client"

export const metadata: Metadata = {
  title: "Identity Verification | PrimeVault Bank",
  description: "Complete federal regulatory identity verification (Tier-1 KYC/AML) to activate your PrimeVault banking portfolio.",
}

export default async function KycPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect("/login")
  }

  if (user.role === "ADMIN") {
    redirect("/admin")
  }

  const isVerified = user.accounts.some((a: any) => a.status === "ACTIVE")

  return (
    <KycClient
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        accounts: user.accounts.map((a: any) => ({
          id: a.id,
          accountNumber: a.accountNumber,
          accountType: a.accountType,
          balance: Number(a.balance),
          status: a.status,
        })),
      }}
      isVerified={isVerified}
    />
  )
}
