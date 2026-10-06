import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AppShell, PageContainer, PageHeader, UserArea, useAppNavigation } from '@/components/layout'
import { AudioPlayer } from '@/components/transcriptions/AudioPlayer'
import { TranscriptionHistory } from '@/components/transcriptions/TranscriptionHistory'
import { TranscriptionText } from '@/components/transcriptions/TranscriptionText'
import { UploadForm } from '@/components/transcriptions/UploadForm'
import { Badge } from '@/components/ui/badge'
import { languageLabel } from '@/lib/audio'
import { formatDateTime } from '@/lib/format'
import { list } from '@/services/transcriptions'
import type { Transcription } from '@/types'

/** Área interna: envio de áudio, resultado e histórico. */
export default function AppHome() {
  const navigation = useAppNavigation()
  const [created, setCreated] = useState<Transcription | null>(null)
  // Mesma consulta do histórico: o título editado ali aparece também no resultado.
  const history = useQuery({ queryKey: ['transcriptions'], queryFn: list })
  const latest = created ? (history.data?.find((t) => t.id === created.id) ?? created) : null

  return (
    <AppShell navigation={navigation} userArea={<UserArea />}>
      <PageContainer>
        <PageHeader
          title="Transcrever áudio"
          description="Envie um arquivo, escolha o idioma e receba o texto. Cada transcrição fica no seu histórico."
        />
        <div className="grid gap-12 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-16">
          <div className="space-y-10">
            <section aria-labelledby="upload-title">
              <h2 id="upload-title" className="mb-4 border-b border-foreground pb-2 text-2xl">
                Novo envio
              </h2>
              <UploadForm onCreated={setCreated} />
            </section>
            {latest ? (
              <section aria-labelledby="result-title" aria-live="polite">
                <h2 id="result-title" className="mb-2 border-b border-foreground pb-2 text-2xl">
                  Resultado
                </h2>
                <p className="mb-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span className="text-base font-medium text-foreground">{latest.title}</span>
                  {latest.fileName !== latest.title ? (
                    <span className="font-mono text-xs">{latest.fileName}</span>
                  ) : null}
                  <Badge variant="outline">{languageLabel(latest.language)}</Badge>
                  <span>{formatDateTime(latest.createdAt)}</span>
                </p>
                <div className="mb-3">
                  <AudioPlayer id={latest.id} fileName={latest.fileName} hasAudio={latest.hasAudio} />
                </div>
                <TranscriptionText text={latest.text} />
              </section>
            ) : null}
          </div>
          <TranscriptionHistory
            onDeleted={(id) => setCreated((current) => (current?.id === id ? null : current))}
          />
        </div>
      </PageContainer>
    </AppShell>
  )
}
