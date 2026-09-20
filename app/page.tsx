import type { Metadata } from "next"
import Link from "next/link"
import { getCurrentUser } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Landmark,
  ShieldCheck,
  ArrowRight,
  ArrowLeftRight,
  Building2,
  Lock,
  Sparkles,
} from "lucide-react"

export const metadata: Metadata = {
  title: "PrimeVault Bank — Modern Personal & Institutional Banking",
  description:
    "Experience complete checking & savings portfolio management, instant internal transfers, and manual back-office administrative settlement controls.",
}

export default async function HomePage() {
  const user = await getCurrentUser()

  if (user) {
    redirect(user.role === "ADMIN" ? "/admin" : "/dashboard")
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Landing Header */}
      <header className="border-b border-border/60 bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5 font-bold tracking-tight text-lg">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Landmark className="size-5" />
            </div>
            <span>PrimeVault Bank</span>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="gap-1.5 font-semibold">
                <span>Open Account</span>
                <ArrowRight className="size-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 sm:py-24 text-center">
        <div className="max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="size-3.5" />
            <span>Next-Generation Simulated Banking Platform</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-balance">
            Modern Institutional &amp; Personal Banking
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground text-balance max-w-2xl mx-auto">
            Experience complete checking &amp; savings portfolio management, instant internal transfers, and manual back-office administrative settlement controls.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link href="/register" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto gap-2 font-semibold h-12 px-6 text-base">
                <span>Open a Test Account</span>
                <ArrowRight className="size-4" />
              </Button>
            </Link>
            <Link href="/login" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 px-6 text-base">
                Sign In to Portal
              </Button>
            </Link>
          </div>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-16 text-left">
            <div className="p-5 rounded-2xl border border-border/80 bg-muted/20 space-y-2">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ArrowLeftRight className="size-5" />
              </div>
              <h3 className="font-bold text-base">Instant Transfers</h3>
              <p className="text-xs text-muted-foreground">
                Move funds instantly between checking &amp; savings or transfer to any 10-digit account number.
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-border/80 bg-muted/20 space-y-2">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Building2 className="size-5" />
              </div>
              <h3 className="font-bold text-base">Back-Office Desk</h3>
              <p className="text-xs text-muted-foreground">
                Admin control desk to approve or reject wire transfers, inject deposits, and manage customer portfolios.
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-border/80 bg-muted/20 space-y-2">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ShieldCheck className="size-5" />
              </div>
              <h3 className="font-bold text-base">Audit Trail</h3>
              <p className="text-xs text-muted-foreground">
                Full double-entry transaction history, downloadable vouchers, and tamper-resistant audit logs.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        <div className="container mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>&copy; {new Date().getFullYear()} PrimeVault Bank. Simulation environment.</span>
          <div className="flex items-center gap-1.5">
            <Lock className="size-3.5 text-emerald-500" />
            <span>256-Bit Encrypted Session</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
