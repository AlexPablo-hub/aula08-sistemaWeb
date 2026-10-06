import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { languageLabel } from '@/lib/audio'
import { describeTranscriptionError } from '@/lib/errors'
import { formatDateTime } from '@/lib/format'
import { get } from '@/services/transcriptions'
import { AudioPlayer } from './AudioPlayer'
import { EditableTitle } from './EditableTitle'
import { TranscriptionText } from './TranscriptionText'

type TranscriptionDialogProps = {
  /** Id da transcrição aberta; null fecha o diálogo. */
  id: string | null
  onClose: () => void
}

/** Transcrição completa, lida do servidor pelo id (trata 404 e outros erros). */
export function TranscriptionDialog({ id, onClose }: TranscriptionDialogProps) {
  const query = useQuery({
    queryKey: ['transcriptions', id],
    queryFn: () => get(id as string),
    enabled: id !== null,
    retry: false,
  })
  const item = query.data
  const [editing, setEditing] = useState(false)

  function close() {
    setEditing(false)
    onClose()
  }

  return (
    <Dialog open={id !== null} onOpenChange={(open) => (open ? undefined : close())}>
      <DialogContent
        className="sm:max-w-2xl"
        // Esc durante a edição só cancela a edição; o campo trata a tecla.
        onEscapeKeyDown={(event) => {
          if (editing) event.preventDefault()
        }}
      >
        <DialogHeader className="pr-6">
          {item ? (
            <EditableTitle key={item.id} item={item} editing={editing} onEditingChange={setEditing}>
              <DialogTitle className="text-base break-words">{item.title}</DialogTitle>
              {item.fileName !== item.title ? (
                <p className="truncate font-mono text-xs text-muted-foreground">{item.fileName}</p>
              ) : null}
            </EditableTitle>
          ) : (
            <DialogTitle className="text-base">Transcrição</DialogTitle>
          )}
          {item && editing ? <DialogTitle className="sr-only">Editar título</DialogTitle> : null}
          <DialogDescription>
            {item ? (
              <span className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{languageLabel(item.language)}</Badge>
                <span>{formatDateTime(item.createdAt)}</span>
              </span>
            ) : (
              'Texto completo da transcrição.'
            )}
          </DialogDescription>
        </DialogHeader>
        {query.isPending && id !== null ? (
          <div className="space-y-2" aria-label="Carregando transcrição">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : null}
        {query.isError ? (
          <div className="space-y-3">
            <p
              role="alert"
              className="border border-destructive bg-destructive-soft px-3 py-2 text-sm text-destructive"
            >
              {describeTranscriptionError(query.error)}
            </p>
            <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
              Tentar de novo
            </Button>
          </div>
        ) : null}
        {item ? (
          <AudioPlayer id={item.id} fileName={item.fileName} hasAudio={item.hasAudio} />
        ) : null}
        {item ? <TranscriptionText text={item.text} /> : null}
      </DialogContent>
    </Dialog>
  )
}
