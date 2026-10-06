import axios from 'axios'

type MessageMap = Partial<Record<number, string>>

/** Converte um erro de chamada em texto claro para o usuário. */
export function describeAuthError(error: unknown, byStatus: MessageMap = {}): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return 'Não foi possível falar com o servidor. Verifique a conexão e tente de novo.'
    }
    const status = error.response.status
    const mapped = byStatus[status]
    if (mapped) return mapped
    if (status === 401) {
      const message: unknown = error.response.data?.message
      return typeof message === 'string' ? message : 'E-mail ou senha inválidos.'
    }
    if (status === 400) return 'Dados inválidos. Confira os campos e tente de novo.'
  }
  return 'Algo deu errado. Tente de novo em instantes.'
}
