import type { ReactNode } from "react"
import { NavLink } from "react-router-dom"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "./ThemeToggle"

export type NavItem = { to: string; label: string }

type AppShellProps = {
  children: ReactNode
  /** Links de navegação do cabeçalho. */
  navigation?: NavItem[]
  /** Área do usuário (nome, papel, botão Sair). Montada pela página ou rota. */
  userArea?: ReactNode
}

/** Estrutura das telas internas: cabeçalho com marca, navegação e área do usuário. */
export function AppShell({ children, navigation = [], userArea }: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-foreground">
        <div className="mx-auto flex h-16 w-full max-w-page items-center gap-8 px-4 md:px-8">
          <NavLink to="/" className="font-serif text-2xl font-semibold tracking-tight">
            Ditado
          </NavLink>
          <nav aria-label="Principal" className="flex flex-1 items-center gap-6">
            {navigation.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end
                className={({ isActive }) =>
                  cn(
                    "border-b-2 py-1 text-sm font-medium transition-colors",
                    isActive
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-4 text-sm">
            {userArea}
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  )
}
