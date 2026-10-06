import { ApiProperty } from '@nestjs/swagger';
import { TranscriptionProviderName } from '../transcription-catalog';

export class TranscriptionOptionDto {
  @ApiProperty({ enum: TranscriptionProviderName })
  provider: TranscriptionProviderName;

  @ApiProperty({ example: 'openai/whisper-large-v3-turbo' })
  model: string;

  @ApiProperty({ example: 'OpenRouter: Whisper Large v3 Turbo' })
  label: string;

  @ApiProperty({
    description: 'Verdadeiro quando a chave do provedor está configurada.',
  })
  available: boolean;
}

// Objeto de saída: nunca inclui chaves de API.
export class TranscriptionSettingsResponseDto {
  @ApiProperty({ enum: TranscriptionProviderName })
  provider: TranscriptionProviderName;

  @ApiProperty()
  model: string;

  @ApiProperty({
    enum: ['default', 'admin'],
    description: '"admin" quando há escolha salva; "default" caso contrário.',
  })
  source: 'default' | 'admin';

  @ApiProperty({ type: [TranscriptionOptionDto] })
  options: TranscriptionOptionDto[];
}
