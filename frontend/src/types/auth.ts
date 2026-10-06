// Espelha o contrato da seção 6 de docs/ESPECIFICACAO.md.

export type Role = 'user' | 'admin'

export type User = {
  id: string
  name: string
  email: string
  role: Role
  active: boolean
}

export type AuthResponse = {
  user: User
  accessToken: string
}

export type RegisterInput = {
  name: string
  email: string
  password: string
}

export type LoginInput = {
  email: string
  password: string
}

/** Resposta de GET /api/auth/google: o client ID público do Google (a rota retorna 404 se não configurado). */
export type GoogleConfig = {
  clientId: string
}

/** Corpo de POST /api/auth/google: o ID token que o Google Identity Services entrega ao navegador. */
export type GoogleLoginInput = {
  credential: string
}
