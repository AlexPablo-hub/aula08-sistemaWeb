import { TranscriptionProviderName } from '../../settings/transcription-catalog';

// Dados do áudio, sem provedor nem modelo (esses vêm da configuração salva).
export interface AudioInput {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  language: string;
}

// Áudio mais a escolha resolvida a cada envio (provedor e modelo).
export interface TranscribeInput extends AudioInput {
  provider: TranscriptionProviderName;
  model: string;
}

// Interface comum aos provedores externos de transcrição.
export interface TranscriptionProvider {
  // Devolve o texto transcrito. Qualquer falha vira BadGatewayException.
  transcribe(input: TranscribeInput): Promise<string>;
}

export const TRANSCRIPTION_PROVIDER = Symbol('TRANSCRIPTION_PROVIDER');

export const TIMEOUT_MS = 120_000;
