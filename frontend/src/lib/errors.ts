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

/** Converte um erro de chamada ao áudio de uma transcrição em texto claro para o usuário. */
export function describeAudioError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return 'Não foi possível falar com o servidor. Verifique a conexão e tente de novo.'
    }
    switch (error.response.status) {
      case 401:
        return 'Sua sessão expirou. Entre de novo.'
      case 404:
        return 'Áudio não encontrado.'
    }
  }
  return 'Não foi possível carregar o áudio. Tente de novo em instantes.'
}

/** Converte um erro de chamada à configuração de transcrição em texto claro para o usuário. */
export function describeSettingsError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return 'Não foi possível falar com o servidor. Verifique a conexão e tente de novo.'
    }
    const message = backendMessage(error)
    switch (error.response.status) {
      case 400:
        return message ?? 'Escolha inválida. Selecione outra opção e tente de novo.'
      case 401:
        return 'Sua sessão expirou. Entre de novo.'
      case 403:
        return 'Você não tem permissão para alterar a configuração de transcrição.'
    }
  }
  return 'Algo deu errado. Tente de novo em instantes.'
}

/** Converte um erro de chamada à administração de contas em texto claro para o usuário. */
export function describeUserError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return 'Não foi possível falar com o servidor. Verifique a conexão e tente de novo.'
    }
    const message = backendMessage(error)
    switch (error.response.status) {
      case 400:
        return message ?? 'Dados inválidos. Confira os campos e tente de novo.'
      case 401:
        return 'Sua sessão expirou. Entre de novo.'
      case 403:
        return 'Você não tem permissão para administrar contas.'
      case 404:
        return 'Conta não encontrada. Atualize a lista e tente de novo.'
      case 409:
        return message ?? 'Um administrador não pode desativar a própria conta.'
    }
  }
  return 'Algo deu errado. Tente de novo em instantes.'
}
