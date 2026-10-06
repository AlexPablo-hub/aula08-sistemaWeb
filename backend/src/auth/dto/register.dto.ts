import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ maxLength: 100, example: 'Maria Silva' })
  @IsString({ message: 'O nome deve ser um texto.' })
  @IsNotEmpty({ message: 'O nome é obrigatório.' })
  @MaxLength(100, { message: 'O nome deve ter no máximo 100 caracteres.' })
  name: string;

  @ApiProperty({ maxLength: 255, example: 'maria@exemplo.com' })
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  @MaxLength(255, { message: 'O e-mail deve ter no máximo 255 caracteres.' })
  email: string;

  @ApiProperty({ minLength: 8, example: 'senha-segura-123' })
  @IsString({ message: 'A senha deve ser um texto.' })
  @MinLength(8, { message: 'A senha deve ter no mínimo 8 caracteres.' })
  password: string;
}
