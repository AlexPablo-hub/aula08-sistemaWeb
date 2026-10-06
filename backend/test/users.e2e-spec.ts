import { INestApplication } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../src/users/entities/user.entity';
import { UsersModule } from '../src/users/users.module';
import { UsersService } from '../src/users/users.service';

describe('Administrador inicial', () => {
  let app: INestApplication;
  let repo: Repository<User>;
  let adminEmail: string;
  let adminPassword: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRootAsync({
          inject: [ConfigService],
          useFactory: (config: ConfigService) => ({
            type: 'postgres',
            host: config.get<string>('DATABASE_HOST'),
            port: Number(config.get<string>('DATABASE_PORT')),
            username: config.get<string>('DATABASE_USER'),
            password: config.get<string>('DATABASE_PASSWORD'),
            database: config.get<string>('DATABASE_NAME'),
            autoLoadEntities: true,
            synchronize: true,
          }),
        }),
        UsersModule,
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    repo = app.get<Repository<User>>(getRepositoryToken(User));
    const config = app.get(ConfigService);
    adminEmail = config.get<string>('ADMIN_EMAIL')!.trim().toLowerCase();
    adminPassword = config.get<string>('ADMIN_PASSWORD')!;
  });

  afterAll(async () => {
    await app.close();
  });

  it('cria um único admin com o e-mail configurado', async () => {
    const admins = await repo.find({ where: { email: adminEmail } });
    expect(admins).toHaveLength(1);
    expect(admins[0].role).toBe('admin');
    expect(admins[0].active).toBe(true);
  });

  it('guarda hash bcrypt, não a senha', async () => {
    const admin = await repo.findOneByOrFail({ email: adminEmail });
    expect(admin.passwordHash.startsWith('$2')).toBe(true);
    expect(admin.passwordHash).not.toBe(adminPassword);
  });

  it('não duplica o admin ao rodar ensureInitialAdmin de novo', async () => {
    await app.get(UsersService).ensureInitialAdmin();
    const count = await repo.count({ where: { email: adminEmail } });
    expect(count).toBe(1);
  });
});
