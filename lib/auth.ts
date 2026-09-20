import { SignJWT, jwtVerify } from "jose"
import bcrypt from "bcryptjs"
import { cookies } from "next/headers"
import { db } from "@/lib/db"

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "primevault-secret-key-change-in-production-2026"
)

export type SessionPayload = {
  userId: string
  email: string
  name: string
  role: "USER" | "ADMIN"
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET)

  const cookieStore = await cookies()
  cookieStore.set("pv_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  })

  return token
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get("pv_session")?.value

  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

export async function clearSession() {
  const cookieStore = await cookies()
  cookieStore.delete("pv_session")
}

export async function getCurrentUser() {
  const session = await getSession()
  if (!session) return null

  try {
    const user = await db.user.findUnique({
      where: { id: session.userId },
      include: {
        accounts: {
          orderBy: { createdAt: "asc" },
        },
      },
    })
    return user
  } catch (error) {
    console.error("Failed to fetch current user:", error)
    return null
  }
}
