import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { describeUserError } from '@/lib/errors'
import { update, USERS_KEY } from '@/services/users'
import { useAuthStore } from '@/store/authStore'
import type { Role, UpdateUserInput, User } from '@/types'

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Informe o nome.')
    .max(100, 'O nome pode ter até 100 caracteres.'),
  role: z.enum(['user', 'admin']),
  active: z.boolean(),
})
type FormValues = z.infer<typeof schema>

type EditUserDialogProps = {
  /** Conta em edição; null fecha o diálogo. */
  user: User | null
  onClose: () => void
}

export function EditUserDialog({ user, onClose }: EditUserDialogProps) {
  return (
    <Dialog open={user !== null} onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent className="sm:max-w-md">
        {user ? <EditUserForm key={user.id} user={user} onClose={onClose} /> : null}
      </DialogContent>
    </Dialog>
  )
}

function EditUserForm({ user, onClose }: { user: User; onClose: () => void }) {
  const queryClient = useQueryClient()
  const session = useAuthStore((s) => s.user)
  const accessToken = useAuthStore((s) => s.accessToken)
  const setSession = useAuthStore((s) => s.setSession)
  const [apiError, setApiError] = useState<string | null>(null)
  const isSelf = session?.id === user.id

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: user.name, role: user.role, active: user.active },
  })

  const mutation = useMutation({
    mutationFn: (input: UpdateUserInput) => update(user.id, input),
    onSuccess: (updated) => {
      // A lista fica no TanStack Query: atualiza o item e revalida.
      queryClient.setQueryData<User[]>(USERS_KEY, (old) =>
        old?.map((u) => (u.id === updated.id ? updated : u)),
      )
      void queryClient.invalidateQueries({ queryKey: USERS_KEY, exact: true })
      // Alterou a própria conta: mantém o usuário da sessão consistente (mesmo token).
      if (session && updated.id === session.id && accessToken) {
        setSession(updated, accessToken)
      }
      toast.success('Conta atualizada.')
      onClose()
    },
    onError: (error) => {
      const message = describeUserError(error)
      setApiError(message)
      toast.error(message)
    },
  })

  function onSubmit(values: FormValues) {
    setApiError(null)
    // Envia ao PATCH somente os campos alterados.
    const changes: UpdateUserInput = {}
    if (values.name !== user.name) changes.name = values.name
    if (values.role !== user.role) changes.role = values.role
    if (values.active !== user.active) changes.active = values.active
    if (Object.keys(changes).length === 0) {
      onClose()
      return
    }
    mutation.mutate(changes)
  }

  const pending = mutation.isPending

  return (
    <>
      <DialogHeader>
        <DialogTitle>Editar conta</DialogTitle>
        <DialogDescription className="break-all">{user.email}</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        {apiError ? (
          <p
            role="alert"
            className="border border-destructive bg-destructive-soft px-3 py-2 text-sm text-destructive"
          >
            {apiError}
          </p>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="user-name">Nome</Label>
          <Input
            id="user-name"
            type="text"
            autoComplete="off"
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? 'user-name-error' : undefined}
            {...register('name')}
          />
          {errors.name ? (
            <p id="user-name-error" className="text-sm text-destructive">
              {errors.name.message}
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="user-role">Papel</Label>
          <Controller
            control={control}
            name="role"
            render={({ field }) => (
              <Select value={field.value} onValueChange={(v) => field.onChange(v as Role)}>
                <SelectTrigger id="user-role" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Usuário (user)</SelectItem>
                  <SelectItem value="admin">Administrador (admin)</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="user-active">Conta ativa</Label>
            <Controller
              control={control}
              name="active"
              render={({ field }) => (
                <Switch
                  id="user-active"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isSelf}
                  aria-describedby="user-active-hint"
                />
              )}
            />
          </div>
          <p id="user-active-hint" className="text-sm text-muted-foreground">
            {isSelf
              ? 'Você não pode desativar a própria conta.'
              : 'Conta inativa não consegue entrar.'}
          </p>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
            {pending ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </form>
    </>
  )
}
