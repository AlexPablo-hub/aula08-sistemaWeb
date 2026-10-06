import { transcribeMultipart } from './openai-compatible';
import {
  TranscribeInput,
  TranscriptionProvider,
} from './transcription-provider';

export class GroqProvider implements TranscriptionProvider {
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  transcribe(input: TranscribeInput): Promise<string> {
    return transcribeMultipart(
      'Groq',
      'https://api.groq.com/openai/v1/audio/transcriptions',
      this.apiKey,
      this.model,
      input,
    );
  }
}
