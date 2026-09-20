import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { cookies } from "next/headers"
import { ThemeProvider, type Theme } from "@/components/theme-provider"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: {
    default: "PrimeVault Bank — Secure Digital Banking",
    template: "%s | PrimeVault Bank",
  },
  description:
    "Next-generation digital banking platform with checking & savings portfolio management, instant internal transfers, and institutional treasury controls.",
  keywords: [
    "banking",
    "digital bank",
    "treasury",
    "checking account",
    "savings account",
    "wire transfer",
    "institutional banking",
  ],
  authors: [{ name: "PrimeVault Financial Technologies" }],
  creator: "PrimeVault Bank",
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "PrimeVault Bank",
    title: "PrimeVault Bank — Secure Digital Banking",
    description:
      "Next-generation digital banking platform with checking & savings portfolio management, instant internal transfers, and institutional treasury controls.",
  },
  twitter: {
    card: "summary_large_image",
    title: "PrimeVault Bank — Secure Digital Banking",
    description:
      "Next-generation digital banking platform with checking & savings portfolio management, instant internal transfers, and institutional treasury controls.",
  },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const rawTheme = cookieStore.get("pv_theme")?.value as Theme | undefined
  const isDark = rawTheme === "dark"

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${isDark ? "dark" : ""} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="h-full bg-background text-foreground transition-colors duration-150">
        <ThemeProvider initialTheme={rawTheme}>{children}</ThemeProvider>
      </body>
    </html>
  )
}
