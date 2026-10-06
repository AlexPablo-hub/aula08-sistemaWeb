import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { EditUserDialog } from '@/components/admin/EditUserDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { describeUserError } from '@/lib/errors'
import { list, USERS_KEY } from '@/services/users'
import { useAuthStore } from '@/store/authStore'
import type { User } from '@/types'

/** Lista de contas com edição de nome, papel e situação. */
export function AccountsPanel() {
  const sessionId = useAuthStore((s) => s.user?.id)
  const [editing, setEditing] = useState<User | null>(null)

  const query = useQuery({
    queryKey: USERS_KEY,
    queryFn: list,
    // 401 e 403 não melhoram ao repetir.
    retry: (count, error) => {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined
      return status !== 401 && status !== 403 && count < 2
    },
  })

  return (
    <>
      <p className="mb-4 text-sm text-muted-foreground">
        Contas cadastradas. Altere nome, papel e situação de cada uma.
      </p>

      {query.isPending ? (
        <div className="space-y-3" aria-label="Carregando contas">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : null}

      {query.isError ? (
        <div className="space-y-3">
          <p
            role="alert"
            className="border border-destructive bg-destructive-soft px-3 py-2 text-sm text-destructive"
          >
            Não foi possível carregar as contas. {describeUserError(query.error)}
          </p>
          <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
            Tentar de novo
          </Button>
        </div>
      ) : null}

      {query.isSuccess && query.data.length === 0 ? (
        <p className="text-muted-foreground">Nenhuma conta cadastrada.</p>
      ) : null}

      {query.isSuccess && query.data.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead>
                <span className="sr-only">Ações</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.data.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">
                  {user.name}
                  {user.id === sessionId ? (
                    <span className="ml-2 text-sm font-normal text-muted-foreground">(você)</span>
                  ) : null}
                </TableCell>
                <TableCell className="font-mono text-sm">{user.email}</TableCell>
                <TableCell>
                  <Badge variant={user.role === 'admin' ? 'accent' : 'outline'}>
                    {user.role === 'admin' ? 'Administrador' : 'Usuário'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={user.active ? 'success' : 'destructive'}>
                    {user.active ? 'Ativa' : 'Inativa'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" onClick={() => setEditing(user)}>
                    Editar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}

      <EditUserDialog user={editing} onClose={() => setEditing(null)} />
    </>
  )
}
