import { BadGatewayException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GroqProvider } from './groq.provider';
import { OpenRouterProvider } from './openrouter.provider';
import { TranscriptionProvider } from './transcription-provider';

const NAO_CONFIGURADO =
  'O serviço de transcrição não está configurado. Avise o administrador.';

// Provedor sem chave: a aplicação sobe, mas o envio responde 502.
class NaoConfiguradoProvider implements TranscriptionProvider {
  transcribe(): Promise<string> {
    return Promise.reject(new BadGatewayException(NAO_CONFIGURADO));
  }
}

// TRANSCRIPTION_PROVIDER=groq|openrouter; vazio escolhe pela chave preenchida
// (Groq primeiro, depois OpenRouter).
export function criarProvedor(config: ConfigService): TranscriptionProvider {
  const groqKey = config.get<string>('GROQ_API_KEY')?.trim();
  const orKey = config.get<string>('OPENROUTER_API_KEY')?.trim();
  const escolhido = config
    .get<string>('TRANSCRIPTION_PROVIDER')
    ?.trim()
    .toLowerCase();

  const nome = escolhido || (groqKey ? 'groq' : orKey ? 'openrouter' : '');

  if (nome === 'groq' && groqKey) {
    return new GroqProvider(
      groqKey,
      config.get<string>('GROQ_MODEL')?.trim() || 'whisper-large-v3-turbo',
    );
  }
  if (nome === 'openrouter' && orKey) {
    return new OpenRouterProvider(
      orKey,
      config.get<string>('OPENROUTER_MODEL')?.trim() ||
        'openai/whisper-large-v3-turbo',
    );
  }
  return new NaoConfiguradoProvider();
}
