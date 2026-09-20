import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Admin Portal Sign In",
  description: "Restricted administrative access for PrimeVault bank operations officers and authorized administrators.",
}

export default function AdminLoginLayout({ children }: { children: React.ReactNode }) {
  return children
}
