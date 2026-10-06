import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { validarAudio } from './audio-upload';
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
  constructor(
    @InjectRepository(Transcription)
    private readonly repo: Repository<Transcription>,
    @Inject(TRANSCRIPTION_PROVIDER)
    private readonly provider: TranscriptionProvider,
  ) {}

  // Só grava depois que o provedor responde (RN9).
  async create(
    userId: string,
    file: Express.Multer.File | undefined,
    dto: CreateTranscriptionDto,
  ): Promise<TranscriptionResponseDto> {
    validarAudio(file);
    const audio = file as Express.Multer.File;
    const language = dto.language ?? 'pt';

    const text = await this.provider.transcribe({
      buffer: audio.buffer,
      fileName: audio.originalname,
      mimeType: audio.mimetype,
      language,
    });

    const saved = await this.repo.save(
      this.repo.create({
        userId,
        fileName: audio.originalname.slice(0, 255),
        language,
        text,
      }),
    );
    return toTranscriptionResponse(saved);
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

  async remove(userId: string, id: string): Promise<void> {
    const transcricao = await this.buscarDoDono(userId, id);
    await this.repo.delete({ id: transcricao.id, userId });
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
