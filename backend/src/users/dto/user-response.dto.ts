import { ApiProperty } from '@nestjs/swagger';
import { Role, User } from '../entities/user.entity';

// Objeto de saída: nunca inclui passwordHash.
export class UserResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Maria Silva' })
  name: string;

  @ApiProperty({ example: 'maria@exemplo.com' })
  email: string;

  @ApiProperty({ enum: Role })
  role: Role;

  @ApiProperty()
  active: boolean;
}

export function toUserResponse(user: User): UserResponseDto {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active,
  };
}
