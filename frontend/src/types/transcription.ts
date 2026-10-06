// Espelha o contrato da seção 6 de docs/ESPECIFICACAO.md.

export type Transcription = {
  id: string
  /** Título efetivo: o título salvo ou, sem ele, o nome do arquivo. */
  title: string
  /** Nome original do arquivo; nunca muda. */
  fileName: string
  language: string
  text: string
  hasAudio: boolean
  createdAt: string
}

export type UpdateTranscriptionInput = {
  title: string
}
