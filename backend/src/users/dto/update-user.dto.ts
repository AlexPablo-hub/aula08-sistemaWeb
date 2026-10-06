import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Role } from '../entities/user.entity';

// Qualquer combinação de campos; ao menos um é exigido pelo serviço.
export class UpdateUserDto {
  @ApiPropertyOptional({ minLength: 1, maxLength: 100, example: 'Maria Silva' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: 'O nome deve ser um texto.' })
  @IsNotEmpty({ message: 'O nome não pode ser vazio.' })
  @MaxLength(100, { message: 'O nome deve ter no máximo 100 caracteres.' })
  name?: string;

  @ApiPropertyOptional({ enum: Role, example: Role.User })
  @IsOptional()
  @IsEnum(Role, { message: 'O papel deve ser "user" ou "admin".' })
  role?: Role;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean({ message: 'O campo active deve ser verdadeiro ou falso.' })
  active?: boolean;
}
