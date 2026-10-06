import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

type PageContainerProps = {
  children: ReactNode
  className?: string
}

/** Largura máxima e margens padrão do conteúdo. */
export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div className={cn("mx-auto w-full max-w-page px-4 py-8 md:px-8 md:py-12", className)}>
      {children}
    </div>
  )
}
