import { api } from './api'
import type { TranscriptionSettings, UpdateTranscriptionSettingsInput } from '@/types'

/** Chave do cache do TanStack Query para a configuração de transcrição. */
export const TRANSCRIPTION_SETTINGS_KEY = ['settings', 'transcription']

export async function getTranscriptionSettings(): Promise<TranscriptionSettings> {
  const { data } = await api.get<TranscriptionSettings>('/settings/transcription')
  return data
}

export async function updateTranscriptionSettings(
  input: UpdateTranscriptionSettingsInput,
): Promise<TranscriptionSettings> {
  const { data } = await api.patch<TranscriptionSettings>('/settings/transcription', input)
  return data
}
