import { useAuthStore } from "@/store/authStore"
import type { NavItem } from "./AppShell"

/** Navegação das telas internas. "Administração" só aparece para o papel admin. */
export function useAppNavigation(): NavItem[] {
  const role = useAuthStore((s) => s.user?.role)
  if (role !== "admin") return []
  return [
    { to: "/app", label: "Transcrever" },
    { to: "/app/admin", label: "Administração" },
  ]
}
