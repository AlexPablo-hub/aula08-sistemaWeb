import { transcribeMultipart } from './openai-compatible';
import {
  TranscribeInput,
  TranscriptionProvider,
} from './transcription-provider';

// Endpoint dedicado de fala para texto do OpenRouter (aceita multipart no estilo OpenAI).
// Formatos documentados: wav, mp3, flac, m4a, ogg, webm, aac. Não há conversão:
// se o OpenRouter recusar o formato, a resposta é 502.
// https://openrouter.ai/docs/guides/overview/multimodal/stt
export class OpenRouterProvider implements TranscriptionProvider {
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  transcribe(input: TranscribeInput): Promise<string> {
    return transcribeMultipart(
      'OpenRouter',
      'https://openrouter.ai/api/v1/audio/transcriptions',
      this.apiKey,
      this.model,
      input,
    );
  }
}
