"use server"

import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { Prisma } from "@prisma/client"

function generateReference(): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.floor(1000 + Math.random() * 9000)
  return `PVB-${timestamp}-${random}`
}

export async function getThresholds(): Promise<{
  checking: number
  savings: number
  minDeposit: number
  minWithdrawal: number
}> {
  const settings = await db.bankSetting.findUnique({ where: { id: "default" } })
  return {
    checking: settings ? Number(settings.minCheckingThreshold) : 100,
    savings: settings ? Number(settings.minSavingsThreshold) : 500,
    minDeposit: settings ? Number(settings.minDepositAmount) : 10,
    minWithdrawal: settings ? Number(settings.minWithdrawalAmount) : 10,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL TRANSFER (pending — verified and executed by Admin Operations)
// ─────────────────────────────────────────────────────────────────────────────
export async function createInternalTransfer(formData: {
  sourceAccountId: string
  amount: number
  description?: string
  recipientAccountNumber: string
}) {
  const user = await getCurrentUser()
  if (!user) return { error: "You must be signed in to perform a transfer." }
  if (user.role === "ADMIN") return { error: "Admin accounts cannot initiate transfers." }

  const { sourceAccountId, amount, description, recipientAccountNumber } = formData

  if (!amount || amount <= 0) return { error: "Please enter a valid amount greater than $0.00." }

  const thresholds = await getThresholds()
  if (amount < thresholds.minWithdrawal) {
    return {
      error: `Transfer amount must be at least the bank minimum of $${thresholds.minWithdrawal.toLocaleString("en-US", { minimumFractionDigits: 2 })}.`,
    }
  }

  const sourceAccount = await db.account.findFirst({
    where: { id: sourceAccountId, userId: user.id },
  })

  if (!sourceAccount) return { error: "Source account not found or does not belong to you." }
  if (sourceAccount.status !== "ACTIVE") {
    return {
      error:
        "Identity verification required. Federal banking compliance requires Tier-1 KYC verification before executing internal transfers.",
    }
  }

  const currentBalance = Number(sourceAccount.balance)
  if (currentBalance <= 0) {
    return {
      error: "Cannot transfer from an empty account ($0.00). Please deposit funds first.",
    }
  }
  const minReserve =
    sourceAccount.accountType === "SAVINGS" ? thresholds.savings : thresholds.checking

  if (currentBalance < amount) {
    return {
      error: `Insufficient funds. Available balance is $${currentBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`,
    }
  }

  if (currentBalance - amount < minReserve) {
    return {
      error: `Transfer would violate your minimum account reserve of $${minReserve.toLocaleString("en-US", { minimumFractionDigits: 2 })}. You must maintain at least $${minReserve.toLocaleString("en-US", { minimumFractionDigits: 2 })} in your ${sourceAccount.accountType.toLowerCase()} account at all times.`,
    }
  }

  if (!recipientAccountNumber) {
    return { error: "Recipient account number is required for internal transfers." }
  }

  const destAccount = await db.account.findUnique({
    where: { accountNumber: recipientAccountNumber },
    include: { user: true },
  })

  if (!destAccount) {
    return { error: `Recipient account number ${recipientAccountNumber} was not found in PrimeVault records.` }
  }

  if (destAccount.id === sourceAccount.id) {
    return { error: "Cannot transfer to your own account." }
  }

  if (destAccount.status !== "ACTIVE") {
    return { error: "The destination account is unverified or currently unable to receive funds." }
  }

  const referenceId = generateReference()

  try {
    // Create PENDING transaction for Bank Operations verification
    const transaction = await db.transaction.create({
      data: {
        referenceId,
        sourceAccountId: sourceAccount.id,
        destinationAccountId: destAccount.id,
        amount: new Prisma.Decimal(amount),
        type: "INTERNAL_TRANSFER",
        status: "PENDING",
        description:
          description || `Internal transfer to ${destAccount.user.name} (${destAccount.accountNumber})`,
        recipientName: destAccount.user.name,
        recipientAccountNumber: destAccount.accountNumber,
        recipientBank: "PrimeVault Bank",
      },
    })

    revalidatePath("/dashboard")
    revalidatePath("/transfers")
    revalidatePath("/admin")

    return {
      success: true,
      transactionId: transaction.id,
      referenceId: transaction.referenceId,
      isPending: true,
      message: "Internal transfer submitted. Bank Operations will verify the recipient account and complete the transfer.",
    }
  } catch (error) {
    console.error("Internal transfer failed:", error)
    return { error: "An unexpected error occurred while processing the transfer." }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EXTERNAL WIRE (pending — funds NOT deducted until admin approves)
// ─────────────────────────────────────────────────────────────────────────────
export async function createExternalWire(formData: {
  sourceAccountId: string
  amount: number
  description?: string
  recipientName: string
  recipientBank: string
  recipientAccountNumber: string
  recipientRoutingNumber?: string
}) {
  const user = await getCurrentUser()
  if (!user) return { error: "You must be signed in to perform a transfer." }
  if (user.role === "ADMIN") return { error: "Admin accounts cannot initiate transfers." }

  const {
    sourceAccountId,
    amount,
    description,
    recipientName,
    recipientBank,
    recipientAccountNumber,
    recipientRoutingNumber,
  } = formData

  if (!amount || amount <= 0) return { error: "Please enter a valid amount greater than $0.00." }
  if (!recipientName || !recipientBank || !recipientAccountNumber) {
    return { error: "Please fill in all recipient bank and account details." }
  }

  const thresholds = await getThresholds()
  if (amount < thresholds.minWithdrawal) {
    return {
      error: `Wire amount must be at least the bank minimum of $${thresholds.minWithdrawal.toLocaleString("en-US", { minimumFractionDigits: 2 })}.`,
    }
  }

  const sourceAccount = await db.account.findFirst({
    where: { id: sourceAccountId, userId: user.id },
  })

  if (!sourceAccount) return { error: "Source account not found or does not belong to you." }
  if (sourceAccount.status !== "ACTIVE") {
    return {
      error:
        "Identity verification required. Outbound wire clearing is restricted until Tier-1 KYC identity verification is approved.",
    }
  }

  const currentBalance = Number(sourceAccount.balance)
  if (currentBalance <= 0) {
    return {
      error: "Cannot wire funds from an empty account ($0.00). Please deposit funds first.",
    }
  }
  const minReserve =
    sourceAccount.accountType === "SAVINGS" ? thresholds.savings : thresholds.checking

  if (currentBalance < amount) {
    return {
      error: `Insufficient funds. Available balance is $${currentBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`,
    }
  }

  if (currentBalance - amount < minReserve) {
    return {
      error: `Transfer would violate your minimum account reserve of $${minReserve.toLocaleString("en-US", { minimumFractionDigits: 2 })}. You must keep at least $${minReserve.toLocaleString("en-US", { minimumFractionDigits: 2 })} in your ${sourceAccount.accountType.toLowerCase()} account.`,
    }
  }

  const referenceId = generateReference()

  try {
    // ⚠️ Funds are NOT deducted here — they are held until admin approves.
    const transaction = await db.transaction.create({
      data: {
        referenceId,
        sourceAccountId: sourceAccount.id,
        amount: new Prisma.Decimal(amount),
        type: "EXTERNAL_WIRE",
        status: "PENDING",
        description:
          description || `External wire to ${recipientName} at ${recipientBank}`,
        recipientName,
        recipientBank,
        recipientAccountNumber,
        recipientRoutingNumber: recipientRoutingNumber || "",
      },
    })

    revalidatePath("/dashboard")
    revalidatePath("/transfers")
    revalidatePath("/admin")

    return {
      success: true,
      transactionId: transaction.id,
      referenceId: transaction.referenceId,
      isPending: true,
      message:
        "External wire submitted and is pending bank operations review. Funds will be debited upon approval.",
    }
  } catch (error) {
    console.error("External wire failed:", error)
    return { error: "An unexpected error occurred while processing the wire request." }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DEPOSIT REQUEST (user submits proof — admin credits)
// ─────────────────────────────────────────────────────────────────────────────
export async function createDepositRequest(formData: {
  destinationAccountId: string
  amount: number
  senderBank: string
  depositReference: string
  paymentProof: string
}) {
  const user = await getCurrentUser()
  if (!user) return { error: "You must be signed in to submit a deposit request." }
  if (user.role === "ADMIN") return { error: "Admin accounts cannot submit deposit requests." }

  const { destinationAccountId, amount, senderBank, depositReference, paymentProof } = formData

  if (!amount || amount <= 0) return { error: "Please enter a valid deposit amount." }

  const thresholds = await getThresholds()
  if (amount < thresholds.minDeposit) {
    return {
      error: `Deposit amount must be at least the bank minimum of $${thresholds.minDeposit.toLocaleString("en-US", { minimumFractionDigits: 2 })}.`,
    }
  }

  if (!senderBank) return { error: "Please provide your sending bank name." }
  if (!depositReference) return { error: "Please provide your transfer reference number." }
  if (!paymentProof) return { error: "Please provide proof of payment." }

  const destAccount = await db.account.findFirst({
    where: { id: destinationAccountId, userId: user.id },
  })

  if (!destAccount) return { error: "Destination account not found." }
  if (destAccount.status !== "ACTIVE") {
    return {
      error:
        "Identity verification required. Please complete Tier-1 KYC verification to activate deposit crediting.",
    }
  }

  const referenceId = `DEP-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`

  try {
    const transaction = await db.transaction.create({
      data: {
        referenceId,
        destinationAccountId: destAccount.id,
        amount: new Prisma.Decimal(amount),
        type: "DEPOSIT_REQUEST",
        status: "PENDING",
        description: `Deposit request to ${destAccount.accountType.toLowerCase()} account`,
        senderBank,
        depositReference,
        paymentProof,
        recipientName: user.name,
        recipientAccountNumber: destAccount.accountNumber,
        recipientBank: "PrimeVault Bank",
      },
    })

    revalidatePath("/dashboard")
    revalidatePath("/deposits")
    revalidatePath("/admin")

    return {
      success: true,
      transactionId: transaction.id,
      referenceId: transaction.referenceId,
      message:
        "Deposit request submitted! Bank Operations will review your payment evidence and credit your account shortly.",
    }
  } catch (error) {
    console.error("Deposit request failed:", error)
    return { error: "An unexpected error occurred while submitting the deposit request." }
  }
}
