import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const db = new PrismaClient()

async function main() {
  console.log("🌱 Seeding admin user...")

  const adminEmail = process.env.ADMIN_EMAIL || "admin@primevaultbank.com"
  const adminPassword = process.env.ADMIN_PASSWORD || "PrimeVault@Admin2025!"

  const passwordHash = await bcrypt.hash(adminPassword, 10)

  const admin = await db.user.upsert({
    where: { email: adminEmail },
    create: {
      email: adminEmail,
      name: "Bank Operations",
      passwordHash,
      role: "ADMIN",
    },
    update: {
      // Update password hash in case env changed
      passwordHash,
      role: "ADMIN",
      name: "Bank Operations",
    },
  })

  console.log(`✅ Admin user seeded: ${admin.email} (id: ${admin.id})`)

  // Also seed default bank settings if not present
  const settings = await db.bankSetting.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      bankName: "PrimeVault Central Clearing",
      accountName: "PrimeVault Treasury Reserves",
      accountNumber: "1099482019",
      routingNumber: "021000021",
      swiftBic: "PVLTUS33XXX",
      depositInstructions:
        "Include your Deposit Reference ID in the transfer memo. Once payment is sent, submit the proof below.",
      minCheckingThreshold: 100,
      minSavingsThreshold: 500,
      minDepositAmount: 10,
      minWithdrawalAmount: 10,
    },
    update: {},
  })

  console.log(`✅ Bank settings seeded (bank: ${settings.bankName})`)
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
