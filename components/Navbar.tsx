"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { logoutAction } from "@/lib/actions/auth-actions"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/ThemeToggle"
import {
  Landmark,
  LayoutDashboard,
  ArrowLeftRight,
  ShieldAlert,
  LogOut,
  Download,
  Menu,
  X,
  Globe,
} from "lucide-react"

interface NavbarProps {
  user: {
    id: string
    name: string
    email: string
    role: "USER" | "ADMIN"
  }
}

const NAV_LABELS: Record<string, Record<string, string>> = {
  "/dashboard": { EN: "Dashboard", ES: "Panel", FR: "Tableau", DE: "Übersicht", AR: "لوحة" },
  "/kyc": { EN: "Verification", ES: "Verificación", FR: "Vérification", DE: "Verifizierung", AR: "تحقق" },
  "/transfers": { EN: "Transfer", ES: "Transferir", FR: "Transfert", DE: "Überweisung", AR: "تحويل" },
  "/deposits": { EN: "Deposit", ES: "Depósito", FR: "Dépôt", DE: "Einzahlung", AR: "إيداع" },
  "/admin": { EN: "Admin Desk", ES: "Admin", FR: "Admin", DE: "Admin", AR: "إدارة" },
}

export function Navbar({ user }: NavbarProps) {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = React.useState(false)
  const [lang, setLang] = React.useState<"EN" | "ES" | "FR" | "DE" | "AR">("EN")
  const [showLangMenu, setShowLangMenu] = React.useState(false)

  const navItems =
    user.role === "ADMIN"
      ? [{ href: "/admin", label: "Admin Desk", icon: ShieldAlert }]
      : [
          { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
          { href: "/kyc", label: "Verification", icon: ShieldAlert },
          { href: "/transfers", label: "Transfer", icon: ArrowLeftRight },
          { href: "/deposits", label: "Deposit", icon: Download },
        ]

  const [prevPathname, setPrevPathname] = React.useState(pathname)
  if (prevPathname !== pathname) {
    setPrevPathname(pathname)
    setMenuOpen(false)
  }

  React.useEffect(() => {
    if (!showLangMenu) return
    const handler = () => setShowLangMenu(false)
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [showLangMenu])

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">

        {/* Brand */}
        <Link
          href={user.role === "ADMIN" ? "/admin" : "/dashboard"}
          className="flex items-center gap-2.5 font-bold tracking-tight text-lg"
        >
          <div className="flex size-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
            <svg width="20" height="20" viewBox="0 0 48 48" fill="none">
              <path d="M24 4L42 14.5V33.5L24 44L6 33.5V14.5L24 4Z" stroke="white" strokeWidth="3.5" strokeLinejoin="round" />
              <circle cx="24" cy="24" r="7" stroke="white" strokeWidth="3.5" />
              <circle cx="24" cy="24" r="2" fill="#34D399" />
            </svg>
          </div>
          <span className="font-extrabold tracking-tight text-slate-900">PrimeVault</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Icon className="size-4" />
                {NAV_LABELS[item.href]?.[lang] ?? item.label}
                {item.href === "/admin" && (
                  <span className="ml-1 rounded-full bg-amber-100 border border-amber-300 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                    ADMIN
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Right side — language switcher + theme toggle + user info + sign out */}
        <div className="flex items-center gap-2.5">

          {/* Language Switcher */}
          <div className="relative hidden md:block">
            <button
              type="button"
              onClick={() => setShowLangMenu((v) => !v)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
              aria-label="Change language"
            >
              <Globe className="size-3.5 text-blue-600" />
              <span>{lang}</span>
            </button>
            {showLangMenu && (
              <div className="absolute right-0 top-full mt-1.5 z-50 min-w-[120px] rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
                {(["EN", "ES", "FR", "DE", "AR"] as const).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => { setLang(l); setShowLangMenu(false) }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold transition-colors ${
                      lang === l ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span className="w-6 text-center">{l === "EN" ? "🇺🇸" : l === "ES" ? "🇪🇸" : l === "FR" ? "🇫🇷" : l === "DE" ? "🇩🇪" : "🇦🇪"}</span>
                    {l === "EN" ? "English" : l === "ES" ? "Español" : l === "FR" ? "Français" : l === "DE" ? "Deutsch" : "العربية"}
                  </button>
                ))}
              </div>
            )}
          </div>

          <ThemeToggle />

          <div className="hidden md:flex items-center gap-2 pl-2 border-l border-border/80">
            <div className="flex flex-col text-right">
              <span className="text-xs font-semibold leading-none">{user.name}</span>
              <span className="text-[11px] text-muted-foreground leading-tight">{user.email}</span>
            </div>
            <form action={logoutAction}>
              <Button
                variant="ghost"
                size="sm"
                type="submit"
                className="gap-1.5 text-muted-foreground hover:text-destructive"
              >
                <LogOut className="size-4" />
                <span>Sign Out</span>
              </Button>
            </form>
          </div>

          {/* Hamburger — mobile only */}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="md:hidden flex items-center justify-center size-9 rounded-md border border-border/80 bg-muted/50 hover:bg-muted text-foreground transition-colors"
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-border/80 bg-background/98 backdrop-blur px-4 pb-4 pt-3 space-y-1">
          {/* User info */}
          <div className="flex items-center gap-3 px-2 py-2.5 mb-2 border-b border-border/60">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">{user.name}</div>
              <div className="text-xs text-muted-foreground truncate">{user.email}</div>
            </div>
          </div>

          {/* Nav links */}
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                <Icon className="size-4 shrink-0" />
                {NAV_LABELS[item.href]?.[lang] ?? item.label}
                {item.href === "/admin" && (
                  <span className="ml-auto rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-500">
                    ADMIN
                  </span>
                )}
              </Link>
            )
          })}

          {/* Language picker (mobile) */}
          <div className="flex flex-wrap gap-2 px-3 py-2">
            {(["EN", "ES", "FR", "DE", "AR"] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold border transition-colors ${
                  lang === l ? "bg-blue-600 text-white border-blue-600" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {l}
              </button>
            ))}
          </div>

          {/* Sign out */}
          <div className="pt-2 border-t border-border/60 mt-2">
            <form action={logoutAction}>
              <button
                type="submit"
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="size-4 shrink-0" />
                Sign Out
              </button>
            </form>
          </div>
        </div>
      )}
    </header>
  )
}
