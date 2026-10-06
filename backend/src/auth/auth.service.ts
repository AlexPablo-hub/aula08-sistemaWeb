import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/entities/user.entity';
import { toUserResponse } from '../users/dto/user-response.dto';
import { UsersService } from '../users/users.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const MENSAGEM_CREDENCIAIS = 'E-mail ou senha inválidos.';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    if (await this.users.findByEmail(dto.email)) {
      throw new ConflictException('Já existe uma conta com este e-mail.');
    }
    // O papel nunca vem do cliente: o cadastro público cria sempre "user".
    const user = await this.users.create({
      name: dto.name.trim(),
      email: dto.email,
      password: dto.password,
    });
    return this.buildResponse(user);
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.users.findByEmail(dto.email);
    // Mesma mensagem para e-mail inexistente, senha errada e conta desativada (RN4).
    const senhaConfere = user
      ? await bcrypt.compare(dto.password, user.passwordHash)
      : false;
    if (!user || !senhaConfere || !user.active) {
      throw new UnauthorizedException(MENSAGEM_CREDENCIAIS);
    }
    return this.buildResponse(user);
  }

  private async buildResponse(user: User): Promise<AuthResponseDto> {
    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    return { user: toUserResponse(user), accessToken };
  }
}
