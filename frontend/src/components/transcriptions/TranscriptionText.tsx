import { Copy } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

/** Texto transcrito em JetBrains Mono, em superfície com borda, com botão Copiar texto. */
export function TranscriptionText({ text }: { text: string }) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Texto copiado.')
    } catch {
      toast.error('Não foi possível copiar. Selecione o texto e copie à mão.')
    }
  }

  return (
    <div className="space-y-3">
      <div className="max-h-96 overflow-y-auto border border-border bg-card p-4 font-mono text-sm leading-relaxed whitespace-pre-wrap">
        {text || 'A transcrição veio vazia.'}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={copy}>
        <Copy aria-hidden />
        Copiar texto
      </Button>
    </div>
  )
}
