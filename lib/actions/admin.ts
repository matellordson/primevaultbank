"use server"

import { db } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { Prisma } from "@prisma/client"

async function verifyAdmin() {
  const session = await getSession()
  if (!session) throw new Error("Unauthorized")
  const user = await db.user.findUnique({ where: { id: session.userId } })
  if (!user || user.role !== "ADMIN") throw new Error("Forbidden")
  return user
}

// ─────────────────────────────────────────────
// Approve a pending transaction
// ─────────────────────────────────────────────
export async function approveTransfer(
  transactionId: string,
  adminNotes?: string
): Promise<{ success?: boolean; message?: string; error?: string }> {
  try {
    const admin = await verifyAdmin()

    const tx = await db.transaction.findUnique({
      where: { id: transactionId },
      include: {
        sourceAccount: true,
        destinationAccount: true,
      },
    })

    if (!tx) return { error: "Transaction not found." }
    if (tx.status !== "PENDING") return { error: "Transaction is not in PENDING state." }

    // ── INTERNAL TRANSFER ──
    if (tx.type === "INTERNAL_TRANSFER") {
      if (!tx.recipientAccountNumber) {
        return { error: "No recipient account number recorded on this transaction." }
      }

      // Locate the destination account by account number
      const destAccount = await db.account.findUnique({
        where: { accountNumber: tx.recipientAccountNumber },
      })

      if (!destAccount) {
        return {
          error: `Recipient account number ${tx.recipientAccountNumber} was not found. Please reject this transaction.`,
        }
      }

      if (!tx.sourceAccountId) return { error: "Source account not recorded." }

      // Cannot send to own account
      if (destAccount.id === tx.sourceAccountId) {
        return { error: "Source and destination accounts are the same. Please reject this transaction." }
      }

      // Destination must not be frozen
      if (destAccount.status === "FROZEN") {
        return { error: "Recipient account is frozen. Please reject this transaction." }
      }

      const sourceAccount = await db.account.findUnique({ where: { id: tx.sourceAccountId } })
      if (!sourceAccount) return { error: "Source account not found." }

      const txAmount = Number(tx.amount)

      if (Number(sourceAccount.balance) < txAmount) {
        return { error: "Insufficient funds in sender account. Please reject this transaction." }
      }

      // Atomic debit + credit + mark completed
      await db.$transaction([
        db.account.update({
          where: { id: sourceAccount.id },
          data: { balance: { decrement: txAmount } },
        }),
        db.account.update({
          where: { id: destAccount.id },
          data: { balance: { increment: txAmount } },
        }),
        db.transaction.update({
          where: { id: transactionId },
          data: {
            status: "COMPLETED",
            destinationAccountId: destAccount.id,
            processedAt: new Date(),
            adminNotes: adminNotes || "Approved by Bank Operations Desk",
          },
        }),
        db.auditLog.create({
          data: {
            adminId: admin.id,
            action: "APPROVE_INTERNAL_TRANSFER",
            details: `Approved internal transfer ${tx.referenceId} of $${txAmount.toFixed(2)} from ${sourceAccount.id} to account #${tx.recipientAccountNumber}`,
          },
        }),
      ])

      revalidatePath("/admin")
      revalidatePath("/dashboard")
      revalidatePath("/transfers")
      return { success: true, message: "Internal transfer approved and funds moved successfully." }
    }

    // ── EXTERNAL WIRE ──
    if (tx.type === "EXTERNAL_WIRE") {
      if (!tx.sourceAccountId) return { error: "Source account not recorded." }

      const sourceAccount = await db.account.findUnique({ where: { id: tx.sourceAccountId } })
      if (!sourceAccount) return { error: "Source account not found." }

      const txAmount = Number(tx.amount)
      if (Number(sourceAccount.balance) < txAmount) {
        return { error: "Insufficient funds in sender account." }
      }

      await db.$transaction([
        db.account.update({
          where: { id: sourceAccount.id },
          data: { balance: { decrement: txAmount } },
        }),
        db.transaction.update({
          where: { id: transactionId },
          data: {
            status: "COMPLETED",
            processedAt: new Date(),
            adminNotes: adminNotes || "Approved — wire initiated",
          },
        }),
        db.auditLog.create({
          data: {
            adminId: admin.id,
            action: "APPROVE_EXTERNAL_WIRE",
            details: `Approved external wire ${tx.referenceId} of $${txAmount.toFixed(2)} to ${tx.recipientName ?? "Unknown"} at ${tx.recipientBank ?? "Unknown Bank"}`,
          },
        }),
      ])

      revalidatePath("/admin")
      revalidatePath("/dashboard")
      return { success: true, message: "External wire approved and funds deducted." }
    }

    // ── DEPOSIT REQUEST ──
    if (tx.type === "DEPOSIT_REQUEST") {
      if (!tx.destinationAccountId) return { error: "Destination account not recorded." }

      const destAccount = await db.account.findUnique({ where: { id: tx.destinationAccountId } })
      if (!destAccount) return { error: "Destination account not found." }

      const txAmount = Number(tx.amount)

      await db.$transaction([
        db.account.update({
          where: { id: destAccount.id },
          data: { balance: { increment: txAmount } },
        }),
        db.transaction.update({
          where: { id: transactionId },
          data: {
            status: "COMPLETED",
            processedAt: new Date(),
            adminNotes: adminNotes || "Deposit verified and credited",
          },
        }),
        db.auditLog.create({
          data: {
            adminId: admin.id,
            action: "APPROVE_DEPOSIT",
            details: `Approved deposit ${tx.referenceId} of $${txAmount.toFixed(2)} — credited to account ${destAccount.id}`,
          },
        }),
      ])

      revalidatePath("/admin")
      revalidatePath("/dashboard")
      return { success: true, message: "Deposit verified and credited to customer account." }
    }

    return { error: "Unsupported transaction type for approval." }
  } catch (err: unknown) {
    console.error("[approveTransfer]", err)
    const msg = err instanceof Error ? err.message : "An unexpected error occurred."
    return { error: msg }
  }
}

// ─────────────────────────────────────────────
// Reject a pending transaction
// ─────────────────────────────────────────────
export async function rejectTransfer(
  transactionId: string,
  reason: string
): Promise<{ success?: boolean; message?: string; error?: string }> {
  try {
    const admin = await verifyAdmin()

    const tx = await db.transaction.findUnique({ where: { id: transactionId } })
    if (!tx) return { error: "Transaction not found." }
    if (tx.status !== "PENDING") return { error: "Transaction is not in PENDING state." }

    await db.$transaction([
      db.transaction.update({
        where: { id: transactionId },
        data: {
          status: "REJECTED",
          processedAt: new Date(),
          adminNotes: reason,
        },
      }),
      db.auditLog.create({
        data: {
          adminId: admin.id,
          action: "REJECT_TRANSACTION",
          details: `Rejected transaction ${tx.referenceId} — reason: ${reason}`,
        },
      }),
    ])

    revalidatePath("/admin")
    revalidatePath("/dashboard")
    return { success: true, message: "Transaction declined." }
  } catch (err: unknown) {
    console.error("[rejectTransfer]", err)
    const msg = err instanceof Error ? err.message : "An unexpected error occurred."
    return { error: msg }
  }
}

// ─────────────────────────────────────────────
// Adjust account balance (credit / debit)
// ─────────────────────────────────────────────
export async function adjustBalance(params: {
  accountId: string
  amount: number
  type: "CREDIT" | "DEBIT"
  notes?: string
}): Promise<{ success?: boolean; message?: string; error?: string }> {
  try {
    const admin = await verifyAdmin()
    const { accountId, amount, type, notes } = params

    if (amount <= 0) return { error: "Amount must be greater than zero." }

    const account = await db.account.findUnique({ where: { id: accountId } })
    if (!account) return { error: "Account not found." }

    if (type === "DEBIT" && Number(account.balance) < amount) {
      return { error: `Cannot debit $${amount.toFixed(2)} — account balance is only $${Number(account.balance).toFixed(2)}.` }
    }

    const referenceId = `ADJ-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`

    await db.$transaction([
      db.account.update({
        where: { id: accountId },
        data: {
          balance: type === "CREDIT" ? { increment: amount } : { decrement: amount },
        },
      }),
      db.transaction.create({
        data: {
          referenceId,
          type: "ADMIN_ADJUSTMENT",
          status: "COMPLETED",
          amount,
          currency: account.currency,
          ...(type === "CREDIT"
            ? { destinationAccount: { connect: { id: accountId } } }
            : { sourceAccount: { connect: { id: accountId } } }),
          description: notes || `Manual ${type.toLowerCase()} by admin`,
          adminNotes: notes,
          processedAt: new Date(),
        },
      }),
      db.auditLog.create({
        data: {
          adminId: admin.id,
          action: "MANUAL_BALANCE_ADJUSTMENT",
          details: `${type} of $${amount.toFixed(2)} on account ${account.accountNumber}${notes ? ` — ${notes}` : ""}`,
        },
      }),
    ])

    revalidatePath("/admin")
    revalidatePath("/dashboard")
    return { success: true, message: `Balance ${type === "CREDIT" ? "credited" : "debited"} successfully.` }
  } catch (err: unknown) {
    console.error("[adjustBalance]", err)
    const msg = err instanceof Error ? err.message : "An unexpected error occurred."
    return { error: msg }
  }
}

// ─────────────────────────────────────────────
// Toggle account ACTIVE / FROZEN status
// ─────────────────────────────────────────────
export async function toggleAccountStatus(
  accountId: string
): Promise<{ success?: boolean; message?: string; error?: string }> {
  try {
    const admin = await verifyAdmin()

    const account = await db.account.findUnique({ where: { id: accountId } })
    if (!account) return { error: "Account not found." }

    const newStatus = account.status === "ACTIVE" ? "FROZEN" : "ACTIVE"

    await db.$transaction([
      db.account.update({
        where: { id: accountId },
        data: { status: newStatus },
      }),
      db.auditLog.create({
        data: {
          adminId: admin.id,
          action: newStatus === "FROZEN" ? "FREEZE_ACCOUNT" : "UNFREEZE_ACCOUNT",
          details: `Account ${account.accountNumber} ${newStatus === "FROZEN" ? "frozen" : "unfrozen"} by admin`,
        },
      }),
    ])

    revalidatePath("/admin")
    revalidatePath("/dashboard")
    return {
      success: true,
      message: `Account ${account.accountNumber} has been ${newStatus === "FROZEN" ? "frozen" : "unfrozen"}.`,
    }
  } catch (err: unknown) {
    console.error("[toggleAccountStatus]", err)
    const msg = err instanceof Error ? err.message : "An unexpected error occurred."
    return { error: msg }
  }
}

// ─────────────────────────────────────────────
// Set unique transfer limit for a customer
// ─────────────────────────────────────────────
export async function updateUserTransferLimit(
  userId: string,
  transferLimit: number
): Promise<{ success?: boolean; message?: string; error?: string }> {
  try {
    const admin = await verifyAdmin()

    if (transferLimit < 0) {
      return { error: "Transfer limit cannot be negative." }
    }

    const targetUser = await db.user.findUnique({ where: { id: userId } })
    if (!targetUser) return { error: "Customer not found." }

    await db.$transaction([
      db.user.update({
        where: { id: userId },
        data: { transferLimit: new Prisma.Decimal(transferLimit) },
      }),
      db.auditLog.create({
        data: {
          admin: { connect: { id: admin.id } },
          action: "SET_USER_TRANSFER_LIMIT",
          details: `Set unique transfer clearance limit to $${transferLimit.toLocaleString("en-US", { minimumFractionDigits: 2 })} for customer ${targetUser.name} (${targetUser.email})`,
        },
      }),
    ])

    revalidatePath("/admin")
    revalidatePath("/transfers")
    revalidatePath("/dashboard")
    return {
      success: true,
      message: `Transfer limit for ${targetUser.name} updated to $${transferLimit.toLocaleString("en-US", { minimumFractionDigits: 2 })}.`,
    }
  } catch (err: unknown) {
    console.error("[updateUserTransferLimit]", err)
    const msg = err instanceof Error ? err.message : "An unexpected error occurred."
    return { error: msg }
  }
}

// ─────────────────────────────────────────────
// Update bank-wide settings
// ─────────────────────────────────────────────
export async function updateBankSettings(params: {
  bankName: string
  accountName: string
  accountNumber: string
  routingNumber: string
  swiftBic?: string
  depositInstructions?: string
  minCheckingThreshold: number
  minSavingsThreshold: number
  minDepositAmount: number
  minWithdrawalAmount: number
  // Security codes (empty string = gate disabled)
  sortCode?: string
  bicCode?: string
  rvsCode?: string
  fwCode?: string
}): Promise<{ success?: boolean; message?: string; error?: string }> {
  try {
    const admin = await verifyAdmin()

    const codeData = {
      sortCode: params.sortCode ?? "",
      bicCode: params.bicCode ?? "",
      rvsCode: params.rvsCode ?? "",
      fwCode: params.fwCode ?? "",
    }

    await db.bankSetting.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        bankName: params.bankName,
        accountName: params.accountName,
        accountNumber: params.accountNumber,
        routingNumber: params.routingNumber,
        swiftBic: params.swiftBic ?? "",
        depositInstructions: params.depositInstructions ?? "",
        minCheckingThreshold: params.minCheckingThreshold,
        minSavingsThreshold: params.minSavingsThreshold,
        minDepositAmount: params.minDepositAmount,
        minWithdrawalAmount: params.minWithdrawalAmount,
        ...codeData,
      },
      update: {
        bankName: params.bankName,
        accountName: params.accountName,
        accountNumber: params.accountNumber,
        routingNumber: params.routingNumber,
        swiftBic: params.swiftBic ?? "",
        depositInstructions: params.depositInstructions ?? "",
        minCheckingThreshold: params.minCheckingThreshold,
        minSavingsThreshold: params.minSavingsThreshold,
        minDepositAmount: params.minDepositAmount,
        minWithdrawalAmount: params.minWithdrawalAmount,
        ...codeData,
      },
    })

    await db.auditLog.create({
      data: {
        adminId: admin.id,
        action: "UPDATE_BANK_SETTINGS",
        details: `Bank settings updated — min deposit: $${params.minDepositAmount}, min withdrawal: $${params.minWithdrawalAmount}, checking reserve: $${params.minCheckingThreshold}, savings reserve: $${params.minSavingsThreshold}, codes: [sort: "${codeData.sortCode}", bic: "${codeData.bicCode}", rvs: "${codeData.rvsCode}", fw: "${codeData.fwCode}"]`,
      },
    })

    revalidatePath("/admin")
    revalidatePath("/transfers")
    revalidatePath("/deposits")
    return { success: true, message: "Bank settings saved successfully." }
  } catch (err: unknown) {
    console.error("[updateBankSettings]", err)
    const msg = err instanceof Error ? err.message : "An unexpected error occurred."
    return { error: msg }
  }
}

// ─────────────────────────────────────────────
// Admin Staggered Pipeline Overrides & Clearance
// ─────────────────────────────────────────────

export async function adminFastForwardBic(transactionId: string) {
  try {
    const admin = await verifyAdmin()
    const tx = await db.transaction.findUnique({ where: { id: transactionId } })
    if (!tx) return { error: "Transaction not found." }

    await db.transaction.update({
      where: { id: transactionId },
      data: {
        verificationPhase: "BIC_REQUIRED",
        bicReleaseAt: new Date(),
      },
    })

    await db.auditLog.create({
      data: {
        adminId: admin.id,
        action: "FAST_FORWARD_BIC",
        details: `Admin fast-forwarded review timer and released BIC code for ${tx.referenceId}`,
      },
    })

    revalidatePath("/admin")
    revalidatePath("/transfers")
    revalidatePath("/dashboard")
    return { success: true, message: "BIC code unlocked for user!" }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fast-forward BIC."
    return { error: msg }
  }
}

export async function adminFastForwardRvs(transactionId: string) {
  try {
    const admin = await verifyAdmin()
    const tx = await db.transaction.findUnique({ where: { id: transactionId } })
    if (!tx) return { error: "Transaction not found." }

    await db.transaction.update({
      where: { id: transactionId },
      data: {
        verificationPhase: "RVS_REQUIRED",
        rvsReleaseAt: new Date(),
      },
    })

    await db.auditLog.create({
      data: {
        adminId: admin.id,
        action: "FAST_FORWARD_RVS",
        details: `Admin fast-forwarded review timer and released RVRS code for ${tx.referenceId}`,
      },
    })

    revalidatePath("/admin")
    revalidatePath("/transfers")
    revalidatePath("/dashboard")
    return { success: true, message: "RVRS code unlocked for user!" }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fast-forward RVRS."
    return { error: msg }
  }
}

export async function adminClearLimitHold(transactionId: string) {
  try {
    const admin = await verifyAdmin()
    const tx = await db.transaction.findUnique({ where: { id: transactionId } })
    if (!tx) return { error: "Transaction not found." }

    await db.transaction.update({
      where: { id: transactionId },
      data: {
        verificationPhase: "FW_REQUIRED",
        limitClearedAt: new Date(),
      },
    })

    await db.auditLog.create({
      data: {
        adminId: admin.id,
        action: "AUTHORIZE_LIMIT_GATE",
        details: `Admin cleared withdrawal limit hold and unlocked final FW code for ${tx.referenceId}`,
      },
    })

    revalidatePath("/admin")
    revalidatePath("/transfers")
    revalidatePath("/dashboard")
    return { success: true, message: "Withdrawal limit authorized! Final FW Code unlocked for user." }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to clear limit hold."
    return { error: msg }
  }
}
