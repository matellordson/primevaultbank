"use client"

import * as React from "react"
import { adminLoginAction } from "@/lib/actions/auth-actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Landmark, ShieldAlert, Eye, EyeOff } from "lucide-react"
import { ThemeToggle } from "@/components/ThemeToggle"

export default function AdminLoginPage() {
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [showPassword, setShowPassword] = React.useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const res = await adminLoginAction(fd)
    setLoading(false)
    if (res?.error) setError(res.error)
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-muted/40 px-4">
      {/* Top right theme toggle */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm space-y-6">
        {/* Brand */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
            <Landmark className="size-7" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">PrimeVault</h1>
            <p className="text-sm text-muted-foreground">Bank Operations Portal</p>
          </div>
        </div>

        <Card className="shadow-md border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="size-5 text-amber-500" />
              <CardTitle className="text-base text-amber-700 dark:text-amber-400">
                Admin Access Required
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              This portal is restricted to authorized bank operations staff.
              Unauthorized access attempts are logged and prosecuted.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-xs font-medium text-destructive">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="email" className="text-xs font-medium">
                  Admin Email
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="admin@primevaultbank.com"
                  required
                  autoComplete="username"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="text-xs font-medium">
                  Admin Password
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••••••"
                    required
                    autoComplete="current-password"
                    className="pr-10"
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

              <Button type="submit" className="w-full font-semibold" disabled={loading}>
                {loading ? "Authenticating…" : "Access Admin Portal"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-[11px] text-muted-foreground">
          Not an admin?{" "}
          <a href="/login" className="underline hover:text-foreground">
            Customer Login
          </a>
        </p>
      </div>
    </div>
  )
}
