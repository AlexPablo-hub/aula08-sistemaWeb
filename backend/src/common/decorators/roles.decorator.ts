import { SetMetadata } from '@nestjs/common';
import { Role } from '../../users/entities/user.entity';

export const ROLES_KEY = 'roles';

// Papéis aceitos na rota; lido pela RolesGuard.
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
