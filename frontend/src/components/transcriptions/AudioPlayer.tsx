import { useEffect, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Loader2, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { describeAudioError } from '@/lib/errors'
import { getAudio } from '@/services/transcriptions'

type AudioPlayerProps = {
  id: string
  fileName: string
  hasAudio: boolean
}

/**
 * Ouvir o áudio guardado. O arquivo só é baixado ao clicar em Ouvir, por `services/api.ts`
 * (com o token), e tocado por URL de objeto, revogada ao trocar de item ou desmontar.
 */
export function AudioPlayer({ id, fileName, hasAudio }: AudioPlayerProps) {
  const [url, setUrl] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  const download = useMutation({
    mutationFn: () => getAudio(id, fileName),
    onSuccess: (blob) => setUrl(URL.createObjectURL(blob)),
  })

  // Libera a URL de objeto quando ela muda ou o componente sai da tela.
  useEffect(() => {
    if (!url) return
    return () => URL.revokeObjectURL(url)
  }, [url])

  // Ao carregar, tenta tocar; se o navegador bloquear, o usuário aperta play no controle.
  useEffect(() => {
    if (!url) return
    audioRef.current?.play().catch(() => undefined)
  }, [url])

  // Trocou de item: descarta o áudio anterior.
  useEffect(() => {
    return () => {
      setUrl(null)
      download.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // Só um áudio toca por vez: ao tocar este, pausa os demais da tela.
  function pauseOthers() {
    document.querySelectorAll('audio').forEach((other) => {
      if (other !== audioRef.current) other.pause()
    })
  }

  if (!hasAudio) {
    return <p className="text-sm text-muted-foreground">Áudio não guardado</p>
  }

  if (url) {
    return (
      <audio
        ref={audioRef}
        src={url}
        controls
        preload="auto"
        onPlay={pauseOthers}
        aria-label={`Áudio de ${fileName}`}
        className="h-10 w-full max-w-full"
      />
    )
  }

  if (download.isPending) {
    return (
      <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Carregando áudio...
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {download.isError ? (
        <p
          role="alert"
          className="border border-destructive bg-destructive-soft px-3 py-2 text-sm text-destructive"
        >
          {describeAudioError(download.error)}
        </p>
      ) : null}
      <Button
        variant="outline"
        size="sm"
        onClick={() => download.mutate()}
        aria-label={`${download.isError ? 'Tentar de novo: ouvir' : 'Ouvir'} o áudio de ${fileName}`}
      >
        <Play aria-hidden />
        {download.isError ? 'Tentar de novo' : 'Ouvir'}
      </Button>
    </div>
  )
}
