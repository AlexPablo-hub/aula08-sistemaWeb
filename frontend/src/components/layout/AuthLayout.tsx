import type { ReactNode } from "react"

import { ThemeToggle } from "./ThemeToggle"

type AuthLayoutProps = {
  title: string
  description?: string
  /** O formulário. */
  children: ReactNode
  /** Rodapé com o link alternativo, por exemplo "Não tem conta? Cadastrar". */
  footer?: ReactNode
}

/**
 * Layout das telas /entrar e /cadastrar: painel de marca à esquerda e
 * formulário à direita. Em telas estreitas vira uma coluna, com o painel
 * reduzido a um cabeçalho.
 */
export function AuthLayout({ title, description, children, footer }: AuthLayoutProps) {
  return (
    <div className="grid min-h-screen grid-cols-1 bg-background lg:grid-cols-2">
      <aside className="flex flex-col justify-between border-b border-panel-edge bg-panel px-4 py-5 text-panel-foreground lg:border-r lg:border-b-0 lg:px-12 lg:py-12">
        <p className="font-serif text-2xl font-semibold tracking-tight lg:text-4xl">Ditado</p>
        <div className="hidden max-w-md lg:block">
          <p className="font-serif text-3xl leading-tight font-medium text-balance">
            Envie o áudio. Receba o texto.
          </p>
          <p className="mt-4 border-t border-panel-line pt-4 font-mono text-sm text-panel-muted">
            Cada transcrição fica guardada no seu histórico.
          </p>
        </div>
      </aside>
      <main className="relative flex items-center justify-center px-4 py-10 lg:px-12">
        <div className="absolute top-3 right-4 lg:top-6 lg:right-12">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-sm">
          <h1 className="text-2xl lg:text-3xl">{title}</h1>
          {description ? <p className="mt-2 text-muted-foreground">{description}</p> : null}
          <div className="mt-8">{children}</div>
          {footer ? (
            <div className="mt-8 border-t border-border pt-4 text-sm text-muted-foreground">
              {footer}
            </div>
          ) : null}
        </div>
      </main>
    </div>
  )
}
