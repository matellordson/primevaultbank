"use server"

import { db } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { revalidatePath } from "next/cache"

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
            ? { destinationAccountId: accountId }
            : { sourceAccountId: accountId }),
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
}): Promise<{ success?: boolean; message?: string; error?: string }> {
  try {
    const admin = await verifyAdmin()

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
      },
    })

    await db.auditLog.create({
      data: {
        adminId: admin.id,
        action: "UPDATE_BANK_SETTINGS",
        details: `Bank settings updated — min deposit: $${params.minDepositAmount}, min withdrawal: $${params.minWithdrawalAmount}, checking reserve: $${params.minCheckingThreshold}, savings reserve: $${params.minSavingsThreshold}`,
      },
    })

    revalidatePath("/admin")
    return { success: true, message: "Bank settings saved successfully." }
  } catch (err: unknown) {
    console.error("[updateBankSettings]", err)
    const msg = err instanceof Error ? err.message : "An unexpected error occurred."
    return { error: msg }
  }
}
