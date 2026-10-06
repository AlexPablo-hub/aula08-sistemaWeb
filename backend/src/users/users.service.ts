import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
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
