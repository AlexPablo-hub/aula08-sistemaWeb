import { useState } from 'react'
import axios from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Skeleton } from '@/components/ui/skeleton'
import { describeSettingsError } from '@/lib/errors'
import {
  getTranscriptionSettings,
  TRANSCRIPTION_SETTINGS_KEY,
  updateTranscriptionSettings,
} from '@/services/settings'
import type { TranscriptionOption, TranscriptionProvider, TranscriptionSettings } from '@/types'

const PROVIDER_NAMES: Record<TranscriptionProvider, string> = {
  groq: 'Groq',
  openrouter: 'OpenRouter',
}
const PROVIDER_ORDER: TranscriptionProvider[] = ['groq', 'openrouter']

const keyOf = (o: { provider: string; model: string }) => `${o.provider}|${o.model}`

/** O rótulo da API traz o provedor na frente ("Groq: Whisper..."); no grupo isso é redundante. */
function shortLabel(option: TranscriptionOption): string {
  const prefix = `${PROVIDER_NAMES[option.provider]}: `
  return option.label.startsWith(prefix) ? option.label.slice(prefix.length) : option.label
}

/** Escolha global do provedor e do modelo de transcrição (só administrador). */
export function TranscriptionSettingsPanel() {
  const queryClient = useQueryClient()
  // Escolha ainda não salva; null significa "igual ao que está em uso".
  const [selected, setSelected] = useState<string | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)

  const query = useQuery({
    queryKey: TRANSCRIPTION_SETTINGS_KEY,
    queryFn: getTranscriptionSettings,
    // 401 e 403 não melhoram ao repetir.
    retry: (count, error) => {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined
      return status !== 401 && status !== 403 && count < 2
    },
  })

  const mutation = useMutation({
    mutationFn: updateTranscriptionSettings,
    onSuccess: (updated) => {
      queryClient.setQueryData<TranscriptionSettings>(TRANSCRIPTION_SETTINGS_KEY, updated)
      void queryClient.invalidateQueries({ queryKey: TRANSCRIPTION_SETTINGS_KEY, exact: true })
      setSelected(null)
      setApiError(null)
      toast.success('Modelo de transcrição atualizado.')
    },
    onError: (error) => {
      const message = describeSettingsError(error)
      setApiError(message)
      toast.error(message)
    },
  })

  if (query.isPending) {
    return (
      <div className="space-y-3" aria-label="Carregando configuração de transcrição">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    )
  }

  if (query.isError) {
    return (
      <div className="space-y-3">
        <p
          role="alert"
          className="border border-destructive bg-destructive-soft px-3 py-2 text-sm text-destructive"
        >
          Não foi possível carregar a configuração. {describeSettingsError(query.error)}
        </p>
        <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
          Tentar de novo
        </Button>
      </div>
    )
  }

  const settings = query.data
  if (settings.options.length === 0) {
    return <p className="text-muted-foreground">Nenhuma opção de transcrição disponível.</p>
  }

  const currentKey = keyOf(settings)
  const value = selected ?? currentKey
  const changed = value !== currentKey
  const pending = mutation.isPending
  const inUse = settings.options.find((o) => keyOf(o) === currentKey)

  function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    const option = settings.options.find((o) => keyOf(o) === value)
    if (!option || !changed) return
    setApiError(null)
    mutation.mutate({ provider: option.provider, model: option.model })
  }

  return (
    <div className="space-y-6">
      <section aria-labelledby="in-use-title" className="space-y-2">
        <h2 id="in-use-title" className="text-lg">
          Em uso agora
        </h2>
        <p className="flex flex-wrap items-center gap-2">
          <span className="font-medium">
            {PROVIDER_NAMES[settings.provider]}
            {': '}
            {inUse ? shortLabel(inUse) : settings.model}
          </span>
          <code className="font-mono text-sm text-muted-foreground">{settings.model}</code>
          <Badge variant={settings.source === 'admin' ? 'accent' : 'outline'}>
            {settings.source === 'admin' ? 'Escolhido por um administrador' : 'Padrão'}
          </Badge>
        </p>
        {inUse && !inUse.available ? (
          <p className="text-sm text-destructive">
            O provedor desta escolha está sem chave no servidor: o envio de áudio vai falhar até
            outra opção ser salva.
          </p>
        ) : null}
        <p className="text-sm text-muted-foreground">
          A escolha vale para todos os usuários e passa a valer no próximo envio de áudio.
        </p>
      </section>

      <form onSubmit={onSubmit} noValidate className="space-y-6">
        {apiError ? (
          <p
            role="alert"
            className="border border-destructive bg-destructive-soft px-3 py-2 text-sm text-destructive"
          >
            {apiError}
          </p>
        ) : null}

        <RadioGroup
          value={value}
          onValueChange={setSelected}
          aria-label="Modelo de transcrição"
          className="gap-6"
          disabled={pending}
        >
          {PROVIDER_ORDER.map((provider) => {
            const options = settings.options.filter((o) => o.provider === provider)
            if (options.length === 0) return null
            return (
              <fieldset key={provider} className="space-y-1 border-t border-border pt-3">
                <legend className="pr-2 font-serif text-base font-medium">
                  {PROVIDER_NAMES[provider]}
                </legend>
                {options.map((option) => {
                  const id = `transcription-${option.provider}-${option.model.replace(/[^\w-]/g, '_')}`
                  const hintId = `${id}-hint`
                  return (
                    <div key={id} className="flex items-start gap-3 py-2">
                      <RadioGroupItem
                        id={id}
                        value={keyOf(option)}
                        disabled={!option.available || pending}
                        aria-describedby={!option.available ? hintId : undefined}
                        className="mt-1"
                      />
                      <div className="space-y-0.5">
                        <Label htmlFor={id} className="font-medium">
                          {shortLabel(option)}
                        </Label>
                        <p className="font-mono text-sm text-muted-foreground">{option.model}</p>
                        {!option.available ? (
                          <p id={hintId} className="text-sm text-muted-foreground">
                            Chave do provedor não configurada no servidor
                          </p>
                        ) : null}
                      </div>
                    </div>
                  )
                })}
              </fieldset>
            )
          })}
        </RadioGroup>

        <Button type="submit" disabled={!changed || pending}>
          {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
          {pending ? 'Salvando...' : 'Salvar'}
        </Button>
      </form>
    </div>
  )
}
