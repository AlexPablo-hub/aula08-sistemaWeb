import axios from 'axios'
import { useAuthStore } from '@/store/authStore'

/** Única instância do axios. A URL é relativa; em desenvolvimento o Vite encaminha /api ao backend. */
export const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    // Só trata o 401 quando a requisição levava token (sessão expirada ou inválida).
    // O 401 do login com senha errada não tem token e segue para o formulário.
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const hadToken = Boolean(error.config?.headers?.Authorization)
      if (hadToken) {
        // As rotas protegidas observam o store e levam a /entrar.
        useAuthStore.getState().clearSession()
      }
    }
    return Promise.reject(error)
  },
)
