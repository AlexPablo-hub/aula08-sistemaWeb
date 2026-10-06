import { Link } from 'react-router-dom'
import { PageContainer } from '@/components/layout'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background">
      <PageContainer>
        <p className="font-mono text-sm text-muted-foreground">404</p>
        <h1 className="mt-2">Página não encontrada</h1>
        <p className="mt-4 max-w-prose text-muted-foreground">
          O endereço não existe ou foi movido.
        </p>
        <p className="mt-8">
          <Link to="/" className="font-medium text-primary underline-offset-4 hover:underline">
            Voltar ao início
          </Link>
        </p>
      </PageContainer>
    </div>
  )
}
