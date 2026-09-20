import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Open an Account",
  description: "Create a PrimeVault customer account with automated checking and savings portfolio setup.",
}

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children
}
