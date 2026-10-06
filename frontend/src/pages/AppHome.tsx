import { useNavigate } from 'react-router-dom'
import { AppShell, PageContainer, PageHeader } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/authStore'

/** Marcador da Etapa 7. A Etapa 8 substitui esta página pelo envio de áudio e o histórico. */
export default function AppHome() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const clearSession = useAuthStore((s) => s.clearSession)

  function logout() {
    clearSession()
    navigate('/entrar', { replace: true })
  }

  return (
    <AppShell
      userArea={
        <>
          <span className="text-muted-foreground">{user?.name}</span>
          <Button variant="outline" size="sm" onClick={logout}>
            Sair
          </Button>
        </>
      }
    >
      <PageContainer>
        <PageHeader
          title={`Olá, ${user?.name ?? ''}`}
          description="Sua conta está ativa. O envio de áudio e o histórico chegam na próxima etapa."
        />
        <p className="max-w-prose text-muted-foreground">
          Por enquanto não há nada para transcrever aqui.
        </p>
      </PageContainer>
    </AppShell>
  )
}
