"use client"

import * as React from "react"
import Link from "next/link"
import { loginAction } from "@/lib/actions/auth-actions"
import { ThemeToggle } from "@/components/ThemeToggle"
import { FloatingSupportChat } from "@/components/FloatingSupportChat"
import { ShieldCheck, Lock, Mail, ArrowRight, Eye, EyeOff, Sparkles } from "lucide-react"

export default function LoginPage() {
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [showPassword, setShowPassword] = React.useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const res = await loginAction(formData)
    if (res?.error) {
      setError(res.error)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-4 sm:p-6 relative font-sans selection:bg-blue-600 selection:text-white">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          {/* Custom Hexagon Vault Icon in Royal Blue */}
          <div className="size-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-600/20 mb-1">
            <svg width="30" height="30" viewBox="0 0 48 48" fill="none">
              <path d="M24 4L42 14.5V33.5L24 44L6 33.5V14.5L24 4Z" stroke="white" strokeWidth="3.5" strokeLinejoin="round" />
              <circle cx="24" cy="24" r="7" stroke="white" strokeWidth="3.5" />
              <circle cx="24" cy="24" r="2.5" fill="#34D399" />
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">PrimeVault Bank</h1>
          <p className="text-xs text-slate-500 font-semibold tracking-wide uppercase">
            Private &amp; Institutional Client Portal
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xl space-y-5">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900">Sign In to Your Portfolio</h2>
            <p className="text-xs text-slate-500">
              Enter your credentials to access your checking &amp; savings accounts
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
                {error}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs text-slate-700 font-semibold flex items-center gap-1.5" htmlFor="email">
                <Mail className="size-3.5 text-blue-600" />
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="victoria@example.com"
                required
                autoComplete="email"
                className="w-full h-11 rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs text-slate-700 font-semibold flex items-center gap-1.5" htmlFor="password">
                  <Lock className="size-3.5 text-blue-600" />
                  Password
                </label>
              </div>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full h-11 rounded-xl border border-slate-300 bg-white px-3.5 pr-10 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm uppercase tracking-wider transition-all shadow-sm flex items-center justify-center gap-2 mt-2"
            >
              {loading ? "Authenticating…" : "Sign In to Portal"}
              {!loading && <ArrowRight className="size-4" />}
            </button>
          </form>

          {/* Security & Registration Links */}
          <div className="border-t border-slate-100 pt-4 space-y-3 text-center">
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 font-medium">
              <ShieldCheck className="size-3.5 text-emerald-600" />
              <span>256-bit bank-grade encrypted session</span>
            </div>

            <div className="text-xs text-slate-600">
              New to PrimeVault Bank?{" "}
              <Link href="/register" className="font-semibold text-blue-600 hover:underline">
                Open an Account
              </Link>
            </div>

            <div className="pt-1">
              <Link href="/admin/login" className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors font-medium">
                System Administrator Access &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>

      <FloatingSupportChat />
    </div>
  )
}

