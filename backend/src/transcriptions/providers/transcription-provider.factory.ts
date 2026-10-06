import { BadGatewayException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  TranscriptionProviderName,
  providerApiKey,
} from '../../settings/transcription-catalog';
import { GroqProvider } from './groq.provider';
import { OpenRouterProvider } from './openrouter.provider';
import { TranscribeInput, TranscriptionProvider } from './transcription-provider';

const NAO_CONFIGURADO =
  'O serviço de transcrição não está configurado. Avise o administrador.';

// Monta o cliente do provedor a cada envio, com o provedor e o modelo recebidos
// (resolvidos da configuração salva). Sem a chave do provedor, a aplicação segue
// de pé, mas o envio responde 502 e nada é gravado (RN9, RN20).
export function criarProvedor(config: ConfigService): TranscriptionProvider {
  return {
    transcribe(input: TranscribeInput): Promise<string> {
      const chave = providerApiKey(config, input.provider);
      if (!chave) {
        return Promise.reject(new BadGatewayException(NAO_CONFIGURADO));
      }
      if (input.provider === TranscriptionProviderName.Groq) {
        return new GroqProvider(chave, input.model).transcribe(input);
      }
      if (input.provider === TranscriptionProviderName.OpenRouter) {
        return new OpenRouterProvider(chave, input.model).transcribe(input);
      }
      return Promise.reject(new BadGatewayException(NAO_CONFIGURADO));
    },
  };
}
