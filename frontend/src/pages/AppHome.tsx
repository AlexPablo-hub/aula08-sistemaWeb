import { useState } from 'react'
import { AppShell, PageContainer, PageHeader, UserArea, useAppNavigation } from '@/components/layout'
import { TranscriptionHistory } from '@/components/transcriptions/TranscriptionHistory'
import { TranscriptionText } from '@/components/transcriptions/TranscriptionText'
import { UploadForm } from '@/components/transcriptions/UploadForm'
import { Badge } from '@/components/ui/badge'
import { languageLabel } from '@/lib/audio'
import { formatDateTime } from '@/lib/format'
import type { Transcription } from '@/types'

/** Área interna: envio de áudio, resultado e histórico. */
export default function AppHome() {
  const navigation = useAppNavigation()
  const [latest, setLatest] = useState<Transcription | null>(null)

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
              <UploadForm onCreated={setLatest} />
            </section>
            {latest ? (
              <section aria-labelledby="result-title" aria-live="polite">
                <h2 id="result-title" className="mb-2 border-b border-foreground pb-2 text-2xl">
                  Resultado
                </h2>
                <p className="mb-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span className="font-mono text-foreground">{latest.fileName}</span>
                  <Badge variant="outline">{languageLabel(latest.language)}</Badge>
                  <span>{formatDateTime(latest.createdAt)}</span>
                </p>
                <TranscriptionText text={latest.text} />
              </section>
            ) : null}
          </div>
          <TranscriptionHistory
            onDeleted={(id) => setLatest((current) => (current?.id === id ? null : current))}
          />
        </div>
      </PageContainer>
    </AppShell>
  )
}
