import type { ReactNode } from "react"

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
      <aside className="flex flex-col justify-between border-b border-foreground bg-ink px-4 py-5 text-surface lg:border-r lg:border-b-0 lg:px-12 lg:py-12">
        <p className="font-serif text-2xl font-semibold tracking-tight lg:text-4xl">Ditado</p>
        <div className="hidden max-w-md lg:block">
          <p className="font-serif text-3xl leading-tight font-medium text-balance">
            Envie o áudio. Receba o texto.
          </p>
          <p className="mt-4 border-t border-ink-soft pt-4 font-mono text-sm text-rule">
            Cada transcrição fica guardada no seu histórico.
          </p>
        </div>
      </aside>
      <main className="flex items-center justify-center px-4 py-10 lg:px-12">
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
