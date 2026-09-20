"use server"

import { db } from "@/lib/db"
import { hashPassword, verifyPassword, createSession, clearSession } from "@/lib/auth"
import { redirect } from "next/navigation"

function generateAccountNumber(): string {
  const prefix = "10"
  const randomDigits = Math.floor(10000000 + Math.random() * 90000000).toString()
  return prefix + randomDigits.slice(0, 8)
}

// ─────────────────────────────────────────────────────────────────────────────
// REGISTER (USER only — admin is seeded, not self-registered)
// ─────────────────────────────────────────────────────────────────────────────
export async function registerAction(formData: FormData) {
  const name = formData.get("name") as string
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  if (!name || !email || !password) {
    return { error: "Please fill in all required fields." }
  }

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters long." }
  }

  const existing = await db.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  })

  if (existing) {
    return { error: "An account with this email already exists." }
  }

  try {
    const passwordHash = await hashPassword(password)
    const checkingNumber = generateAccountNumber()
    const savingsNumber = generateAccountNumber()

    const user = await db.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        passwordHash,
        role: "USER",
        accounts: {
          create: [
            { accountNumber: checkingNumber, accountType: "CHECKING", balance: 2500.0 },
            { accountNumber: savingsNumber, accountType: "SAVINGS", balance: 10000.0 },
          ],
        },
      },
    })

    await createSession({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    })
  } catch (error) {
    console.error("Registration error:", error)
    return { error: "Failed to create account. Please try again." }
  }

  redirect("/dashboard")
}

// ─────────────────────────────────────────────────────────────────────────────
// USER LOGIN (customer portal — /login)
// ─────────────────────────────────────────────────────────────────────────────
export async function loginAction(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  if (!email || !password) {
    return { error: "Email and password are required." }
  }

  try {
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    })

    if (!user) return { error: "Invalid email or password." }

    const isMatch = await verifyPassword(password, user.passwordHash)
    if (!isMatch) return { error: "Invalid email or password." }

    // Prevent admin from logging in via the customer portal
    if (user.role === "ADMIN") {
      return { error: "Admin accounts must log in via the Admin Portal." }
    }

    await createSession({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    })
  } catch (error) {
    console.error("Login error:", error)
    return { error: "An error occurred while signing in." }
  }

  redirect("/dashboard")
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN LOGIN (/admin/login)
// Validates against the seeded ADMIN user in the database.
// ─────────────────────────────────────────────────────────────────────────────
export async function adminLoginAction(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  if (!email || !password) {
    return { error: "Email and password are required." }
  }

  try {
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    })

    if (!user || user.role !== "ADMIN") {
      return { error: "Invalid admin credentials." }
    }

    const isMatch = await verifyPassword(password, user.passwordHash)
    if (!isMatch) {
      return { error: "Invalid admin credentials." }
    }

    await createSession({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    })
  } catch (error) {
    console.error("Admin login error:", error)
    return { error: "An error occurred while signing in." }
  }

  redirect("/admin")
}

// ─────────────────────────────────────────────────────────────────────────────
// LOGOUT
// ─────────────────────────────────────────────────────────────────────────────
export async function logoutAction() {
  await clearSession()
  redirect("/login")
}
