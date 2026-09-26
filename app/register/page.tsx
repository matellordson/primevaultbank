"use client"

import React, { useState } from "react"
import Link from "next/link"
import {
  Check,
  Calendar,
  Lock,
  Mail,
  User,
  Phone,
  MapPin,
  ShieldCheck,
  ChevronDown,
  Eye,
  EyeOff,
  Sparkles,
  CreditCard,
  Building,
} from "lucide-react"
import { registerAction } from "@/lib/actions/auth-actions"
import { FloatingSupportChat } from "@/components/FloatingSupportChat"

const COUNTRIES = [
  { code: "US", name: "United States", flag: "🇺🇸", dial: "+1", currency: "USD" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", dial: "+44", currency: "GBP" },
  { code: "CA", name: "Canada", flag: "🇨🇦", dial: "+1", currency: "CAD" },
  { code: "AU", name: "Australia", flag: "🇦🇺", dial: "+61", currency: "AUD" },
  { code: "DE", name: "Germany", flag: "🇩🇪", dial: "+49", currency: "EUR" },
  { code: "FR", name: "France", flag: "🇫🇷", dial: "+33", currency: "EUR" },
  { code: "CH", name: "Switzerland", flag: "🇨🇭", dial: "+41", currency: "CHF" },
  { code: "AE", name: "United Arab Emirates", flag: "🇦🇪", dial: "+971", currency: "AED" },
  { code: "SG", name: "Singapore", flag: "🇸🇬", dial: "+65", currency: "SGD" },
  { code: "JP", name: "Japan", flag: "🇯🇵", dial: "+81", currency: "JPY" },
  { code: "ZA", name: "South Africa", flag: "🇿🇦", dial: "+27", currency: "ZAR" },
  { code: "NG", name: "Nigeria", flag: "🇳🇬", dial: "+234", currency: "NGN" },
  { code: "GH", name: "Ghana", flag: "🇬🇭", dial: "+233", currency: "GHS" },
  { code: "KE", name: "Kenya", flag: "🇰🇪", dial: "+254", currency: "KES" },
  { code: "EG", name: "Egypt", flag: "🇪🇬", dial: "+20", currency: "EGP" },
  { code: "NL", name: "Netherlands", flag: "🇳🇱", dial: "+31", currency: "EUR" },
  { code: "SE", name: "Sweden", flag: "🇸🇪", dial: "+46", currency: "SEK" },
  { code: "NO", name: "Norway", flag: "🇳🇴", dial: "+47", currency: "NOK" },
  { code: "DK", name: "Denmark", flag: "🇩🇰", dial: "+45", currency: "DKK" },
  { code: "IE", name: "Ireland", flag: "🇮🇪", dial: "+353", currency: "EUR" },
  { code: "IT", name: "Italy", flag: "🇮🇹", dial: "+39", currency: "EUR" },
  { code: "ES", name: "Spain", flag: "🇪🇸", dial: "+34", currency: "EUR" },
  { code: "PT", name: "Portugal", flag: "🇵🇹", dial: "+351", currency: "EUR" },
  { code: "BE", name: "Belgium", flag: "🇧🇪", dial: "+32", currency: "EUR" },
  { code: "AT", name: "Austria", flag: "🇦🇹", dial: "+43", currency: "EUR" },
  { code: "NZ", name: "New Zealand", flag: "🇳🇿", dial: "+64", currency: "NZD" },
  { code: "BR", name: "Brazil", flag: "🇧🇷", dial: "+55", currency: "BRL" },
  { code: "MX", name: "Mexico", flag: "🇲🇽", dial: "+52", currency: "MXN" },
  { code: "IN", name: "India", flag: "🇮🇳", dial: "+91", currency: "INR" },
  { code: "SA", name: "Saudi Arabia", flag: "🇸🇦", dial: "+966", currency: "SAR" },
  { code: "QA", name: "Qatar", flag: "🇶🇦", dial: "+974", currency: "QAR" },
  { code: "KW", name: "Kuwait", flag: "🇰🇼", dial: "+965", currency: "KWD" },
  { code: "HK", name: "Hong Kong", flag: "🇭🇰", dial: "+852", currency: "HKD" },
  { code: "KR", name: "South Korea", flag: "🇰🇷", dial: "+82", currency: "KRW" },
  { code: "MY", name: "Malaysia", flag: "🇲🇾", dial: "+60", currency: "MYR" },
  { code: "ID", name: "Indonesia", flag: "🇮🇩", dial: "+62", currency: "IDR" },
  { code: "PH", name: "Philippines", flag: "🇵🇭", dial: "+63", currency: "PHP" },
  { code: "PL", name: "Poland", flag: "🇵🇱", dial: "+48", currency: "PLN" },
  { code: "TR", name: "Turkey", flag: "🇹🇷", dial: "+90", currency: "TRY" },
  { code: "AR", name: "Argentina", flag: "🇦🇷", dial: "+54", currency: "ARS" },
  { code: "CL", name: "Chile", flag: "🇨🇱", dial: "+56", currency: "CLP" },
  { code: "CO", name: "Colombia", flag: "🇨🇴", dial: "+57", currency: "COP" },
]

export default function RegisterPage() {
  const [currentStep, setCurrentStep] = useState(1)

  // Step 1: Legal Identity & Security
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [dateOfBirth, setDateOfBirth] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  // Step 2: Contact & Residency
  const [country, setCountry] = useState("United States")
  const [address, setAddress] = useState("")
  const [phone, setPhone] = useState("")

  // Step 3: Account Preference & Compliance
  const [accountType, setAccountType] = useState("Checking accounts")
  const [sourceOfFunds, setSourceOfFunds] = useState("Salary / Employment Income")
  const [termsAgreed, setTermsAgreed] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getStepStatus = (stepIndex: number) => {
    if (currentStep > stepIndex) return "done"
    if (currentStep === stepIndex) return "active"
    return "upcoming"
  }

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault()
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password) {
      setError("Please complete all personal and security fields to continue.")
      return
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.")
      return
    }
    setError(null)
    setCurrentStep(2)
  }

  const handleStep2 = (e: React.FormEvent) => {
    e.preventDefault()
    if (!phone.trim() || !address.trim()) {
      setError("Please provide your phone number and residential address.")
      return
    }
    setError(null)
    setCurrentStep(3)
  }

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!termsAgreed) {
      setError("You must acknowledge and accept the PrimeVault Electronic Banking Agreement to proceed.")
      return
    }

    setError(null)
    setLoading(true)

    const formData = new FormData()
    formData.append("name", `${firstName.trim()} ${lastName.trim()}`)
    formData.append("email", email.trim().toLowerCase())
    formData.append("password", password)
    formData.append("phone", phone.trim())
    formData.append("accountType", accountType.includes("Savings") ? "SAVINGS" : "CHECKING")

    try {
      const res = await registerAction(formData)
      if (res?.error) {
        setError(res.error)
        setLoading(false)
      }
    } catch {
      // Handled by server action redirect
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-4 sm:p-6 relative font-sans selection:bg-blue-600 selection:text-white">
      <div className="w-full max-w-lg space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          {/* Custom Hexagon Vault Icon */}
          <div className="size-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-600/20 mb-1">
            <svg width="30" height="30" viewBox="0 0 48 48" fill="none">
              <path d="M24 4L42 14.5V33.5L24 44L6 33.5V14.5L24 4Z" stroke="white" strokeWidth="3.5" strokeLinejoin="round" />
              <circle cx="24" cy="24" r="7" stroke="white" strokeWidth="3.5" />
              <circle cx="24" cy="24" r="2.5" fill="#34D399" />
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">PrimeVault Bank</h1>
          <p className="text-xs text-slate-500 font-semibold tracking-wide uppercase">
            Private &amp; Institutional Account Onboarding
          </p>
        </div>

        {/* Stepper Card */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xl space-y-6">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-semibold text-red-700">
              {error}
            </div>
          )}

          {/* Stepper Steps */}
          <div className="space-y-0">
            {/* Step 1: Legal Identity & Security */}
            <div className="relative flex items-start gap-3.5 pb-6">
              {/* Connector line */}
              <div
                className={`absolute top-7 left-3.5 bottom-0 w-0.5 transition-colors ${
                  currentStep > 1 ? "bg-emerald-500" : "bg-slate-200"
                }`}
              />
              <div
                className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  getStepStatus(1) === "done"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : getStepStatus(1) === "active"
                    ? "bg-blue-600 text-white ring-4 ring-blue-100 shadow-sm"
                    : "bg-slate-100 text-slate-400 border border-slate-200"
                }`}
              >
                {getStepStatus(1) === "done" ? <Check className="size-4 stroke-[3]" /> : "1"}
              </div>
              <div className="flex-1">
                <span className={`text-sm font-bold tracking-wide ${currentStep === 1 ? "text-slate-900" : "text-slate-500"}`}>
                  Identity &amp; Security
                </span>

                {currentStep === 1 && (
                  <form onSubmit={handleStep1} className="mt-4 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-slate-700 font-semibold">First Name</label>
                        <input
                          type="text"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="e.g. Victoria"
                          required
                          className="mt-1 w-full h-11 bg-white border border-slate-300 rounded-xl px-3.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-slate-700 font-semibold">Last Name</label>
                        <input
                          type="text"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder="e.g. Duke"
                          required
                          className="mt-1 w-full h-11 bg-white border border-slate-300 rounded-xl px-3.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-slate-700 font-semibold">Email Address</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="victoria@example.com"
                        required
                        className="mt-1 w-full h-11 bg-white border border-slate-300 rounded-xl px-3.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-slate-700 font-semibold flex items-center justify-between">
                        <span>Date Of Birth (18+ required)</span>
                        <Calendar className="size-3.5 text-slate-400" />
                      </label>
                      <input
                        type="date"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                        required
                        className="mt-1 w-full h-11 bg-white border border-slate-300 rounded-xl px-3.5 text-sm text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-slate-700 font-semibold">Password</label>
                      <div className="relative mt-1">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Min. 6 characters"
                          required
                          className="w-full h-11 bg-white border border-slate-300 rounded-xl px-3.5 pr-10 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                        >
                          {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm uppercase tracking-wider transition-all shadow-md shadow-blue-600/20 active:scale-98"
                      >
                        CONTINUE
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>

            {/* Step 2: Contact & Residency */}
            <div className="relative flex items-start gap-3.5 pb-6">
              {/* Connector line */}
              <div
                className={`absolute top-7 left-3.5 bottom-0 w-0.5 transition-colors ${
                  currentStep > 2 ? "bg-emerald-500" : "bg-slate-200"
                }`}
              />
              <div
                className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  getStepStatus(2) === "done"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : getStepStatus(2) === "active"
                    ? "bg-blue-600 text-white ring-4 ring-blue-100 shadow-sm"
                    : "bg-slate-100 text-slate-400 border border-slate-200"
                }`}
              >
                {getStepStatus(2) === "done" ? <Check className="size-4 stroke-[3]" /> : "2"}
              </div>
              <div className="flex-1">
                <span className={`text-sm font-bold tracking-wide ${currentStep === 2 ? "text-slate-900" : "text-slate-500"}`}>
                  Contact &amp; Residency
                </span>

                {currentStep === 2 && (
                  <form onSubmit={handleStep2} className="mt-4 space-y-4">
                    <div>
                      <label className="text-xs text-slate-700 font-semibold">Country of Residence</label>
                      <div className="relative mt-1">
                        <select
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          className="w-full h-11 bg-white border border-slate-300 rounded-xl px-3.5 text-sm text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 appearance-none transition-all"
                        >
                          {COUNTRIES.map((c) => (
                            <option key={c.code} value={c.name}>
                              {c.flag} {c.name}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-3.5 size-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-slate-700 font-semibold">Residential Street Address</label>
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Street Address, Apt / Suite, City, State"
                        required
                        className="mt-1 w-full h-11 bg-white border border-slate-300 rounded-xl px-3.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">
                        Federal banking regulations require a physical street address. P.O. Boxes are not accepted.
                      </p>
                    </div>

                    <div>
                      <label className="text-xs text-slate-700 font-semibold">
                        Mobile Phone Number
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g. +1 (555) 000-0000"
                        required
                        className="mt-1 w-full h-11 bg-white border border-slate-300 rounded-xl px-3.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
                      />
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="submit"
                        className="flex-1 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm uppercase tracking-wider transition-all shadow-md shadow-blue-600/20 active:scale-98"
                      >
                        CONTINUE
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(1)}
                        className="px-4 h-11 text-xs font-semibold text-slate-500 hover:text-slate-800 uppercase tracking-wider"
                      >
                        BACK
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>

            {/* Step 3: Account Preference & Terms */}
            <div className="relative flex items-start gap-3.5">
              <div
                className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  getStepStatus(3) === "done"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : getStepStatus(3) === "active"
                    ? "bg-blue-600 text-white ring-4 ring-blue-100 shadow-sm"
                    : "bg-slate-100 text-slate-400 border border-slate-200"
                }`}
              >
                3
              </div>
              <div className="flex-1">
                <span className={`text-sm font-bold tracking-wide ${currentStep === 3 ? "text-slate-900" : "text-slate-500"}`}>
                  Account Setup &amp; Compliance
                </span>

                {currentStep === 3 && (
                  <form onSubmit={handleFinalSubmit} className="mt-4 space-y-4">
                    <div>
                      <label className="text-xs text-slate-700 font-semibold">Primary Account Product</label>
                      <div className="relative mt-1">
                        <select
                          value={accountType}
                          onChange={(e) => setAccountType(e.target.value)}
                          className="w-full h-11 bg-white border border-slate-300 rounded-xl px-3.5 text-sm text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 appearance-none transition-all"
                        >
                          <option value="Checking accounts">Prime Checking Account (Everyday Spending &amp; Debit Card)</option>
                          <option value="Savings Account">High-Yield Savings Account (4.85% APY Vault)</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-3.5 size-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-slate-700 font-semibold">Primary Source of Funds</label>
                      <div className="relative mt-1">
                        <select
                          value={sourceOfFunds}
                          onChange={(e) => setSourceOfFunds(e.target.value)}
                          className="w-full h-11 bg-white border border-slate-300 rounded-xl px-3.5 text-sm text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 appearance-none transition-all"
                        >
                          <option value="Salary / Employment Income">Salary / Employment Income</option>
                          <option value="Business / Commercial Earnings">Business / Commercial Earnings</option>
                          <option value="Investments / Capital Gains">Investments / Capital Gains</option>
                          <option value="Personal Savings / Inheritance">Personal Savings / Inheritance</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-3.5 size-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    {/* Terms Agreement Box */}
                    <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 leading-relaxed">
                      <input
                        type="checkbox"
                        id="terms"
                        checked={termsAgreed}
                        onChange={(e) => setTermsAgreed(e.target.checked)}
                        className="size-4 shrink-0 mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor="terms" className="cursor-pointer">
                        I certify under penalty of perjury that the information provided is accurate and agree to PrimeVault Bank&apos;s Electronic Communications Disclosure, CIP Identity Verification Policy, and Terms of Service.
                      </label>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="submit"
                        disabled={loading || !termsAgreed}
                        className="flex-1 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm uppercase tracking-wider transition-all shadow-md shadow-blue-600/20 active:scale-98 flex items-center justify-center gap-2"
                      >
                        {loading ? "OPENING BANK PORTFOLIO…" : "CREATE ACCOUNT"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(2)}
                        className="px-4 h-11 text-xs font-semibold text-slate-500 hover:text-slate-800 uppercase tracking-wider"
                      >
                        BACK
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>

          {/* Login footer */}
          <div className="border-t border-slate-100 pt-4 text-center text-xs text-slate-500">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-blue-600 hover:underline">
              Sign In
            </Link>
          </div>
        </div>
      </div>

      <FloatingSupportChat />
    </div>
  )
}
