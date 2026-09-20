import { getCurrentUser } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Navbar } from "@/components/Navbar"

export default async function TransfersLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  if (user.role === "ADMIN") {
    redirect("/admin")
  }

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col">
      <Navbar
        user={{
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        }}
      />
      <main className="flex-1 container mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  )
}
