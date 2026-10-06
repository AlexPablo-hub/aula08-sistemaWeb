import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { FileAudio, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ACCEPTED_EXTENSIONS,
  DEFAULT_LANGUAGE,
  formatBytes,
  LANGUAGES,
  MAX_AUDIO_MB,
  validateAudio,
} from '@/lib/audio'
import { describeTranscriptionError } from '@/lib/errors'
import { create } from '@/services/transcriptions'
import type { Transcription } from '@/types'

type UploadFormProps = {
  /** Chamado com a transcrição criada, para a página mostrar o texto completo. */
  onCreated: (transcription: Transcription) => void
}

const ACCEPT = ACCEPTED_EXTENSIONS.map((e) => `.${e}`).join(',')

export function UploadForm({ onCreated }: UploadFormProps) {
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [language, setLanguage] = useState(DEFAULT_LANGUAGE)
  const [fileError, setFileError] = useState<string | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: ({ file, language }: { file: File; language: string }) => create(file, language),
    onSuccess: (transcription) => {
      setApiError(null)
      setFile(null)
      if (inputRef.current) inputRef.current.value = ''
      void queryClient.invalidateQueries({ queryKey: ['transcriptions'] })
      toast.success('Transcrição concluída.')
      onCreated(transcription)
    },
    onError: (error) => {
      setApiError(describeTranscriptionError(error))
    },
  })

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const chosen = event.target.files?.[0] ?? null
    setApiError(null)
    if (!chosen) {
      setFile(null)
      setFileError(null)
      return
    }
    const problem = validateAudio(chosen)
    setFileError(problem)
    // Arquivo inválido não é guardado: o botão Enviar fica desabilitado.
    setFile(problem ? null : chosen)
    if (problem && inputRef.current) inputRef.current.value = ''
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!file || mutation.isPending) return
    // Revalida antes de chamar a API.
    const problem = validateAudio(file)
    if (problem) {
      setFileError(problem)
      return
    }
    setApiError(null)
    mutation.mutate({ file, language })
  }

  const pending = mutation.isPending

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="audio-file">Arquivo de áudio</Label>
        <div className="relative">
          <input
            ref={inputRef}
            id="audio-file"
            type="file"
            accept={ACCEPT}
            onChange={onFileChange}
            disabled={pending}
            aria-invalid={fileError ? true : undefined}
            aria-describedby="audio-file-help audio-file-error"
            className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
          />
          <div className="flex items-center gap-3 border border-dashed border-input bg-card px-4 py-6 transition-colors peer-hover:bg-muted peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring peer-disabled:opacity-50">
            <FileAudio className="size-5 shrink-0 text-muted-foreground" aria-hidden />
            {file ? (
              <div className="min-w-0">
                <p className="truncate font-mono text-sm">{file.name}</p>
                <p className="text-sm text-muted-foreground">{formatBytes(file.size)}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Escolher arquivo de áudio</p>
            )}
          </div>
        </div>
        <p id="audio-file-help" className="text-sm text-muted-foreground">
          Formatos: {ACCEPTED_EXTENSIONS.join(', ')}. Até {MAX_AUDIO_MB} MB.
        </p>
        <p
          id="audio-file-error"
          role={fileError ? 'alert' : undefined}
          className="text-sm text-destructive"
        >
          {fileError}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="audio-language">Idioma do áudio</Label>
        <Select value={language} onValueChange={setLanguage} disabled={pending}>
          <SelectTrigger id="audio-language" className="w-full md:w-60">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LANGUAGES.map((l) => (
              <SelectItem key={l.code} value={l.code}>
                {l.label} ({l.code})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {apiError ? (
        <p
          role="alert"
          className="border border-destructive bg-destructive-soft px-3 py-2 text-sm text-destructive"
        >
          {apiError}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <Button type="submit" disabled={!file || pending}>
          {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
          {pending ? 'Transcrevendo...' : 'Enviar áudio'}
        </Button>
        {pending ? (
          <p role="status" className="text-sm text-muted-foreground">
            Transcrevendo o áudio. Isso pode levar alguns instantes.
          </p>
        ) : null}
      </div>
    </form>
  )
}
