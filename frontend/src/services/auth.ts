import { api } from './api'
import type { AuthResponse, GoogleConfig, LoginInput, RegisterInput } from '@/types'

export async function register(input: RegisterInput): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/register', input)
  return data
}

export async function login(input: LoginInput): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/login', input)
  return data
}

/** Client ID público do Google. Responde 404 quando o login com Google não está configurado. */
export async function getGoogleConfig(): Promise<GoogleConfig> {
  const { data } = await api.get<GoogleConfig>('/auth/google')
  return data
}

/** Envia o ID token do Google; o backend o valida e devolve a sessão, no formato do login. */
export async function loginWithGoogle(credential: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/google', { credential })
  return data
}
