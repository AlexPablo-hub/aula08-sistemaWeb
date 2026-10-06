import { randomUUID } from 'node:crypto';
import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SettingsService } from '../settings/settings.service';
import { AudioStorage, StoredAudio } from '../storage/audio-storage';
import { extensaoDoArquivo, validarAudio } from './audio-upload';
import { CreateTranscriptionDto } from './dto/create-transcription.dto';
import {
  TranscriptionResponseDto,
  toTranscriptionResponse,
} from './dto/transcription-response.dto';
import { Transcription } from './entities/transcription.entity';
import {
  TRANSCRIPTION_PROVIDER,
  TranscriptionProvider,
} from './providers/transcription-provider';

@Injectable()
export class TranscriptionsService {
  private readonly logger = new Logger(TranscriptionsService.name);

  constructor(
    @InjectRepository(Transcription)
    private readonly repo: Repository<Transcription>,
    @Inject(TRANSCRIPTION_PROVIDER)
    private readonly provider: TranscriptionProvider,
    private readonly settings: SettingsService,
    private readonly storage: AudioStorage,
  ) {}

  // Ordem (RN9, RN21, RN24): transcrever, guardar o áudio, gravar a linha.
  // Falha em qualquer passo não deixa linha nem objeto.
  async create(
    userId: string,
    file: Express.Multer.File | undefined,
    dto: CreateTranscriptionDto,
  ): Promise<TranscriptionResponseDto> {
    validarAudio(file);
    const audio = file as Express.Multer.File;
    const language = dto.language ?? 'pt';

    // Configuração global lida a cada envio (provedor e modelo do painel).
    const { provider, model } = await this.settings.resolveTranscription();
    const text = await this.provider.transcribe({
      provider,
      model,
      buffer: audio.buffer,
      fileName: audio.originalname,
      mimeType: audio.mimetype,
      language,
    });

    // O id é gerado aqui para compor a chave do objeto antes de gravar a linha.
    const id = randomUUID();
    let audioKey: string | null = null;
    if (this.storage.isConfigured()) {
      // Nome do objeto nunca usa o nome original do arquivo.
      audioKey = `audio/${userId}/${id}.${extensaoDoArquivo(audio.originalname)}`;
      await this.storage.put(audioKey, audio.buffer, audio.mimetype);
    }

    try {
      const saved = await this.repo.save(
        this.repo.create({
          id,
          userId,
          fileName: audio.originalname.slice(0, 255),
          language,
          text,
          audioKey,
          audioMimeType: audioKey ? audio.mimetype.slice(0, 100) : null,
          audioSize: audioKey ? audio.size : null,
        }),
      );
      return toTranscriptionResponse(saved);
    } catch (erro) {
      // Compensação em melhor esforço: não deixa objeto órfão.
      if (audioKey) await this.storage.delete(audioKey);
      throw erro;
    }
  }

  // RN10: da mais recente para a mais antiga; RN5: só as do dono.
  async findAll(userId: string): Promise<TranscriptionResponseDto[]> {
    const lista = await this.repo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    return lista.map(toTranscriptionResponse);
  }

  async findOne(userId: string, id: string): Promise<TranscriptionResponseDto> {
    return toTranscriptionResponse(await this.buscarDoDono(userId, id));
  }

  // RN22: só o dono; inexistente, de outro usuário ou sem áudio é 404.
  async getAudio(userId: string, id: string): Promise<StoredAudio> {
    const transcricao = await this.buscarDoDono(userId, id);
    if (!transcricao.audioKey || !this.storage.isConfigured()) {
      throw new NotFoundException('Áudio não encontrado.');
    }
    const objeto = await this.storage.get(transcricao.audioKey);
    return {
      ...objeto,
      contentType: transcricao.audioMimeType ?? objeto.contentType,
    };
  }

  // RN23: apaga a linha e depois o objeto, em melhor esforço.
  async remove(userId: string, id: string): Promise<void> {
    const transcricao = await this.buscarDoDono(userId, id);
    await this.repo.delete({ id: transcricao.id, userId });
    if (transcricao.audioKey) {
      try {
        await this.storage.delete(transcricao.audioKey);
      } catch {
        this.logger.warn(
          `Não foi possível apagar o objeto ${transcricao.audioKey}.`,
        );
      }
    }
  }

  // Inexistente ou de outro usuário: 404 igual nos dois casos (RN5).
  private async buscarDoDono(
    userId: string,
    id: string,
  ): Promise<Transcription> {
    const transcricao = await this.repo.findOneBy({ id, userId });
    if (!transcricao) {
      throw new NotFoundException('Transcrição não encontrada.');
    }
    return transcricao;
  }
}
