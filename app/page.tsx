import type { Metadata } from "next"
import Link from "next/link"
import { getCurrentUser } from "@/lib/auth"
import { redirect } from "next/navigation"
import { ThemeToggle } from "@/components/ThemeToggle"
import {
  ShieldCheck,
  ArrowRight,
  ArrowLeftRight,
  Building2,
  Lock,
  Sparkles,
  CheckCircle2,
  Globe2,
  Cpu,
  ChevronRight,
  Wallet,
  Layers,
  FileCheck,
  Zap,
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
    <div className="flex min-h-screen flex-col bg-white text-slate-900 font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Network Status Ticker */}
      <div className="w-full bg-slate-900 text-slate-300 border-b border-slate-800 py-2 px-4 text-xs font-mono">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="relative flex size-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full size-2 bg-emerald-500"></span>
            </span>
            <span className="text-white font-medium">CORE SETTLEMENT NETWORK: ACTIVE</span>
            <span className="text-slate-600 hidden sm:inline">•</span>
            <span className="text-slate-300 hidden sm:inline">SWIFT: PVLTUS33XXX</span>
            <span className="text-slate-600 hidden sm:inline">•</span>
            <span className="text-slate-300 hidden sm:inline">ROUTING: 021000021</span>
          </div>
          <div className="flex items-center gap-3 text-slate-400">
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <Lock className="size-3" />
              256-Bit SSL Certified
            </span>
            <span className="text-slate-600 hidden md:inline">•</span>
            <span className="text-slate-300 hidden md:inline">Tier-1 Federal Capital Reserves</span>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="container mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            {/* Custom Hexagon Vault Icon in Royal Blue */}
            <div className="size-11 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-600/20">
              <svg width="24" height="24" viewBox="0 0 48 48" fill="none">
                <path d="M24 4L42 14.5V33.5L24 44L6 33.5V14.5L24 4Z" stroke="white" strokeWidth="3.5" strokeLinejoin="round" />
                <circle cx="24" cy="24" r="7" stroke="white" strokeWidth="3.5" />
                <circle cx="24" cy="24" r="2.5" fill="#34D399" />
              </svg>
            </div>
            <div>
              <span className="font-extrabold tracking-tight text-xl text-slate-900 block leading-tight">
                PrimeVault
              </span>
              <span className="text-[10px] font-mono tracking-widest text-blue-600 uppercase font-bold">
                Private &amp; Institutional Banking
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
            <a href="#portfolios" className="hover:text-blue-600 transition-colors">Portfolios</a>
            <a href="#transfers" className="hover:text-blue-600 transition-colors">Settlements</a>
            <a href="#security" className="hover:text-blue-600 transition-colors">Security &amp; KYC</a>
            <a href="#clearing" className="hover:text-blue-600 transition-colors">Treasury Clearing</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-semibold text-slate-700 hover:text-blue-600 px-3.5 py-2 rounded-xl transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4.5 py-2.5 text-sm font-semibold shadow-sm transition-all active:scale-98"
            >
              <span>Open an Account</span>
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        {/* Top Hero Banner — Image Slot */}
        <div className="relative w-full h-44 sm:h-60 md:h-72 overflow-hidden bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-950 border-b border-slate-800">
          {/* Subtle grid pattern */}
          <div
            className="absolute inset-0 opacity-15"
            style={{
              backgroundImage: "linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />
          {/* Ambient Glow */}
          <div className="absolute -top-20 -left-20 size-72 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -right-20 size-72 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
          
          <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 flex flex-col justify-center items-start text-white">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 px-3 py-1 text-[11px] font-mono font-bold tracking-wider text-blue-300 uppercase mb-2">
              <Sparkles className="size-3 text-blue-400" />
              Private Wealth &amp; Treasury Clearing
            </span>
            <h2 className="text-xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
              PrimeVault Institutional Banking
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl font-medium">
              High-yield savings, instant 10-digit settlements, and bank-grade cryptographic security.
            </p>
          </div>
        </div>

        <section className="relative overflow-hidden pt-12 pb-20 sm:pt-16 sm:pb-24 px-4 bg-gradient-to-b from-slate-50 via-white to-slate-50 border-b border-slate-200/60">
          <div className="container mx-auto max-w-7xl">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-8">
              
              {/* Left Column: Headlines & CTAs */}
              <div className="max-w-2xl text-center lg:text-left space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3.5 py-1.5 text-xs font-semibold text-blue-700">
                  <Sparkles className="size-3.5 text-blue-600" />
                  <span>Next-Generation Institutional Banking Platform</span>
                </div>

                <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.1]">
                  Institutional Power. <br className="hidden sm:inline" />
                  <span className="text-blue-600">
                    Private Banking
                  </span>{" "}
                  Sophistication.
                </h1>

                <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
                  Checking &amp; high-yield savings portfolios, instant 10-digit internal transfers, and institutional wire clearing — built for modern enterprises and individuals.
                </p>

                {/* Key value checkmarks */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs font-semibold text-slate-700">
                  <div className="flex items-center gap-2 justify-center lg:justify-start">
                    <div className="size-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <CheckCircle2 className="size-3.5 stroke-[2.5]" />
                    </div>
                    <span>$0.00 Starting Balance</span>
                  </div>
                  <div className="flex items-center gap-2 justify-center lg:justify-start">
                    <div className="size-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center">
                      <CheckCircle2 className="size-3.5 stroke-[2.5]" />
                    </div>
                    <span>Instant KYC Verification</span>
                  </div>
                  <div className="flex items-center gap-2 justify-center lg:justify-start">
                    <div className="size-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
                      <CheckCircle2 className="size-3.5 stroke-[2.5]" />
                    </div>
                    <span>Manual Wire Clearance</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-4">
                  <Link href="/register" className="w-full sm:w-auto">
                    <button className="w-full sm:w-auto h-12 px-7 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2">
                      <span>Open an Account</span>
                      <ArrowRight className="size-4" />
                    </button>
                  </Link>
                  <Link href="/login" className="w-full sm:w-auto">
                    <button className="w-full sm:w-auto h-12 px-7 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-sm transition-colors flex items-center justify-center shadow-sm">
                      Sign In to Client Portal
                    </button>
                  </Link>
                </div>
              </div>

              {/* Right Column: World-Class Interactive Card Showcase */}
              <div className="w-full max-w-md lg:max-w-lg">
                <div className="relative">
                  {/* Main Sapphire & Platinum Banking Card */}
                  <div className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-7 text-slate-900 shadow-xl space-y-6">
                    {/* Top Row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="size-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                          <svg width="18" height="18" viewBox="0 0 48 48" fill="none">
                            <path d="M24 4L42 14.5V33.5L24 44L6 33.5V14.5L24 4Z" stroke="white" strokeWidth="4" />
                            <circle cx="24" cy="24" r="7" stroke="white" strokeWidth="4" />
                          </svg>
                        </div>
                        <span className="font-bold text-sm tracking-wider font-mono text-slate-800">PRIMEVAULT SAPPHIRE</span>
                      </div>
                      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="size-2 rounded-full bg-emerald-500"></span>
                        Active
                      </span>
                    </div>

                    {/* Metallic EMV Chip + Contactless Symbol */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="size-11 rounded-lg bg-amber-400 border border-amber-500 p-[2px] shadow-sm">
                        <div className="w-full h-full rounded border border-amber-600/40 bg-amber-300 flex flex-col justify-between p-1">
                          <div className="w-full h-0.5 bg-amber-700/40" />
                          <div className="w-full h-0.5 bg-amber-700/40" />
                          <div className="w-full h-0.5 bg-amber-700/40" />
                        </div>
                      </div>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-slate-400">
                        <path d="M8.5 16.5C9.5 15.5 10 14 10 12C10 10 9.5 8.5 8.5 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        <path d="M12 19C13.5 17.5 14.5 15 14.5 12C14.5 9 13.5 6.5 12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        <path d="M15.5 21.5C17.5 19.5 19 16 19 12C19 8 17.5 4.5 15.5 2.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </div>

                    {/* Balance Display */}
                    <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
                      <div className="text-xs text-slate-500 font-medium">Checking Account Liquidity</div>
                      <div className="text-3xl font-extrabold font-mono text-slate-900 tracking-tight mt-0.5">
                        $ 42,980.50
                      </div>
                    </div>

                    {/* Cardholder & Routing Details */}
                    <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-xs font-mono">
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">Account Number</div>
                        <div className="font-semibold text-slate-800">1098 •••• 4210</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">Security Clearance</div>
                        <div className="font-bold text-blue-600">KYC TIER 1</div>
                      </div>
                    </div>

                    {/* Mini Quick Action Buttons */}
                    <div className="grid grid-cols-2 gap-2.5 pt-1">
                      <div className="flex items-center justify-center gap-1.5 rounded-xl bg-blue-50 border border-blue-200/60 py-2.5 text-xs font-semibold text-blue-700">
                        <ArrowLeftRight className="size-3.5 text-blue-600" />
                        <span>Instant Transfer</span>
                      </div>
                      <div className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 border border-slate-200 py-2.5 text-xs font-semibold text-slate-700">
                        <Building2 className="size-3.5 text-slate-600" />
                        <span>Federal Wire</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* Institutional Metrics Grid */}
        <section className="bg-white py-12 px-4 border-b border-slate-200/80">
          <div className="container mx-auto max-w-7xl">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
              <div className="space-y-1 p-4 rounded-2xl bg-blue-50/50 border border-blue-100">
                <div className="text-3xl sm:text-4xl font-extrabold font-mono text-blue-600">$4.8B+</div>
                <div className="text-xs text-slate-600 uppercase tracking-wider font-bold">Asset Custody Volume</div>
              </div>
              <div className="space-y-1 p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100">
                <div className="text-3xl sm:text-4xl font-extrabold font-mono text-emerald-600">160+</div>
                <div className="text-xs text-slate-600 uppercase tracking-wider font-bold">Global Jurisdictions</div>
              </div>
              <div className="space-y-1 p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100">
                <div className="text-3xl sm:text-4xl font-extrabold font-mono text-indigo-600">&lt; 1.2s</div>
                <div className="text-xs text-slate-600 uppercase tracking-wider font-bold">Internal Settlement</div>
              </div>
              <div className="space-y-1 p-4 rounded-2xl bg-amber-50/50 border border-amber-100">
                <div className="text-3xl sm:text-4xl font-extrabold font-mono text-amber-600">99.999%</div>
                <div className="text-xs text-slate-600 uppercase tracking-wider font-bold">SLA Availability</div>
              </div>
            </div>
          </div>
        </section>

        {/* Features / Capabilities Section */}
        <section id="portfolios" className="py-20 sm:py-24 px-4 bg-slate-50">
          <div className="container mx-auto max-w-7xl space-y-14">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="text-xs font-bold uppercase tracking-widest text-blue-600">Complete Financial Suite</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
                Engineered for High-Frequency Treasury &amp; Private Wealth
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Feature 1 */}
              <div className="rounded-2xl border border-slate-200 bg-white p-7 space-y-4 hover:border-blue-300 hover:shadow-md transition-all">
                <div className="size-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                  <Wallet className="size-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Multi-Tier Accounts</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Checking and Savings portfolios with dual-account switcher. Earn 4.85% APY on your High-Yield Vault.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="rounded-2xl border border-slate-200 bg-white p-7 space-y-4 hover:border-emerald-300 hover:shadow-md transition-all">
                <div className="size-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                  <ArrowLeftRight className="size-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">10-Digit Instant Settlement</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Instant internal transfers with zero intermediary fees and real-time ledger settlement.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="rounded-2xl border border-slate-200 bg-white p-7 space-y-4 hover:border-amber-300 hover:shadow-md transition-all">
                <div className="size-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
                  <ShieldCheck className="size-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Administrative Verification</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  External wire requests and proof-of-payment deposits reviewed by Bank Operations for fraud mitigation.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Security & KYC Section */}
        <section id="security" className="py-16 sm:py-20 px-4 bg-white border-t border-slate-200">
          <div className="container mx-auto max-w-7xl">
            <div className="rounded-3xl border border-blue-200 bg-blue-50/60 p-8 sm:p-12 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="max-w-xl space-y-4">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 border border-blue-200 px-3 py-1 text-xs font-bold text-blue-700">
                  <Lock className="size-3" />
                  Bank-Grade KYC &amp; Verification
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                  Built to the Highest Global Compliance Standards
                </h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Biometric KYC identity verification, 256-bit SSL encryption, and double-entry ledger audits for every transaction.
                </p>
              </div>
              <div>
                <Link href="/register">
                  <button className="h-12 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap">
                    Open an Account Today
                    <ChevronRight className="size-4" />
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* World-Class Institutional Footer */}
      <footer className="border-t border-slate-200 bg-slate-900 py-12 px-4 text-xs text-slate-400">
        <div className="container mx-auto max-w-7xl space-y-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-8">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-xl bg-blue-600 flex items-center justify-center text-white">
                <svg width="20" height="20" viewBox="0 0 48 48" fill="none">
                  <path d="M24 4L42 14.5V33.5L24 44L6 33.5V14.5L24 4Z" stroke="white" strokeWidth="3" />
                </svg>
              </div>
              <div>
                <span className="font-bold text-white text-base">PrimeVault Bank</span>
                <span className="block text-[10px] text-slate-400 font-mono">FDIC Member Partner • Equal Housing Lender</span>
              </div>
            </div>
            <div className="flex items-center gap-4 text-slate-300">
              <Link href="/login" className="hover:text-white transition-colors">Sign In</Link>
              <span>•</span>
              <Link href="/register" className="hover:text-white transition-colors">Open Account</Link>
              <span>•</span>
              <Link href="/admin/login" className="hover:text-blue-400 transition-colors">Admin Portal</Link>
            </div>
          </div>

          <div className="space-y-2 text-[11px] text-slate-400 leading-relaxed">
            <p>
              PrimeVault Bank is an institutional and private banking clearing platform. Banking services and clearing accounts are administered in accordance with federal reserve regulations and SWIFT international payment standards.
            </p>
            <p>
              &copy; {new Date().getFullYear()} PrimeVault Bank, Inc. All rights reserved. 256-Bit Encrypted Institutional Banking Session.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

