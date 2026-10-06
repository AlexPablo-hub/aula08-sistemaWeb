// Espelha o contrato de /api/settings/transcription (seção 6 de docs/ESPECIFICACAO.md).

export type TranscriptionProvider = 'groq' | 'openrouter'

/** Uma combinação provedor + modelo do catálogo, que vem da API. */
export type TranscriptionOption = {
  provider: TranscriptionProvider
  model: string
  label: string
  /** Verdadeiro quando a chave do provedor está configurada no servidor. */
  available: boolean
}

export type TranscriptionSettings = {
  provider: TranscriptionProvider
  model: string
  /** `default` quando vale o padrão (RN19); `admin` quando há escolha salva. */
  source: 'default' | 'admin'
  options: TranscriptionOption[]
}

/** Corpo do PATCH: ambos os campos são obrigatórios. */
export type UpdateTranscriptionSettingsInput = {
  provider: TranscriptionProvider
  model: string
}
