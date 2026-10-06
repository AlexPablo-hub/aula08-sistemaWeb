// Espelha o contrato da seção 6 de docs/ESPECIFICACAO.md.

export type Transcription = {
  id: string
  fileName: string
  language: string
  text: string
  hasAudio: boolean
  createdAt: string
}
