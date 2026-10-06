import { Controller, Get, INestApplication, UseGuards } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { Repository } from 'typeorm';
import { configureApp } from '../src/app.setup';
import { AuthModule } from '../src/auth/auth.module';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../src/common/decorators/current-user.decorator';
import { User } from '../src/users/entities/user.entity';
import { UsersModule } from '../src/users/users.module';

// Rota existente somente no teste, para provar o guarda JWT.
@Controller('teste-protegida')
class TesteProtegidaController {
  @Get()
  @UseGuards(JwtAuthGuard)
  quem(@CurrentUser() user: User) {
    return { id: user.id };
  }
}

describe('Autenticação', () => {
  let app: INestApplication;
  let repo: Repository<User>;
  const sufixo = `${Date.now()}-${process.pid}`;
  const email = `e2e-${sufixo}@teste.com`;
  const senha = 'senha-de-teste-123';
  const criados: string[] = [];

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
        AuthModule,
      ],
      controllers: [TesteProtegidaController],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    repo = app.get<Repository<User>>(getRepositoryToken(User));
  });

  afterAll(async () => {
    for (const e of criados) {
      await repo.delete({ email: e });
    }
    await app.close();
  });

  const cadastrar = (corpo: Record<string, unknown>) =>
    request(app.getHttpServer()).post('/api/auth/register').send(corpo);

  it('cadastro válido retorna 201 com user e accessToken, sem passwordHash', async () => {
    criados.push(email);
    const res = await cadastrar({
      name: 'Teste',
      email: email.toUpperCase(),
      password: senha,
    });
    expect(res.status).toBe(201);
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.user).toEqual({
      id: expect.any(String),
      name: 'Teste',
      email,
      role: 'user',
      active: true,
    });
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
  });

  it('e-mail repetido retorna 409', async () => {
    const res = await cadastrar({ name: 'Outro', email, password: senha });
    expect(res.status).toBe(409);
  });

  it('enviar role no cadastro retorna 400', async () => {
    const outro = `e2e-role-${sufixo}@teste.com`;
    criados.push(outro);
    const res = await cadastrar({
      name: 'X',
      email: outro,
      password: senha,
      role: 'admin',
    });
    expect(res.status).toBe(400);
    expect(await repo.findOneBy({ email: outro })).toBeNull();
  });

  it('login com senha errada retorna 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: 'senha-errada-999' });
    expect(res.status).toBe(401);
  });

  it('login correto retorna 200 com token que acessa rota protegida', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: senha });
    expect(login.status).toBe(200);
    const res = await request(app.getHttpServer())
      .get('/api/teste-protegida')
      .set('Authorization', `Bearer ${login.body.accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(login.body.user.id);
  });

  it('login de conta desativada retorna 401 com a mesma mensagem', async () => {
    const errada = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: 'senha-errada-999' });
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: senha });
    const token = login.body.accessToken;
    await repo.update({ email }, { active: false });

    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: senha });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe(errada.body.message);

    // Token já emitido deixa de valer para conta desativada.
    const protegida = await request(app.getHttpServer())
      .get('/api/teste-protegida')
      .set('Authorization', `Bearer ${token}`);
    expect(protegida.status).toBe(401);
  });

  it('rota protegida sem token retorna 401', async () => {
    const res = await request(app.getHttpServer()).get('/api/teste-protegida');
    expect(res.status).toBe(401);
  });
});
