import { ConfigService } from '@nestjs/config';

export enum TranscriptionProviderName {
  Groq = 'groq',
  OpenRouter = 'openrouter',
}

export interface TranscriptionOption {
  provider: TranscriptionProviderName;
  model: string;
  label: string;
}

// Catálogo fixo (seção 8 da especificação). Só estas combinações podem ser escolhidas.
export const TRANSCRIPTION_CATALOG: readonly TranscriptionOption[] = [
  {
    provider: TranscriptionProviderName.Groq,
    model: 'whisper-large-v3-turbo',
    label: 'Groq: Whisper Large v3 Turbo',
  },
  {
    provider: TranscriptionProviderName.Groq,
    model: 'whisper-large-v3',
    label: 'Groq: Whisper Large v3',
  },
  {
    provider: TranscriptionProviderName.OpenRouter,
    model: 'openai/whisper-large-v3-turbo',
    label: 'OpenRouter: Whisper Large v3 Turbo',
  },
  {
    provider: TranscriptionProviderName.OpenRouter,
    model: 'openai/whisper-large-v3',
    label: 'OpenRouter: Whisper Large v3',
  },
  {
    provider: TranscriptionProviderName.OpenRouter,
    model: 'openai/whisper-1',
    label: 'OpenRouter: Whisper 1',
  },
  {
    provider: TranscriptionProviderName.OpenRouter,
    model: 'fish-audio/transcribe-1-pro',
    label: 'OpenRouter: Fish Audio Transcribe 1 Pro',
  },
];

// Ordem de preferência do padrão (RN19).
export const DEFAULT_MODELS: Readonly<
  Record<TranscriptionProviderName, string>
> = {
  [TranscriptionProviderName.Groq]: 'whisper-large-v3-turbo',
  [TranscriptionProviderName.OpenRouter]: 'openai/whisper-large-v3-turbo',
};

export const PROVIDER_ORDER: readonly TranscriptionProviderName[] = [
  TranscriptionProviderName.Groq,
  TranscriptionProviderName.OpenRouter,
];

const KEY_VARIABLE: Readonly<Record<TranscriptionProviderName, string>> = {
  [TranscriptionProviderName.Groq]: 'GROQ_API_KEY',
  [TranscriptionProviderName.OpenRouter]: 'OPENROUTER_API_KEY',
};

// Devolve a chave do provedor, ou undefined se não estiver preenchida.
// Só para uso interno: a chave nunca sai do servidor.
export function providerApiKey(
  config: ConfigService,
  provider: TranscriptionProviderName,
): string | undefined {
  return config.get<string>(KEY_VARIABLE[provider])?.trim() || undefined;
}

export function inCatalog(provider: string, model: string): boolean {
  return TRANSCRIPTION_CATALOG.some(
    (o) => o.provider === provider && o.model === model,
  );
}
