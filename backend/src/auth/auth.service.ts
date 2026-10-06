import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/entities/user.entity';
import { toUserResponse } from '../users/dto/user-response.dto';
import { UsersService } from '../users/users.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleTokenVerifier } from './google-token-verifier';
import { RegisterDto } from './dto/register.dto';

const MENSAGEM_CREDENCIAIS = 'E-mail ou senha inválidos.';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly googleVerifier: GoogleTokenVerifier,
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
    // Conta só do Google (sem senha) também recebe a mesma mensagem, sem chamar o bcrypt.
    const senhaConfere =
      user && user.passwordHash
        ? await bcrypt.compare(dto.password, user.passwordHash)
        : false;
    if (!user || !senhaConfere || !user.active) {
      throw new UnauthorizedException(MENSAGEM_CREDENCIAIS);
    }
    return this.buildResponse(user);
  }

  // Login e cadastro com Google (RN11 a RN14). O papel nunca vem do cliente.
  async loginWithGoogle(dto: GoogleAuthDto): Promise<AuthResponseDto> {
    if (!this.getGoogleClientId()) {
      throw new UnauthorizedException('Login com Google não configurado.');
    }
    const identity = await this.googleVerifier.verify(dto.credential);
    if (!identity.emailVerified) {
      throw new UnauthorizedException('O e-mail da conta Google não foi verificado.');
    }
    const email = identity.email.trim().toLowerCase();

    let user = await this.users.findByGoogleId(identity.sub);
    if (!user) {
      const existing = await this.users.findByEmail(email);
      if (existing) {
        if (existing.googleId && existing.googleId !== identity.sub) {
          throw new UnauthorizedException(
            'Esta conta já está vinculada a outra conta Google.',
          );
        }
        user = await this.users.linkGoogleId(existing, identity.sub);
      } else {
        const nome = identity.name.trim() || email.split('@')[0];
        user = await this.users.createFromGoogle({
          name: nome.slice(0, 100),
          email,
          googleId: identity.sub,
        });
      }
    }
    if (!user.active) {
      throw new UnauthorizedException(MENSAGEM_CREDENCIAIS);
    }
    return this.buildResponse(user);
  }

  // Client ID público; o frontend o descobre por GET /api/auth/google.
  getGoogleClientId(): string | undefined {
    return this.config.get<string>('GOOGLE_CLIENT_ID')?.trim() || undefined;
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
