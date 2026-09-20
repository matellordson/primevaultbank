"use client"

import * as React from "react"
import Link from "next/link"
import { registerAction } from "@/lib/actions/auth-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ShieldCheck, Lock, Mail, User, Landmark, Sparkles, Eye, EyeOff, CheckCircle2, Clock } from "lucide-react"
import { ThemeToggle } from "@/components/ThemeToggle"

export default function RegisterPage() {
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [showPassword, setShowPassword] = React.useState(false)

  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")

  const condName = name.trim().length >= 2
  const condEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  const condPassword = password.length >= 6
  const isFormValid = condName && condEmail && condPassword

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const res = await registerAction(formData)
    if (res?.error) {
      setError(res.error)
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center p-4 bg-muted/30">
      {/* Top right theme toggle */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md space-y-6">
        {/* Brand */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="flex items-center justify-center size-12 rounded-xl bg-primary text-primary-foreground shadow-md">
            <Landmark className="size-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Open a PrimeVault Account</h1>
          <p className="text-sm text-muted-foreground">
            Get your Checking &amp; Savings accounts instantly
          </p>
        </div>

        <Card className="shadow-lg border-border/80">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">Create your account</CardTitle>
            <CardDescription>
              Fill in your details to get started
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 text-sm rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium flex items-center gap-1.5" htmlFor="name">
                    <User className="size-4 text-muted-foreground" />
                    Full Name
                  </label>
                  {name.trim().length > 0 && (
                    <span className={`text-[11px] flex items-center gap-1 ${condName ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                      {condName ? <CheckCircle2 className="size-3" /> : <Clock className="size-3" />}
                      {condName ? "Valid" : "Min. 2 characters"}
                    </span>
                  )}
                </div>
                <Input
                  id="name"
                  name="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Morgan"
                  className={name.trim().length > 0 ? (condName ? "border-emerald-500" : "border-destructive") : ""}
                  required
                  autoComplete="name"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium flex items-center gap-1.5" htmlFor="email">
                    <Mail className="size-4 text-muted-foreground" />
                    Email Address
                  </label>
                  {email.trim().length > 0 && (
                    <span className={`text-[11px] flex items-center gap-1 ${condEmail ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                      {condEmail ? <CheckCircle2 className="size-3" /> : <Clock className="size-3" />}
                      {condEmail ? "Valid email" : "Valid email required"}
                    </span>
                  )}
                </div>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className={email.trim().length > 0 ? (condEmail ? "border-emerald-500" : "border-destructive") : ""}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium flex items-center gap-1.5" htmlFor="password">
                    <Lock className="size-4 text-muted-foreground" />
                    Password
                  </label>
                  {password.length > 0 && (
                    <span className={`text-[11px] flex items-center gap-1 font-mono ${condPassword ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-muted-foreground"}`}>
                      {condPassword ? <CheckCircle2 className="size-3" /> : <Clock className="size-3" />}
                      {password.length} / 6 characters min
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    required
                    autoComplete="new-password"
                    className={`pr-10 ${password.length > 0 ? (condPassword ? "border-emerald-500" : "border-destructive") : ""}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <div className="rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground space-y-1">
                <div className="flex items-center gap-1 font-medium text-foreground">
                  <Sparkles className="size-3.5 text-amber-500" />
                  <span>What you get</span>
                </div>
                <p>
                  A Prime Checking account and a Vault High-Yield Savings account, both set up instantly
                  with demo balances so you can explore the platform.
                </p>
              </div>

              <Button
                type="submit"
                className="w-full h-10 font-semibold"
                disabled={loading || !isFormValid}
              >
                {loading
                  ? "Creating Account…"
                  : !condName
                  ? "Enter your full name"
                  : !condEmail
                  ? "Enter a valid email"
                  : !condPassword
                  ? "Password must be at least 6 characters"
                  : "Create Account"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 border-t border-border/50 pt-4 text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
              <span>256-bit encrypted & bank-grade secure</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
