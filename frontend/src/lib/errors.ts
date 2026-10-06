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

/** Mensagem do backend (campo `message`, texto ou lista), se houver. */
function backendMessage(error: unknown): string | null {
  if (!axios.isAxiosError(error)) return null
  const message: unknown = error.response?.data?.message
  if (typeof message === 'string') return message
  if (Array.isArray(message) && message.every((m) => typeof m === 'string')) return message.join(' ')
  return null
}

/** Converte um erro de chamada às transcrições em texto claro para o usuário. */
export function describeTranscriptionError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return 'Não foi possível falar com o servidor. Verifique a conexão e tente de novo.'
    }
    const message = backendMessage(error)
    switch (error.response.status) {
      case 400:
        return message ?? 'Arquivo ou idioma inválido. Confira e tente de novo.'
      case 401:
        return 'Sua sessão expirou. Entre de novo.'
      case 404:
        return 'Transcrição não encontrada. Ela pode ter sido excluída.'
      case 413:
        return 'O arquivo passa do limite de 25 MB. Envie um arquivo menor.'
      case 502:
        return message
          ? `O serviço de transcrição está indisponível: ${message}`
          : 'O serviço de transcrição está indisponível. Tente de novo em instantes.'
    }
  }
  return 'Algo deu errado. Tente de novo em instantes.'
}
