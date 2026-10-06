import { BadGatewayException, NotFoundException } from '@nestjs/common';
import { Readable } from 'node:stream';
import { AudioStorage, StoredAudio } from '../src/storage/audio-storage';

// Armazenamento falso em memória: nenhum teste chama o MinIO real.
export class FakeAudioStorage extends AudioStorage {
  readonly objetos = new Map<string, { body: Buffer; contentType: string }>();
  configurado: boolean;
  falharPut = false;
  falharDelete = false;
  readonly apagados: string[] = [];

  constructor(configurado = true) {
    super();
    this.configurado = configurado;
  }

  isConfigured(): boolean {
    return this.configurado;
  }

  put(key: string, body: Buffer, contentType: string): Promise<void> {
    if (this.falharPut) {
      return Promise.reject(
        new BadGatewayException(
          'O serviço de armazenamento de áudio está indisponível.',
        ),
      );
    }
    this.objetos.set(key, { body, contentType });
    return Promise.resolve();
  }

  get(key: string): Promise<StoredAudio> {
    const obj = this.objetos.get(key);
    if (!obj) return Promise.reject(new NotFoundException('Áudio não encontrado.'));
    return Promise.resolve({
      stream: Readable.from([obj.body]),
      contentType: obj.contentType,
      contentLength: obj.body.length,
    });
  }

  delete(key: string): Promise<void> {
    this.apagados.push(key);
    if (this.falharDelete) return Promise.reject(new Error('falha simulada'));
    this.objetos.delete(key);
    return Promise.resolve();
  }
}
