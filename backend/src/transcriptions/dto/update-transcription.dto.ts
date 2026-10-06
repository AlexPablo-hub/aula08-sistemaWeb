import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

// Único campo editável da transcrição (RN27); o texto não é editável.
export class UpdateTranscriptionDto {
  @ApiProperty({ minLength: 1, maxLength: 120, example: 'Reunião de segunda' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: 'O título deve ser um texto.' })
  @IsNotEmpty({ message: 'O título não pode ser vazio.' })
  @MaxLength(120, { message: 'O título deve ter no máximo 120 caracteres.' })
  title: string;
}
