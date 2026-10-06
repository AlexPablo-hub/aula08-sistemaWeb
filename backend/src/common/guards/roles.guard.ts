import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role, User } from '../../users/entities/user.entity';

// Deve rodar depois do JwtAuthGuard: lê o usuário que a JwtStrategy carregou do banco.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) {
      return true;
    }
    const user = context.switchToHttp().getRequest<Request>().user as
      | User
      | undefined;
    if (!user || !required.includes(user.role)) {
      throw new ForbiddenException('Acesso restrito a administradores.');
    }
    return true;
  }
}
