import { useEffect, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Loader2, Pause, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { describeAudioError } from '@/lib/errors'
import { formatClock } from '@/lib/format'
import { getAudio } from '@/services/transcriptions'

type AudioPlayerProps = {
  id: string
  fileName: string
  hasAudio: boolean
}

/**
 * Ouvir o áudio guardado. O arquivo só é baixado ao clicar em Ouvir, por `services/api.ts`
 * (com o token), e tocado por URL de objeto, revogada ao trocar de item ou desmontar.
 * Depois de carregado, o controle é próprio (tocar, pausar e posição), no estilo do site.
 */
export function AudioPlayer({ id, fileName, hasAudio }: AudioPlayerProps) {
  const [url, setUrl] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)
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

  // Ao carregar, tenta tocar; se o navegador bloquear, o usuário aperta tocar.
  useEffect(() => {
    if (!url) return
    audioRef.current?.play().catch(() => undefined)
  }, [url])

  // Trocou de item: descarta o áudio anterior.
  useEffect(() => {
    return () => {
      setUrl(null)
      setPlaying(false)
      setCurrent(0)
      setDuration(0)
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

  function toggle() {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) audio.play().catch(() => undefined)
    else audio.pause()
  }

  function seek(value: number[]) {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = value[0]
    setCurrent(value[0])
  }

  if (!hasAudio) {
    return <p className="text-sm text-muted-foreground">Áudio não guardado</p>
  }

  if (url) {
    // Alguns arquivos (webm, ogg) não informam a duração: sem ela, a barra fica parada.
    const seekable = Number.isFinite(duration) && duration > 0
    return (
      <div
        role="group"
        aria-label={`Áudio de ${fileName}`}
        className="flex w-full items-center gap-3 border border-border bg-card px-3 py-2"
      >
        <audio
          ref={audioRef}
          src={url}
          preload="auto"
          hidden
          onPlay={() => {
            setPlaying(true)
            pauseOthers()
          }}
          onPause={() => setPlaying(false)}
          onEnded={() => {
            setPlaying(false)
            setCurrent(0)
          }}
          onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
          onDurationChange={(event) => setDuration(event.currentTarget.duration)}
          onTimeUpdate={(event) => setCurrent(event.currentTarget.currentTime)}
        />
        <Button
          type="button"
          size="icon-sm"
          onClick={toggle}
          aria-label={`${playing ? 'Pausar' : 'Tocar'} o áudio de ${fileName}`}
        >
          {playing ? <Pause aria-hidden /> : <Play aria-hidden />}
        </Button>
        <span className="w-10 shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
          {formatClock(current)}
        </span>
        <Slider
          min={0}
          max={seekable ? duration : 1}
          step={0.1}
          value={[seekable ? Math.min(current, duration) : 0]}
          onValueChange={seek}
          disabled={!seekable}
          thumbLabel="Posição do áudio"
          valueText={`${formatClock(current)} de ${formatClock(duration)}`}
          className="min-w-0 flex-1"
        />
        <span className="w-10 shrink-0 text-right font-mono text-xs text-muted-foreground tabular-nums">
          {formatClock(duration)}
        </span>
      </div>
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
