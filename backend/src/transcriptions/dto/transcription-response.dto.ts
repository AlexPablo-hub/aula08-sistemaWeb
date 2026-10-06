import { ApiProperty } from '@nestjs/swagger';
import { Transcription } from '../entities/transcription.entity';

// Objeto de saída: nunca inclui userId nem a entidade.
export class TranscriptionResponseDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() fileName: string;
  @ApiProperty({ example: 'pt' }) language: string;
  @ApiProperty() text: string;
  @ApiProperty() createdAt: Date;
}

export function toTranscriptionResponse(
  t: Transcription,
): TranscriptionResponseDto {
  return {
    id: t.id,
    fileName: t.fileName,
    language: t.language,
    text: t.text,
    createdAt: t.createdAt,
  };
}
