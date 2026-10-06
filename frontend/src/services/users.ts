import { api } from './api'
import type { UpdateUserInput, User } from '@/types'

/** Chave do cache do TanStack Query para a lista de contas. */
export const USERS_KEY = ['users']

export async function list(): Promise<User[]> {
  const { data } = await api.get<User[]>('/users')
  return data
}

/** Envia somente os campos alterados. */
export async function update(id: string, input: UpdateUserInput): Promise<User> {
  const { data } = await api.patch<User>(`/users/${id}`, input)
  return data
}
