import type { Metadata } from "next"
import { ThemeProvider } from "@/components/theme-provider"
import "./globals.css"

const geistSans = { variable: "" }
const geistMono = { variable: "" }

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full bg-slate-50 text-slate-900 antialiased font-sans">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
