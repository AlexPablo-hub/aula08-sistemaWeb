import { Role, User } from '../entities/user.entity';

// Objeto de saída: nunca inclui passwordHash.
export class UserResponseDto {
  id: string;
  name: string;
  email: string;
  role: Role;
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
