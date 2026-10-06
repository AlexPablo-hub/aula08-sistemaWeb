import { api } from './api'
import type { Transcription } from '@/types'

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

export async function remove(id: string): Promise<void> {
  await api.delete(`/transcriptions/${id}`)
}
