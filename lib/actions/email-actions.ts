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
// Fetch the full email queue for the admin panel
// ─────────────────────────────────────────────
export async function getEmailQueue(): Promise<{
  unsent: EmailQueueItem[]
  sent: EmailQueueItem[]
  error?: string
}> {
  try {
    await verifyAdmin()

    const [unsent, sent] = await Promise.all([
      db.emailQueue.findMany({
        where: { sentAt: null },
        orderBy: { createdAt: "desc" },
      }),
      db.emailQueue.findMany({
        where: { sentAt: { not: null } },
        orderBy: { sentAt: "desc" },
        take: 50,
      }),
    ])

    return { unsent, sent }
  } catch (err) {
    console.error("[getEmailQueue]", err)
    return { unsent: [], sent: [], error: "Failed to load email queue." }
  }
}

export interface EmailQueueItem {
  id: string
  toEmail: string
  toName: string
  subject: string
  bodyHtml: string
  bodyText: string
  trigger: string
  referenceId: string | null
  sentAt: Date | null
  createdAt: Date
}

// ─────────────────────────────────────────────
// Mark an email as sent
// ─────────────────────────────────────────────
export async function markEmailSent(
  emailId: string
): Promise<{ success?: boolean; error?: string }> {
  try {
    const admin = await verifyAdmin()

    const email = await db.emailQueue.findUnique({ where: { id: emailId } })
    if (!email) return { error: "Email not found." }
    if (email.sentAt) return { error: "This email has already been marked as sent." }

    await db.$transaction([
      db.emailQueue.update({
        where: { id: emailId },
        data: { sentAt: new Date() },
      }),
      db.auditLog.create({
        data: {
          adminId: admin.id,
          action: "EMAIL_MARKED_SENT",
          details: `Marked email "${email.subject}" to ${email.toEmail} as sent (trigger: ${email.trigger})`,
        },
      }),
    ])

    revalidatePath("/admin")
    return { success: true }
  } catch (err) {
    console.error("[markEmailSent]", err)
    return { error: "Failed to mark email as sent." }
  }
}
