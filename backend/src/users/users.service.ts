import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto, toUserResponse } from './dto/user-response.dto';
import { Role, User } from './entities/user.entity';

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role?: Role;
}

@Injectable()
export class UsersService implements OnApplicationBootstrap {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.ensureInitialAdmin();
  }

  findByEmail(email: string): Promise<User | null> {
    return this.users.findOne({ where: { email: email.trim().toLowerCase() } });
  }

  findById(id: string): Promise<User | null> {
    return this.users.findOne({ where: { id } });
  }

  async findAll(): Promise<UserResponseDto[]> {
    const list = await this.users.find({
      order: { createdAt: 'ASC', id: 'ASC' },
    });
    return list.map(toUserResponse);
  }

  // O acesso de administrador já foi verificado pela RolesGuard; aqui só a RN4.
  async update(
    adminId: string,
    id: string,
    dto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    if (
      dto.name === undefined &&
      dto.role === undefined &&
      dto.active === undefined
    ) {
      throw new BadRequestException(
        'Informe ao menos um campo: name, role ou active.',
      );
    }
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }
    if (dto.active === false && id === adminId) {
      throw new ConflictException(
        'Um administrador não pode desativar a própria conta.',
      );
    }
    if (dto.name !== undefined) user.name = dto.name.trim();
    if (dto.role !== undefined) user.role = dto.role;
    if (dto.active !== undefined) user.active = dto.active;
    return toUserResponse(await this.users.save(user));
  }

  async create(input: CreateUserInput): Promise<User> {
    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = this.users.create({
      name: input.name,
      email: input.email.trim().toLowerCase(),
      passwordHash,
      role: input.role ?? Role.User,
    });
    return this.users.save(user);
  }

  // Cria o administrador inicial se ainda não existir; se existir, não altera nada.
  async ensureInitialAdmin(): Promise<void> {
    const email = this.config.get<string>('ADMIN_EMAIL')?.trim();
    const password = this.config.get<string>('ADMIN_PASSWORD');
    if (!email || !password) {
      this.logger.warn(
        'ADMIN_EMAIL ou ADMIN_PASSWORD vazio: administrador inicial não foi criado.',
      );
      return;
    }
    const existing = await this.findByEmail(email);
    if (existing) {
      return;
    }
    await this.create({ name: 'Administrador', email, password, role: Role.Admin });
    this.logger.log('Administrador inicial criado.');
  }
}
