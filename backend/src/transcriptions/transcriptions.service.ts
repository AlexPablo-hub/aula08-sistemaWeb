import { Inject, Injectable } from '@nestjs/common';
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
}
