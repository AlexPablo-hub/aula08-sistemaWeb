export interface TranscribeInput {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  language: string;
}

// Interface comum aos provedores externos de transcrição.
export interface TranscriptionProvider {
  // Devolve o texto transcrito. Qualquer falha vira BadGatewayException.
  transcribe(input: TranscribeInput): Promise<string>;
}

export const TRANSCRIPTION_PROVIDER = Symbol('TRANSCRIPTION_PROVIDER');

export const TIMEOUT_MS = 120_000;
