import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/store/authStore"

/** Nome do usuário da sessão e botão Sair, para o cabeçalho das telas internas. */
export function UserArea() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const clearSession = useAuthStore((s) => s.clearSession)

  function logout() {
    clearSession()
    navigate("/entrar", { replace: true })
  }

  return (
    <>
      <span className="text-muted-foreground">{user?.name}</span>
      <Button variant="outline" size="sm" onClick={logout}>
        Sair
      </Button>
    </>
  )
}
