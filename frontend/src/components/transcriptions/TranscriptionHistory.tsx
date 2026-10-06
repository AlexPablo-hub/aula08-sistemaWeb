import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { languageLabel } from '@/lib/audio'
import { describeTranscriptionError } from '@/lib/errors'
import { excerpt, formatDateTime } from '@/lib/format'
import { list, remove } from '@/services/transcriptions'
import type { Transcription } from '@/types'
import { AudioPlayer } from './AudioPlayer'
import { TranscriptionDialog } from './TranscriptionDialog'

const LIST_KEY = ['transcriptions']

type TranscriptionHistoryProps = {
  /** Avisa a página que uma transcrição foi excluída (para esconder o resultado recém-criado). */
  onDeleted: (id: string) => void
}

/** Histórico: ordem do backend (mais recente primeiro), com Ver e Excluir. */
export function TranscriptionHistory({ onDeleted }: TranscriptionHistoryProps) {
  const queryClient = useQueryClient()
  const [viewId, setViewId] = useState<string | null>(null)
  const [toDelete, setToDelete] = useState<Transcription | null>(null)

  const query = useQuery({ queryKey: LIST_KEY, queryFn: list })

  // Exclusão otimista: a linha some do cache na hora; se a API falhar, o cache volta ao estado anterior.
  const deletion = useMutation({
    mutationFn: (id: string) => remove(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: LIST_KEY, exact: true })
      const previous = queryClient.getQueryData<Transcription[]>(LIST_KEY)
      queryClient.setQueryData<Transcription[]>(LIST_KEY, (old) => old?.filter((t) => t.id !== id))
      return { previous }
    },
    onError: (error, _id, context) => {
      if (context?.previous) queryClient.setQueryData(LIST_KEY, context.previous)
      toast.error(describeTranscriptionError(error))
    },
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: ['transcriptions', id] })
      onDeleted(id)
      toast.success('Transcrição excluída.')
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: LIST_KEY, exact: true })
    },
  })

  function confirmDelete() {
    if (!toDelete) return
    deletion.mutate(toDelete.id)
    setToDelete(null)
  }

  return (
    <section aria-labelledby="history-title">
      <h2 id="history-title" className="border-b border-foreground pb-2 text-2xl">
        Histórico
      </h2>

      {query.isPending ? (
        <ul className="divide-y divide-border" aria-label="Carregando histórico">
          {[0, 1, 2].map((i) => (
            <li key={i} className="space-y-2 py-4">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-full max-w-xl" />
            </li>
          ))}
        </ul>
      ) : null}

      {query.isError ? (
        <div className="space-y-3 py-6">
          <p
            role="alert"
            className="border border-destructive bg-destructive-soft px-3 py-2 text-sm text-destructive"
          >
            Não foi possível carregar o histórico. {describeTranscriptionError(query.error)}
          </p>
          <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
            Tentar de novo
          </Button>
        </div>
      ) : null}

      {query.isSuccess && query.data.length === 0 ? (
        <p className="py-6 text-muted-foreground">Nenhuma transcrição ainda.</p>
      ) : null}

      {query.isSuccess && query.data.length > 0 ? (
        <ul className="divide-y divide-border border-b border-border">
          {query.data.map((item) => (
            <li
              key={item.id}
              className="grid gap-3 py-4 md:grid-cols-[1fr_auto] md:items-start md:gap-6"
            >
              <div className="min-w-0 space-y-1">
                <p className="truncate font-mono text-sm font-medium">{item.fileName}</p>
                <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="outline">{languageLabel(item.language)}</Badge>
                  <span>{formatDateTime(item.createdAt)}</span>
                </p>
                <p className="line-clamp-2 text-sm">{excerpt(item.text)}</p>
                <div className="pt-1">
                  <AudioPlayer id={item.id} fileName={item.fileName} hasAudio={item.hasAudio} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setViewId(item.id)}>
                  Ver
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => setToDelete(item)}
                >
                  Excluir
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <TranscriptionDialog id={viewId} onClose={() => setViewId(null)} />

      <AlertDialog
        open={toDelete !== null}
        onOpenChange={(open) => (open ? undefined : setToDelete(null))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir transcrição?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete ? `"${toDelete.fileName}" será removida do histórico. ` : ''}
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
