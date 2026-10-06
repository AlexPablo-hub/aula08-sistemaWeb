// Espelha o contrato de PATCH /api/users/:id (seção 6 de docs/ESPECIFICACAO.md).
import type { Role } from './auth'

/** Corpo parcial: qualquer combinação de name, role e active. */
export type UpdateUserInput = {
  name?: string
  role?: Role
  active?: boolean
}
