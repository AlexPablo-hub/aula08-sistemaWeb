import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class GoogleAuthDto {
  @ApiProperty({
    description: 'ID token (JWT) devolvido pelo Google Identity Services.',
  })
  @IsString({ message: 'A credencial do Google deve ser um texto.' })
  @IsNotEmpty({ message: 'A credencial do Google é obrigatória.' })
  @MaxLength(4096, { message: 'A credencial do Google é grande demais.' })
  credential: string;
}

export class GoogleClientIdDto {
  @ApiProperty({
    example: '123456789-abc.apps.googleusercontent.com',
    description: 'Client ID OAuth do Google (público).',
  })
  clientId: string;
}
