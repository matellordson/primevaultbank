import dns from "node:dns"

try {
  dns.setDefaultResultOrder("ipv4first")
} catch {
  // Ignore in environments where node:dns is unavailable
}

import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function isPrismaClientUpToDate(client: PrismaClient | undefined): boolean {
  if (!client) return false
  const txFields = (client as any)._runtimeDataModel?.models?.Transaction?.fields
  const userFields = (client as any)._runtimeDataModel?.models?.User?.fields
  if (!txFields || !userFields) return true
  const hasTxPhase = txFields.some((f: any) => f.name === "verificationPhase")
  const hasUserLimit = userFields.some((f: any) => f.name === "transferLimit")
  return hasTxPhase && hasUserLimit
}

const clientToUse = isPrismaClientUpToDate(globalForPrisma.prisma)
  ? globalForPrisma.prisma
  : undefined

export const db =
  clientToUse ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db

