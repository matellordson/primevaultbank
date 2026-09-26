import type { Metadata } from "next"
import Link from "next/link"
import { getCurrentUser } from "@/lib/auth"
import { redirect } from "next/navigation"
import {
  ShieldCheck,
  ArrowRight,
  ArrowLeftRight,
  Lock,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  Zap,
  CreditCard,
  HeartHandshake,
  Users,
  Wifi,
  TrendingUp,
} from "lucide-react"

export const metadata: Metadata = {
  title: "PrimeVault Bank — Intelligent Personal & Private Banking",
  description:
    "Experience high-yield savings portfolios, zero-fee instant transfers, and a worldwide Visa Signature debit card built for modern financial freedom.",
}

export default async function HomePage() {
  const user = await getCurrentUser()

  if (user) {
    redirect(user.role === "ADMIN" ? "/admin" : "/dashboard")
  }

  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900 font-sans selection:bg-blue-600 selection:text-white">
      {/* Main Navbar — Responsive & spacious on mobile */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="container mx-auto flex h-16 sm:h-20 max-w-7xl items-center justify-between px-3 sm:px-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <div className="size-9 sm:size-11 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-600/20">
              <svg width="22" height="22" viewBox="0 0 48 48" fill="none">
                <path d="M24 4L42 14.5V33.5L24 44L6 33.5V14.5L24 4Z" stroke="white" strokeWidth="3.5" strokeLinejoin="round" />
                <circle cx="24" cy="24" r="7" stroke="white" strokeWidth="3.5" />
                <circle cx="24" cy="24" r="2.5" fill="#34D399" />
              </svg>
            </div>
            <div>
              <span className="font-extrabold tracking-tight text-lg sm:text-xl text-slate-900 block leading-tight">
                PrimeVault
              </span>
              <span className="hidden sm:block text-[10px] font-mono tracking-widest text-blue-600 uppercase font-bold">
                Private &amp; Personal Banking
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-semibold text-slate-600">
            <a href="#benefits" className="hover:text-blue-600 transition-colors">Benefits</a>
            <a href="#card" className="hover:text-blue-600 transition-colors">Visa Signature</a>
            <a href="#savings" className="hover:text-blue-600 transition-colors">4.85% APY</a>
            <a href="#security" className="hover:text-blue-600 transition-colors">Security</a>
          </nav>

          {/* Actions — Compact & comfortable on mobile */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            <Link
              href="/login"
              className="text-xs sm:text-sm font-semibold text-slate-700 hover:text-blue-600 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="flex items-center gap-1 sm:gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-bold shadow-sm transition-all active:scale-98 shrink-0"
            >
              <span>Open Account</span>
              <ArrowRight className="size-3.5 sm:size-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* Prominent Emotion-Conveying Site Banner */}
        <section className="relative w-full overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white py-14 sm:py-20 md:py-24 px-4 border-b border-slate-800">
          {/* Subtle geometric luxury grid */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: "linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />

          {/* Cinematic Light Orbs */}
          <div className="absolute -top-24 -left-24 size-96 rounded-full bg-blue-500/25 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 size-96 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />

          <div className="container relative mx-auto max-w-5xl text-center space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-4 py-1.5 text-xs font-semibold text-blue-300 backdrop-blur-sm">
              <Sparkles className="size-3.5 text-blue-400" />
              <span>A Fresh Standard in Financial Freedom</span>
            </div>

            <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-[1.15]">
              Banking Built Around <br className="hidden sm:inline" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-sky-300 to-emerald-300">
                What Matters Most to You
              </span>
            </h1>

            <p className="max-w-2xl mx-auto text-sm sm:text-lg text-slate-300 leading-relaxed font-normal">
              Zero hidden fees, 4.85% APY high-yield savings, instant transfers in seconds, and a worldwide Visa Signature debit card that empowers your life.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link href="/register" className="w-full sm:w-auto">
                <button className="w-full sm:w-auto h-12 px-8 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 active:scale-98">
                  <span>Get Started in 2 Minutes</span>
                  <ArrowRight className="size-4" />
                </button>
              </Link>
              <a href="#benefits" className="w-full sm:w-auto">
                <button className="w-full sm:w-auto h-12 px-6 rounded-xl border border-slate-700 bg-white/5 hover:bg-white/10 text-slate-200 font-semibold text-sm transition-colors flex items-center justify-center">
                  Explore Features
                </button>
              </a>
            </div>
          </div>
        </section>

        {/* Hero Showcase with Premium Card — Matching Dashboard */}
        <section className="relative overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24 px-4 bg-gradient-to-b from-slate-50 via-white to-slate-50 border-b border-slate-200/60">
          <div className="container mx-auto max-w-7xl">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-10">

              {/* Left Column: Key Value Proposition */}
              <div className="max-w-xl text-center lg:text-left space-y-6">
                <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
                  Everything You Need. <br />
                  <span className="text-blue-600">Zero Complications.</span>
                </h2>

                <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
                  Say goodbye to maintenance charges, delayed wire waiting, and sluggish transfers. PrimeVault delivers effortless digital banking designed for everyday confidence and long-term prosperity.
                </p>

                {/* Impressive Highlights */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 text-xs font-semibold text-slate-800">
                  <div className="flex items-center gap-2.5 justify-center lg:justify-start p-3 rounded-xl bg-blue-50/70 border border-blue-100">
                    <div className="size-6 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                      <TrendingUp className="size-3.5" />
                    </div>
                    <span>4.85% APY Daily Compound Growth</span>
                  </div>

                  <div className="flex items-center gap-2.5 justify-center lg:justify-start p-3 rounded-xl bg-emerald-50/70 border border-emerald-100">
                    <div className="size-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                      <Zap className="size-3.5" />
                    </div>
                    <span>Instant Zero-Fee Transfers</span>
                  </div>

                  <div className="flex items-center gap-2.5 justify-center lg:justify-start p-3 rounded-xl bg-indigo-50/70 border border-indigo-100">
                    <div className="size-6 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                      <CreditCard className="size-3.5" />
                    </div>
                    <span>Zero Foreign Transaction Fees</span>
                  </div>

                  <div className="flex items-center gap-2.5 justify-center lg:justify-start p-3 rounded-xl bg-amber-50/70 border border-amber-100">
                    <div className="size-6 rounded-full bg-amber-600 text-white flex items-center justify-center shrink-0">
                      <ShieldCheck className="size-3.5" />
                    </div>
                    <span>Bank-Grade Biometric Protection</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                  <Link href="/register" className="w-full sm:w-auto">
                    <button className="w-full sm:w-auto h-12 px-7 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2">
                      <span>Open Your Free Account</span>
                      <ArrowRight className="size-4" />
                    </button>
                  </Link>
                </div>
              </div>

              {/* Right Column: Visual Card Matching the Client Dashboard Card */}
              <div className="w-full max-w-md lg:max-w-lg" id="card">
                <div className="relative">
                  {/* Outer Glow */}
                  <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-600 opacity-20 blur-xl pointer-events-none" />

                  {/* Dark Metallic Physical Card Container — Dashboard Match */}
                  <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-6 sm:p-7 text-white shadow-2xl space-y-6">
                    {/* Subtle sapphire radial shine */}
                    <div className="absolute -top-16 -right-16 size-44 rounded-full bg-blue-600/20 blur-2xl pointer-events-none" />

                    {/* Top Row: Brand & Status */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm tracking-widest font-extrabold text-white">
                          PRIMEVAULT
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        <span className="size-1.5 rounded-full bg-emerald-400"></span>
                        Active
                      </span>
                    </div>

                    {/* Metallic EMV Chip + Contactless Symbol */}
                    <div className="flex items-center justify-between my-2">
                      <div className="w-11 h-8 rounded-md bg-gradient-to-tr from-amber-400 via-amber-200 to-amber-500 p-[1.5px] shadow-md">
                        <div className="w-full h-full rounded border border-amber-800/40 bg-amber-400/90 flex flex-col justify-between p-1">
                          <div className="w-full h-0.5 bg-amber-700/50" />
                          <div className="w-full h-0.5 bg-amber-700/50" />
                        </div>
                      </div>
                      <Wifi className="size-5 text-slate-400 rotate-90" />
                    </div>

                    {/* Card Number */}
                    <div className="font-mono text-lg sm:text-xl tracking-widest text-white font-bold">
                      4532  8920  1048  7512
                    </div>

                    {/* Balance Preview */}
                    <div className="rounded-xl bg-white/5 border border-white/10 p-3.5 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">Available Balance</div>
                        <div className="text-xl sm:text-2xl font-bold font-mono text-white mt-0.5">
                          $ 42,980.50
                        </div>
                      </div>
                      <span className="rounded-lg bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-1">
                        +4.85% APY
                      </span>
                    </div>

                    {/* Footer: Cardholder Name, Expiry & Visa Logo */}
                    <div className="flex items-end justify-between text-xs font-mono pt-1 border-t border-white/10">
                      <div>
                        <div className="text-[9px] text-slate-400 uppercase tracking-wider">Cardholder</div>
                        <div className="font-bold text-slate-100 uppercase tracking-wider text-xs">
                          VALUED CLIENT
                        </div>
                      </div>

                      <div className="text-center">
                        <div className="text-[9px] text-slate-400 uppercase tracking-wider">Expires</div>
                        <div className="font-bold text-slate-200">09/31</div>
                      </div>

                      <div className="text-right">
                        <span className="font-extrabold italic text-sm tracking-wider text-white">
                          VISA
                        </span>
                        <span className="block text-[8px] font-sans font-semibold tracking-tighter text-blue-300">
                          Signature
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* Prestigious Metrics Grid */}
        <section className="bg-white py-12 px-4 border-b border-slate-200/80">
          <div className="container mx-auto max-w-7xl">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 text-center">
              <div className="space-y-1 p-4 rounded-2xl bg-blue-50/50 border border-blue-100">
                <div className="text-2xl sm:text-4xl font-extrabold font-mono text-blue-600">$4.8B+</div>
                <div className="text-xs text-slate-600 uppercase tracking-wider font-bold">Client Assets Protected</div>
              </div>
              <div className="space-y-1 p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100">
                <div className="text-2xl sm:text-4xl font-extrabold font-mono text-emerald-600">4.85%</div>
                <div className="text-xs text-slate-600 uppercase tracking-wider font-bold">Annual APY Interest</div>
              </div>
              <div className="space-y-1 p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100">
                <div className="text-2xl sm:text-4xl font-extrabold font-mono text-indigo-600">&lt; 2s</div>
                <div className="text-xs text-slate-600 uppercase tracking-wider font-bold">Instant Transfers</div>
              </div>
              <div className="space-y-1 p-4 rounded-2xl bg-amber-50/50 border border-amber-100">
                <div className="text-2xl sm:text-4xl font-extrabold font-mono text-amber-600">160+</div>
                <div className="text-xs text-slate-600 uppercase tracking-wider font-bold">Countries Supported</div>
              </div>
            </div>
          </div>
        </section>

        {/* Life-Enhancing Features Section */}
        <section id="benefits" className="py-20 sm:py-24 px-4 bg-slate-50">
          <div className="container mx-auto max-w-7xl space-y-14">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="text-xs font-bold uppercase tracking-widest text-blue-600">Built Around Your Life</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
                Features That Actually Make Life Easier
              </h2>
              <p className="text-slate-600 text-sm sm:text-base">
                No fine print, no confusing banking jargon. Just intuitive tools designed to give you complete command over your money.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Feature 1 */}
              <div className="rounded-2xl border border-slate-200 bg-white p-7 space-y-4 hover:border-blue-300 hover:shadow-md transition-all">
                <div className="size-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                  <Zap className="size-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Zero-Fee Instant Transfers</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Send money to family, friends, or businesses in seconds. Enter a 10-digit account number and the money is there immediately with zero hidden fees.
                </p>
              </div>

              {/* Feature 2 */}
              <div id="savings" className="rounded-2xl border border-slate-200 bg-white p-7 space-y-4 hover:border-emerald-300 hover:shadow-md transition-all">
                <div className="size-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                  <TrendingUp className="size-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">4.85% APY Wealth Vault</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Put your idle cash to work. Earn high-yield interest compounded daily—up to 10x higher than traditional brick-and-mortar savings accounts.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="rounded-2xl border border-slate-200 bg-white p-7 space-y-4 hover:border-indigo-300 hover:shadow-md transition-all">
                <div className="size-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                  <CreditCard className="size-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Global Visa Signature Card</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Tap to pay in 160+ countries worldwide with zero foreign transaction fees. Freeze or unfreeze your card instantly from your phone whenever you need.
                </p>
              </div>

              {/* Feature 4 */}
              <div id="security" className="rounded-2xl border border-slate-200 bg-white p-7 space-y-4 hover:border-amber-300 hover:shadow-md transition-all">
                <div className="size-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
                  <Lock className="size-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Bank-Grade Biometric Security</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Every account is secured with biometric face recognition, 256-bit bank encryption, and automated fraud alerts to keep your funds untouched.
                </p>
              </div>

              {/* Feature 5 */}
              <div className="rounded-2xl border border-slate-200 bg-white p-7 space-y-4 hover:border-sky-300 hover:shadow-md transition-all">
                <div className="size-12 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center font-bold">
                  <Users className="size-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">One-Tap Saved Payees</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Save your recurring contacts, rent, and monthly bills in your dashboard. Initiate transfers with pre-filled details in a single click.
                </p>
              </div>

              {/* Feature 6 */}
              <div className="rounded-2xl border border-slate-200 bg-white p-7 space-y-4 hover:border-purple-300 hover:shadow-md transition-all">
                <div className="size-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
                  <HeartHandshake className="size-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">24/7 Dedicated Support</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Direct live assistance directly in your banking dashboard. No endless automated phone trees or waiting on hold for hours.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Inspiring Bottom CTA Banner */}
        <section className="py-16 sm:py-20 px-4 bg-white border-t border-slate-200">
          <div className="container mx-auto max-w-7xl">
            <div className="rounded-3xl border border-blue-200 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 p-8 sm:p-14 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 text-white shadow-xl">
              <div className="max-w-xl space-y-3 text-center md:text-left">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-blue-100 backdrop-blur-sm">
                  <Sparkles className="size-3 text-blue-200" />
                  Instant Online Onboarding
                </span>
                <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
                  Experience Banking The Way It Should Be
                </h2>
                <p className="text-sm sm:text-base text-blue-100 leading-relaxed">
                  Join thousands of clients enjoying 4.85% APY savings, zero transfer fees, and seamless digital access today.
                </p>
              </div>
              <div className="shrink-0 w-full sm:w-auto">
                <Link href="/register" className="w-full sm:w-auto block">
                  <button className="w-full sm:w-auto h-13 px-8 rounded-xl bg-white hover:bg-slate-50 text-blue-700 font-extrabold text-sm transition-all flex items-center justify-center gap-2 shadow-lg active:scale-98">
                    <span>Open Account Today</span>
                    <ChevronRight className="size-4" />
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Clean Public Footer — No Admin Links */}
      <footer className="border-t border-slate-200 bg-slate-900 py-12 px-4 text-xs text-slate-400">
        <div className="container mx-auto max-w-7xl space-y-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-8">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm">
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
            </div>
          </div>

          <div className="space-y-2 text-[11px] text-slate-400 leading-relaxed">
            <p>
              PrimeVault Bank provides personal and private digital banking solutions. Deposits are insured up to $250,000 per depositor through our FDIC member banking partners.
            </p>
            <p>
              &copy; {new Date().getFullYear()} PrimeVault Bank, Inc. All rights reserved. 256-Bit SSL Encrypted Banking Session.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

