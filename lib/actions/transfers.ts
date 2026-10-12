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

export async function getSecurityCodes(): Promise<{
  sortCode: string
  bicCode: string
  rvsCode: string
  fwCode: string
}> {
  const settings = await db.bankSetting.findUnique({ where: { id: "default" } })
  return {
    sortCode: settings?.sortCode ?? "",
    bicCode: settings?.bicCode ?? "",
    rvsCode: settings?.rvsCode ?? "",
    fwCode: settings?.fwCode ?? "",
  }
}

async function getInitialVerificationPhase(): Promise<string> {
  const settings = await db.bankSetting.findUnique({ where: { id: "default" } })
  if (settings?.sortCode) return "SORT_CODE_REQUIRED"
  if (settings?.bicCode) return "REVIEW_BIC"
  if (settings?.rvsCode) return "REVIEW_RVS"
  if (settings?.fwCode) return "FW_REQUIRED"
  return "COMPLETED"
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

  const userTransferLimit = user.transferLimit ? Number(user.transferLimit) : 10000
  if (amount > userTransferLimit) {
    return {
      error: `Transfer amount ($${amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}) exceeds your authorized transfer limit of $${userTransferLimit.toLocaleString("en-US", { minimumFractionDigits: 2 })}. Please contact your Bank Administrator to increase your clearance limit.`,
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
    const initialPhase = await getInitialVerificationPhase()

    // Create PENDING transaction for Bank Operations verification
    const transaction = await db.transaction.create({
      data: {
        referenceId,
        sourceAccount: { connect: { id: sourceAccount.id } },
        destinationAccount: { connect: { id: destAccount.id } },
        amount: new Prisma.Decimal(amount),
        type: "INTERNAL_TRANSFER",
        status: "PENDING",
        verificationPhase: initialPhase,
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
      verificationPhase: initialPhase,
      message: "Internal transfer submitted. Please complete security verification checkpoints.",
    }
  } catch (error) {
    console.error("Internal transfer failed:", error)
    return {
      error:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred while processing the transfer.",
    }
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

  const userTransferLimit = user.transferLimit ? Number(user.transferLimit) : 10000
  if (amount > userTransferLimit) {
    return {
      error: `Wire amount ($${amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}) exceeds your authorized transfer limit of $${userTransferLimit.toLocaleString("en-US", { minimumFractionDigits: 2 })}. Please contact your Bank Administrator to increase your clearance limit.`,
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
    const initialPhase = await getInitialVerificationPhase()

    // ⚠️ Funds are NOT deducted here — they are held until admin approves.
    const transaction = await db.transaction.create({
      data: {
        referenceId,
        sourceAccount: { connect: { id: sourceAccount.id } },
        amount: new Prisma.Decimal(amount),
        type: "EXTERNAL_WIRE",
        status: "PENDING",
        verificationPhase: initialPhase,
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
      verificationPhase: initialPhase,
      message:
        "External wire initiated. Please complete security verification checkpoints.",
    }
  } catch (error) {
    console.error("External wire failed:", error)
    return {
      error:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred while processing the wire request.",
    }
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
        destinationAccount: { connect: { id: destAccount.id } },
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

// ─────────────────────────────────────────────────────────────────────────────
// STAGGERED SECURITY VERIFICATION PIPELINE ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

function formatVerificationState(tx: any) {
  const now = Date.now()
  let phase = tx.verificationPhase || "COMPLETED"

  // Auto-promote REVIEW_BIC to BIC_REQUIRED if time has passed
  if (phase === "REVIEW_BIC" && tx.bicReleaseAt && new Date(tx.bicReleaseAt).getTime() <= now) {
    phase = "BIC_REQUIRED"
  }

  // Auto-promote REVIEW_RVS to RVS_REQUIRED if time has passed
  if (phase === "REVIEW_RVS" && tx.rvsReleaseAt && new Date(tx.rvsReleaseAt).getTime() <= now) {
    phase = "RVS_REQUIRED"
  }

  const secondsRemainingBic =
    tx.bicReleaseAt && new Date(tx.bicReleaseAt).getTime() > now
      ? Math.ceil((new Date(tx.bicReleaseAt).getTime() - now) / 1000)
      : 0

  const secondsRemainingRvs =
    tx.rvsReleaseAt && new Date(tx.rvsReleaseAt).getTime() > now
      ? Math.ceil((new Date(tx.rvsReleaseAt).getTime() - now) / 1000)
      : 0

  return {
    id: tx.id,
    referenceId: tx.referenceId,
    amount: Number(tx.amount),
    type: tx.type,
    recipientName: tx.recipientName || "Beneficiary",
    recipientBank: tx.recipientBank || "PrimeVault Bank",
    recipientAccountNumber: tx.recipientAccountNumber || "",
    verificationPhase: phase,
    bicReleaseAt: tx.bicReleaseAt ? tx.bicReleaseAt.toISOString() : null,
    rvsReleaseAt: tx.rvsReleaseAt ? tx.rvsReleaseAt.toISOString() : null,
    limitClearedAt: tx.limitClearedAt ? tx.limitClearedAt.toISOString() : null,
    secondsRemainingBic,
    secondsRemainingRvs,
    createdAt: tx.createdAt.toISOString(),
  }
}

export async function getUserActiveVerification() {
  try {
    const user = await getCurrentUser()
    if (!user) return null

    const activeTx = await db.transaction.findFirst({
      where: {
        sourceAccount: { userId: user.id },
        status: "PENDING",
        verificationPhase: {
          in: [
            "SORT_CODE_REQUIRED",
            "REVIEW_BIC",
            "BIC_REQUIRED",
            "REVIEW_RVS",
            "RVS_REQUIRED",
            "LIMIT_HOLD",
            "FW_REQUIRED",
          ],
        },
      },
      include: {
        sourceAccount: true,
      },
      orderBy: { createdAt: "desc" },
    })

    if (!activeTx) return null

    return formatVerificationState(activeTx)
  } catch (error) {
    console.error("[getUserActiveVerification] error:", error)
    return null
  }
}

export async function getTransactionVerificationState(transactionId: string) {
  try {
    const user = await getCurrentUser()
    if (!user) return null

    // Look up by primary key first (most reliable), then verify ownership
    const tx = await db.transaction.findUnique({
      where: { id: transactionId },
      include: { sourceAccount: true },
    })

    if (!tx) return null
    // Ownership check: must belong to this user's account
    if (tx.sourceAccount?.userId !== user.id) return null

    return formatVerificationState(tx)
  } catch (error) {
    console.error("[getTransactionVerificationState] error:", error)
    return null
  }
}

export async function verifyPhaseCode(data: { transactionId: string; code: string }) {
  const user = await getCurrentUser()
  if (!user) return { error: "Your session has expired. Please refresh the page and try again." }

  // Direct primary key lookup — most reliable, avoids nested relation filter issues
  const tx = await db.transaction.findUnique({
    where: { id: data.transactionId },
    include: { sourceAccount: true },
  })
  if (!tx) return { error: "Transaction not found. Please refresh and try again." }
  if (tx.sourceAccount?.userId !== user.id) return { error: "Transaction not found. Please refresh and try again." }

  const settings = await db.bankSetting.findUnique({ where: { id: "default" } })
  if (!settings) return { error: "Bank configuration missing." }

  const enteredCode = (data.code || "").trim()
  const now = new Date()

  // Current calculated phase
  let currentPhase = tx.verificationPhase
  if (currentPhase === "REVIEW_BIC" && tx.bicReleaseAt && new Date(tx.bicReleaseAt) <= now) {
    currentPhase = "BIC_REQUIRED"
  }
  if (currentPhase === "REVIEW_RVS" && tx.rvsReleaseAt && new Date(tx.rvsReleaseAt) <= now) {
    currentPhase = "RVS_REQUIRED"
  }

  // Phase 1: Sort Code
  if (currentPhase === "SORT_CODE_REQUIRED") {
    const target = settings.sortCode || "4021"
    if (enteredCode !== target) {
      return { error: "Incorrect Sort Code. Please verify your 4-digit code." }
    }

    // Set 30 minute review timer for BIC code release
    const bicReleaseAt = new Date(Date.now() + 30 * 60 * 1000)
    await db.transaction.update({
      where: { id: tx.id },
      data: {
        verificationPhase: "REVIEW_BIC",
        bicReleaseAt,
      },
    })

    revalidatePath("/transfers")
    revalidatePath("/dashboard")
    revalidatePath("/admin")

    return {
      success: true,
      nextPhase: "REVIEW_BIC",
      bicReleaseAt: bicReleaseAt.toISOString(),
      secondsRemainingBic: 30 * 60,
    }
  }

  // Phase 2: BIC Code
  if (currentPhase === "REVIEW_BIC") {
    return {
      error: "Compliance review is currently in progress. The BIC code entry will unlock once the clearing period concludes.",
    }
  }

  if (currentPhase === "BIC_REQUIRED") {
    const target = (settings.bicCode || "PVLTUS33").toUpperCase()
    if (enteredCode.toUpperCase() !== target) {
      return { error: "Incorrect BIC Code. Please check your 8-character international wire clearance code." }
    }

    // Set 30 minute review timer for RVRS code release
    const rvsReleaseAt = new Date(Date.now() + 30 * 60 * 1000)
    await db.transaction.update({
      where: { id: tx.id },
      data: {
        verificationPhase: "REVIEW_RVS",
        rvsReleaseAt,
      },
    })

    revalidatePath("/transfers")
    revalidatePath("/dashboard")
    revalidatePath("/admin")

    return {
      success: true,
      nextPhase: "REVIEW_RVS",
      rvsReleaseAt: rvsReleaseAt.toISOString(),
      secondsRemainingRvs: 30 * 60,
    }
  }

  // Phase 3: RVS Code
  if (currentPhase === "REVIEW_RVS") {
    return {
      error: "Reversal verification clearance is currently under review. The RVRS code entry will unlock shortly.",
    }
  }

  if (currentPhase === "RVS_REQUIRED") {
    const target = settings.rvsCode || "7192834"
    if (enteredCode !== target) {
      return { error: "Incorrect RVRS Code. Please verify your 7-digit reversal verification code." }
    }

    // Advance to Phase 4: LIMIT_HOLD
    await db.transaction.update({
      where: { id: tx.id },
      data: {
        verificationPhase: "LIMIT_HOLD",
      },
    })

    revalidatePath("/transfers")
    revalidatePath("/dashboard")
    revalidatePath("/admin")

    return {
      success: true,
      nextPhase: "LIMIT_HOLD",
      message: "Account limit reached. Please contact the VIP Center or Bank Administrator.",
    }
  }

  // Phase 4: Limit Hold
  if (currentPhase === "LIMIT_HOLD") {
    return {
      error: "Account limit checkpoint active. Please contact the VIP Center or Bank Administrator to authorize this withdrawal.",
    }
  }

  // Phase 5: Final FW Code
  if (currentPhase === "FW_REQUIRED") {
    const target = settings.fwCode || "842"
    if (enteredCode !== target) {
      return { error: "Incorrect FW Code. Please check your 3-digit final authorization code." }
    }

    // All phases cleared!
    await db.transaction.update({
      where: { id: tx.id },
      data: {
        verificationPhase: "COMPLETED",
      },
    })

    revalidatePath("/transfers")
    revalidatePath("/dashboard")
    revalidatePath("/admin")

    return {
      success: true,
      nextPhase: "COMPLETED",
      message: "Security verification completed successfully! Transfer authorization granted.",
    }
  }

  return { error: "Unrecognized verification phase." }
}
