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

  return (
    <Dialog open={id !== null} onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-mono text-base break-all">
            {item?.fileName ?? 'Transcrição'}
          </DialogTitle>
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
