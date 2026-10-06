import { INestApplication } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { In, Repository } from 'typeorm';
import { configureApp } from '../src/app.setup';
import { AuthModule } from '../src/auth/auth.module';
import { Role, User } from '../src/users/entities/user.entity';
import { UsersModule } from '../src/users/users.module';

describe('Administração de contas', () => {
  let app: INestApplication;
  let repo: Repository<User>;
  const sufixo = `${Date.now()}-${process.pid}`;
  const senha = 'senha-de-teste-123';
  const emailAdmin = `e2e-adm-admin-${sufixo}@teste.com`;
  const emailComum = `e2e-adm-comum-${sufixo}@teste.com`;
  const emailAlvo = `e2e-adm-alvo-${sufixo}@teste.com`;
  let tokenAdmin: string;
  let tokenComum: string;
  let tokenAlvo: string;
  let idAdmin: string;
  let idComum: string;
  let idAlvo: string;

  const http = () => request(app.getHttpServer());
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
  const login = (email: string) =>
    http().post('/api/auth/login').send({ email, password: senha });

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
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    repo = app.get<Repository<User>>(getRepositoryToken(User));

    const registrar = async (name: string, email: string) => {
      const res = await http()
        .post('/api/auth/register')
        .send({ name, email, password: senha });
      return {
        id: res.body.user.id as string,
        token: res.body.accessToken as string,
      };
    };
    const admin = await registrar('Adm Admin', emailAdmin);
    const comum = await registrar('Adm Comum', emailComum);
    const alvo = await registrar('Adm Alvo', emailAlvo);
    idAdmin = admin.id;
    idComum = comum.id;
    idAlvo = alvo.id;
    tokenComum = comum.token;
    tokenAlvo = alvo.token;
    // Promoção direta pelo repositório: o cadastro público nunca cria admin.
    await repo.update({ id: idAdmin }, { role: Role.Admin });
    tokenAdmin = admin.token;
  });

  afterAll(async () => {
    // Remove somente as contas deste teste; nunca toca no administrador inicial.
    await repo.delete({ id: In([idAdmin, idComum, idAlvo]) });
    await app.close();
  });

  it('GET sem token retorna 401', async () => {
    await http().get('/api/users').expect(401);
  });

  it('PATCH sem token retorna 401', async () => {
    await http()
      .patch(`/api/users/${idAlvo}`)
      .send({ name: 'X' })
      .expect(401);
  });

  it('usuário com papel user recebe 403 no GET', async () => {
    await http().get('/api/users').set(auth(tokenComum)).expect(403);
  });

  it('usuário com papel user recebe 403 no PATCH, sem alterar a conta', async () => {
    await http()
      .patch(`/api/users/${idAlvo}`)
      .set(auth(tokenComum))
      .send({ name: 'Invasor' })
      .expect(403);
    const alvo = await repo.findOneByOrFail({ id: idAlvo });
    expect(alvo.name).toBe('Adm Alvo');
  });

  it('administrador lista as contas sem passwordHash', async () => {
    const res = await http().get('/api/users').set(auth(tokenAdmin)).expect(200);
    const lista = res.body as Array<Record<string, unknown>>;
    const ids = lista.map((u) => u.id);
    expect(ids).toEqual(expect.arrayContaining([idAdmin, idComum, idAlvo]));
    for (const u of lista) {
      expect(Object.keys(u).sort()).toEqual(
        ['active', 'email', 'id', 'name', 'role'].sort(),
      );
    }
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
    expect(JSON.stringify(res.body)).not.toContain('$2');
  });

  it('PATCH altera name e role e retorna o usuário atualizado', async () => {
    const res = await http()
      .patch(`/api/users/${idComum}`)
      .set(auth(tokenAdmin))
      .send({ name: '  Novo Nome  ', role: 'admin' })
      .expect(200);
    expect(res.body).toEqual({
      id: idComum,
      name: 'Novo Nome',
      email: emailComum,
      role: 'admin',
      active: true,
    });
    // A mudança de papel vale na hora: o token antigo agora tem acesso de admin.
    await http().get('/api/users').set(auth(tokenComum)).expect(200);
    await http()
      .patch(`/api/users/${idComum}`)
      .set(auth(tokenAdmin))
      .send({ role: 'user' })
      .expect(200);
    await http().get('/api/users').set(auth(tokenComum)).expect(403);
  });

  it('administrador desativa outra conta e o login dela passa a retornar 401', async () => {
    await login(emailAlvo).expect(200);
    const res = await http()
      .patch(`/api/users/${idAlvo}`)
      .set(auth(tokenAdmin))
      .send({ active: false })
      .expect(200);
    expect(res.body.active).toBe(false);
    await login(emailAlvo).expect(401);
  });

  it('administrador tentando desativar a própria conta recebe 409 e ela continua ativa', async () => {
    await http()
      .patch(`/api/users/${idAdmin}`)
      .set(auth(tokenAdmin))
      .send({ active: false })
      .expect(409);
    const admin = await repo.findOneByOrFail({ id: idAdmin });
    expect(admin.active).toBe(true);
    await http().get('/api/users').set(auth(tokenAdmin)).expect(200);
  });

  it('campo não declarado retorna 400', async () => {
    for (const corpo of [
      { passwordHash: 'x' },
      { email: 'outro@teste.com' },
      { name: 'Ok', id: idAlvo },
    ]) {
      await http()
        .patch(`/api/users/${idAlvo}`)
        .set(auth(tokenAdmin))
        .send(corpo)
        .expect(400);
    }
  });

  it('valores inválidos retornam 400', async () => {
    for (const corpo of [
      { role: 'superuser' },
      { active: 'false' },
      { name: '' },
      { name: 'a'.repeat(101) },
      {},
    ]) {
      await http()
        .patch(`/api/users/${idAlvo}`)
        .set(auth(tokenAdmin))
        .send(corpo)
        .expect(400);
    }
  });

  it('id inexistente retorna 404', async () => {
    await http()
      .patch('/api/users/00000000-0000-4000-8000-000000000000')
      .set(auth(tokenAdmin))
      .send({ name: 'X' })
      .expect(404);
  });

  it('id malformado retorna 404', async () => {
    await http()
      .patch('/api/users/nao-e-uuid')
      .set(auth(tokenAdmin))
      .send({ name: 'X' })
      .expect(404);
  });

  it('token de conta desativada deixa de valer', async () => {
    // idAlvo foi desativado acima; o token emitido no cadastro não vale mais.
    await http().get('/api/users').set(auth(tokenAlvo)).expect(401);
  });
});
