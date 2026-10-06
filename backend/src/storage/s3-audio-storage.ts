import {
  BadGatewayException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Readable } from 'node:stream';
import { AudioStorage, StoredAudio } from './audio-storage';

const REGIAO_PADRAO = 'us-east-1';
const INDISPONIVEL = 'O serviço de armazenamento de áudio está indisponível.';

// Implementação para MinIO (compatível com S3). Credenciais nunca vão para log.
@Injectable()
export class S3AudioStorage extends AudioStorage {
  private readonly logger = new Logger(S3AudioStorage.name);
  private readonly bucket: string;
  private readonly client: S3Client | null;

  constructor(config: ConfigService) {
    super();
    const endpoint = config.get<string>('MINIO_ENDPOINT')?.trim();
    const bucket = config.get<string>('MINIO_BUCKET')?.trim();
    const accessKeyId = config.get<string>('MINIO_ACCESS_KEY')?.trim();
    const secretAccessKey = config.get<string>('MINIO_SECRET_KEY')?.trim();
    this.bucket = bucket ?? '';
    this.client =
      endpoint && bucket && accessKeyId && secretAccessKey
        ? new S3Client({
            endpoint,
            region: config.get<string>('MINIO_REGION')?.trim() || REGIAO_PADRAO,
            credentials: { accessKeyId, secretAccessKey },
            forcePathStyle: true,
          })
        : null;
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    if (!this.client) throw new BadGatewayException(INDISPONIVEL);
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
          ContentLength: body.length,
        }),
      );
    } catch (erro) {
      this.logger.error(`Falha ao guardar o objeto ${key}: ${nomeDoErro(erro)}`);
      throw new BadGatewayException(INDISPONIVEL);
    }
  }

  async get(key: string): Promise<StoredAudio> {
    if (!this.client) throw new NotFoundException('Áudio não encontrado.');
    try {
      const res = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      if (!(res.Body instanceof Readable)) {
        throw new Error('Corpo da resposta sem stream.');
      }
      return {
        stream: res.Body,
        contentType: res.ContentType ?? 'application/octet-stream',
        contentLength: res.ContentLength ?? 0,
      };
    } catch (erro) {
      const nome = nomeDoErro(erro);
      if (nome === 'NoSuchKey' || nome === 'NotFound') {
        throw new NotFoundException('Áudio não encontrado.');
      }
      this.logger.error(`Falha ao ler o objeto ${key}: ${nome}`);
      throw new BadGatewayException(INDISPONIVEL);
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
      );
    } catch (erro) {
      this.logger.warn(
        `Não foi possível apagar o objeto ${key}: ${nomeDoErro(erro)}`,
      );
    }
  }
}

function nomeDoErro(erro: unknown): string {
  return erro instanceof Error ? erro.name : 'erro desconhecido';
}
