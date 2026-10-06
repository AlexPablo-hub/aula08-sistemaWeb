import { Link } from 'react-router-dom'
import { ThemeToggle } from '@/components/layout'
import { Button } from '@/components/ui/button'

const formats = ['mp3', 'm4a', 'wav', 'ogg', 'webm', 'flac', 'mp4', 'mpeg']

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-foreground">
        <div className="mx-auto flex h-16 w-full max-w-page items-center justify-between px-4 md:px-8">
          <p className="font-serif text-2xl font-semibold tracking-tight">Ditado</p>
          <nav aria-label="Conta" className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild variant="ghost" size="sm">
              <Link to="/entrar">Entrar</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/cadastrar">Cadastrar</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-page gap-12 px-4 py-12 md:px-8 md:py-20 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <h1 className="text-balance">Fala entra, texto sai.</h1>
          <p className="mt-6 max-w-prose text-lg">
            Envie um arquivo de áudio de até 25 MB, escolha o idioma e receba o texto transcrito.
            Cada transcrição fica guardada no seu histórico pessoal, e só você a vê.
          </p>
          <ol className="mt-10 max-w-prose divide-y divide-border border-y border-border">
            <li className="flex gap-4 py-3">
              <span className="w-6 font-mono text-sm text-muted-foreground">01</span>
              <span>Envie o áudio.</span>
            </li>
            <li className="flex gap-4 py-3">
              <span className="w-6 font-mono text-sm text-muted-foreground">02</span>
              <span>Escolha o idioma. O padrão é português.</span>
            </li>
            <li className="flex gap-4 py-3">
              <span className="w-6 font-mono text-sm text-muted-foreground">03</span>
              <span>Leia o texto e volte a ele quando precisar, no histórico.</span>
            </li>
          </ol>
          <p className="mt-6 text-sm text-muted-foreground">
            Formatos aceitos: <span className="font-mono">{formats.join(', ')}</span>.
          </p>
        </div>

        <aside className="lg:col-span-5 lg:pt-8" aria-label="Exemplo de transcrição">
          <div className="border border-border bg-card">
            <p className="border-b border-border px-4 py-2 font-mono text-xs text-muted-foreground">
              reuniao-2026-03-12.m4a &middot; pt
            </p>
            <p className="px-4 py-4 font-mono text-sm leading-6">
              Bom dia a todos. Vamos começar pela pauta de hoje: primeiro o fechamento do
              trimestre, depois os prazos da entrega final.
            </p>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Exemplo ilustrativo.</p>
          <Button asChild size="lg" className="mt-10">
            <Link to="/cadastrar">Criar conta</Link>
          </Button>
        </aside>
      </main>
    </div>
  )
}
