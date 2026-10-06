import { Readable } from 'node:stream';

// Áudio lido do armazenamento, pronto para ser devolvido ao dono.
export interface StoredAudio {
  stream: Readable;
  contentType: string;
  contentLength: number;
}

// Contrato do armazenamento de áudio. A classe abstrata serve de token de
// injeção; os testes a substituem por um falso em memória.
export abstract class AudioStorage {
  // Falso quando alguma variável MINIO_* obrigatória está vazia (RN25).
  abstract isConfigured(): boolean;

  // Falha do armazenamento vira BadGatewayException (RN24).
  abstract put(key: string, body: Buffer, contentType: string): Promise<void>;

  // Objeto inexistente vira NotFoundException; outra falha, BadGatewayException.
  abstract get(key: string): Promise<StoredAudio>;

  // Melhor esforço: nunca lança; registra aviso com a chave (RN23).
  abstract delete(key: string): Promise<void>;
}
