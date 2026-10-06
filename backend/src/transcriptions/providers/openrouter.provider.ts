import { transcribeJsonBase64, transcribeMultipart } from './openai-compatible';
import { AudioInput } from './transcription-provider';

const URL = 'https://openrouter.ai/api/v1/audio/transcriptions';

// Modelos que a documentação do OpenRouter descreve com corpo JSON (input_audio
// em base64) em vez de multipart. Os demais usam multipart no estilo OpenAI.
const MODELOS_JSON = ['fish-audio/'];

// Endpoint dedicado de fala para texto do OpenRouter. Formatos documentados:
// wav, mp3, flac, m4a, ogg, webm, aac. Não há conversão: se o OpenRouter
// recusar o formato, a resposta é 502.
// https://openrouter.ai/docs/guides/overview/multimodal/stt
export class OpenRouterProvider {
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  transcribe(input: AudioInput): Promise<string> {
    if (MODELOS_JSON.some((prefixo) => this.model.startsWith(prefixo))) {
      return transcribeJsonBase64(
        'OpenRouter',
        URL,
        this.apiKey,
        this.model,
        input,
      );
    }
    return transcribeMultipart('OpenRouter', URL, this.apiKey, this.model, input);
  }
}
