import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { Loader2, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { describeTitleError } from '@/lib/errors'
import { updateTitle } from '@/services/transcriptions'
import type { Transcription } from '@/types'

const MAX_TITLE = 120
const LIST_KEY = ['transcriptions']

const schema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Informe um título.')
    .max(MAX_TITLE, `O título pode ter no máximo ${MAX_TITLE} caracteres.`),
})
type FormValues = z.input<typeof schema>

type EditableTitleProps = {
  item: Transcription
  editing: boolean
  onEditingChange: (editing: boolean) => void
  /** Como o título aparece fora da edição (o chamador escolhe o elemento e o estilo). */
  children: ReactNode
}

/** Título com edição inline: botão "Editar título", campo com Salvar e Cancelar; Enter salva e Esc cancela. */
export function EditableTitle({ item, editing, onEditingChange, children }: EditableTitleProps) {
  const queryClient = useQueryClient()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const wasEditing = useRef(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setFocus,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: item.title },
  })

  // Ao abrir: valor atual, campo focado e texto selecionado. Ao fechar: o foco volta ao botão.
  useEffect(() => {
    if (editing) {
      reset({ title: item.title })
      setApiError(null)
      setFocus('title', { shouldSelect: true })
    } else if (wasEditing.current) {
      buttonRef.current?.focus()
    }
    wasEditing.current = editing
    // item.title fora das dependências de propósito: não pode apagar o que a pessoa está digitando.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing])

  const mutation = useMutation({
    mutationFn: (title: string) => updateTitle(item.id, title),
    onSuccess: (updated) => {
      queryClient.setQueryData<Transcription[]>(LIST_KEY, (old) =>
        old?.map((t) => (t.id === updated.id ? updated : t)),
      )
      queryClient.setQueryData(['transcriptions', updated.id], updated)
      void queryClient.invalidateQueries({ queryKey: LIST_KEY })
      toast.success('Título atualizado.')
      onEditingChange(false)
    },
    onError: (error) => {
      const message = describeTitleError(error)
      setApiError(message)
      toast.error(message)
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        void queryClient.invalidateQueries({ queryKey: LIST_KEY, exact: true })
      }
    },
  })

  const current = watch('title') ?? ''
  const unchanged = current.trim() === item.title
  const pending = mutation.isPending
  const fieldError = errors.title?.message ?? apiError

  function onSubmit(values: FormValues) {
    const title = values.title.trim()
    if (title === item.title) {
      onEditingChange(false)
      return
    }
    setApiError(null)
    mutation.mutate(title)
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape' && !pending) {
      event.preventDefault()
      onEditingChange(false)
    }
  }

  if (!editing) {
    return (
      <div className="flex min-w-0 items-start gap-1">
        <div className="min-w-0 flex-1">{children}</div>
        <Button
          ref={buttonRef}
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label={`Editar título de ${item.title}`}
          title="Editar título"
          onClick={() => onEditingChange(true)}
        >
          <Pencil aria-hidden />
        </Button>
      </div>
    )
  }

  const inputId = `title-${item.id}`
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate aria-label="Editar título" className="w-full min-w-0 space-y-2">
      <Label htmlFor={inputId} className="sr-only">
        Título
      </Label>
      <Input
        id={inputId}
        autoComplete="off"
        readOnly={pending}
        aria-invalid={fieldError ? true : undefined}
        aria-describedby={fieldError ? `${inputId}-error` : undefined}
        onKeyDown={onKeyDown}
        {...register('title', { onChange: () => setApiError(null) })}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" size="sm" disabled={pending || unchanged}>
          {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
          Salvar
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => onEditingChange(false)}
        >
          Cancelar
        </Button>
        <span className="font-mono text-xs text-muted-foreground" aria-hidden>
          {current.trim().length}/{MAX_TITLE}
        </span>
      </div>
      {fieldError ? (
        <p
          id={`${inputId}-error`}
          role="alert"
          className="border border-destructive bg-destructive-soft px-3 py-2 text-sm text-destructive"
        >
          {fieldError}
        </p>
      ) : null}
    </form>
  )
}
