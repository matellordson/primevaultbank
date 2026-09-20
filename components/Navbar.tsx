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
} from "lucide-react"

interface NavbarProps {
  user: {
    id: string
    name: string
    email: string
    role: "USER" | "ADMIN"
  }
}

export function Navbar({ user }: NavbarProps) {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = React.useState(false)

  const navItems =
    user.role === "ADMIN"
      ? [{ href: "/admin", label: "Admin Desk", icon: ShieldAlert }]
      : [
          { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
          { href: "/transfers", label: "Transfer", icon: ArrowLeftRight },
          { href: "/deposits", label: "Deposit", icon: Download },
        ]

  const [prevPathname, setPrevPathname] = React.useState(pathname)
  if (prevPathname !== pathname) {
    setPrevPathname(pathname)
    setMenuOpen(false)
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">

        {/* Brand */}
        <Link
          href={user.role === "ADMIN" ? "/admin" : "/dashboard"}
          className="flex items-center gap-2.5 font-bold tracking-tight text-lg"
        >
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Landmark className="size-5" />
          </div>
          <span>PrimeVault</span>
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
                className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="size-4" />
                {item.label}
                {item.href === "/admin" && (
                  <span className="ml-1 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-500">
                    ADMIN
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Right side — theme toggle + user info + sign out */}
        <div className="flex items-center gap-2.5">
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
                {item.label}
                {item.href === "/admin" && (
                  <span className="ml-auto rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-500">
                    ADMIN
                  </span>
                )}
              </Link>
            )
          })}

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
