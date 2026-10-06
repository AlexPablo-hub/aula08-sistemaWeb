import { ApiProperty } from '@nestjs/swagger';
import { Transcription } from '../entities/transcription.entity';

// Objeto de saída: nunca inclui userId, audioKey nem a entidade.
export class TranscriptionResponseDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() fileName: string;
  @ApiProperty({ example: 'pt' }) language: string;
  @ApiProperty() text: string;
  @ApiProperty({
    description: 'Verdadeiro quando o áudio ficou guardado e pode ser ouvido.',
  })
  hasAudio: boolean;
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
    hasAudio: t.audioKey != null,
    createdAt: t.createdAt,
  };
}
