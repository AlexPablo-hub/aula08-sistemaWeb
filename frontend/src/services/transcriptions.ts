import { api } from './api'
import { audioMimeFromFileName } from '@/lib/audio'
import type { Transcription, UpdateTranscriptionInput } from '@/types'

export async function list(): Promise<Transcription[]> {
  const { data } = await api.get<Transcription[]>('/transcriptions')
  return data
}

export async function get(id: string): Promise<Transcription> {
  const { data } = await api.get<Transcription>(`/transcriptions/${id}`)
  return data
}

/** Envia o áudio como multipart. O Content-Type (com boundary) é montado pelo axios/navegador. */
export async function create(file: File, language: string): Promise<Transcription> {
  const form = new FormData()
  form.append('file', file)
  form.append('language', language)
  const { data } = await api.post<Transcription>('/transcriptions', form)
  return data
}

/** Altera só o título; o nome original do arquivo, o texto e o áudio não mudam. */
export async function updateTitle(id: string, title: string): Promise<Transcription> {
  const body: UpdateTranscriptionInput = { title }
  const { data } = await api.patch<Transcription>(`/transcriptions/${id}`, body)
  return data
}

export async function remove(id: string): Promise<void> {
  await api.delete(`/transcriptions/${id}`)
}

/** Baixa o áudio guardado. Passa por `api` para levar o token; o <audio src> não envia o cabeçalho. */
export async function getAudio(id: string, fileName: string): Promise<Blob> {
  const { data } = await api.get<Blob>(`/transcriptions/${id}/audio`, { responseType: 'blob' })
  const type = data.type
  if (type && type !== 'application/octet-stream') return data
  // Tipo ausente ou genérico: deduz pela extensão para o player reconhecer o formato.
  const guessed = audioMimeFromFileName(fileName)
  return guessed ? new Blob([data], { type: guessed }) : data
}
