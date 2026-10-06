import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { TranscriptionProviderName } from '../transcription-catalog';

export class UpdateTranscriptionSettingsDto {
  @ApiProperty({ enum: TranscriptionProviderName, example: 'openrouter' })
  @IsEnum(TranscriptionProviderName, {
    message: 'O provedor deve ser "groq" ou "openrouter".',
  })
  provider: TranscriptionProviderName;

  @ApiProperty({ maxLength: 200, example: 'fish-audio/transcribe-1-pro' })
  @IsString({ message: 'O modelo deve ser um texto.' })
  @IsNotEmpty({ message: 'O modelo não pode ser vazio.' })
  @MaxLength(200, { message: 'O modelo deve ter no máximo 200 caracteres.' })
  model: string;
}
