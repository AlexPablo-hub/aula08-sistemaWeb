import { transcribeMultipart } from './openai-compatible';
import { AudioInput } from './transcription-provider';

export class GroqProvider {
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  transcribe(input: AudioInput): Promise<string> {
    return transcribeMultipart(
      'Groq',
      'https://api.groq.com/openai/v1/audio/transcriptions',
      this.apiKey,
      this.model,
      input,
    );
  }
}
