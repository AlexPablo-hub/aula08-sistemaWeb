/** Regras de áudio (RN6, RN7 e RN8 da especificação). Fonte única para a validação antes do envio. */

export const ACCEPTED_EXTENSIONS = ['mp3', 'm4a', 'wav', 'ogg', 'webm', 'flac', 'mp4', 'mpeg'] as const

export const MAX_AUDIO_MB = 25

export const MAX_AUDIO_BYTES = MAX_AUDIO_MB * 1024 * 1024

export const DEFAULT_LANGUAGE = 'pt'

/** Idiomas ISO 639-1 comuns, com rótulo em português. */
export const LANGUAGES: { code: string; label: string }[] = [
  { code: 'pt', label: 'Português' },
  { code: 'en', label: 'Inglês' },
  { code: 'es', label: 'Espanhol' },
  { code: 'fr', label: 'Francês' },
  { code: 'de', label: 'Alemão' },
  { code: 'it', label: 'Italiano' },
  { code: 'ja', label: 'Japonês' },
  { code: 'zh', label: 'Chinês' },
  { code: 'ru', label: 'Russo' },
  { code: 'ko', label: 'Coreano' },
  { code: 'ar', label: 'Árabe' },
  { code: 'hi', label: 'Hindi' },
  { code: 'nl', label: 'Holandês' },
  { code: 'pl', label: 'Polonês' },
  { code: 'tr', label: 'Turco' },
  { code: 'uk', label: 'Ucraniano' },
]

export function languageLabel(code: string): string {
  return LANGUAGES.find((l) => l.code === code)?.label ?? code
}

/** Extensão em minúsculas, sem o ponto; vazia se o nome não tiver extensão. */
export function getExtension(fileName: string): string {
  const dot = fileName.lastIndexOf('.')
  if (dot <= 0 || dot === fileName.length - 1) return ''
  return fileName.slice(dot + 1).toLowerCase()
}

/** Texto como "12,3 MB". */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1).replace('.', ',')} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
}

/** Valida nome e tamanho. Devolve a mensagem de erro em português, ou null se o arquivo é aceito. */
export function validateAudio(file: { name: string; size: number }): string | null {
  const extension = getExtension(file.name)
  if (!(ACCEPTED_EXTENSIONS as readonly string[]).includes(extension)) {
    return `Formato não aceito. Envie um arquivo ${ACCEPTED_EXTENSIONS.join(', ')}.`
  }
  if (file.size > MAX_AUDIO_BYTES) {
    return `O arquivo tem ${formatBytes(file.size)} e passa do limite de ${MAX_AUDIO_MB} MB.`
  }
  return null
}
