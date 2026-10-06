import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { Repository } from 'typeorm';
import { configureApp } from '../src/app.setup';
import { AuthModule } from '../src/auth/auth.module';
import {
  GoogleIdentity,
  GoogleTokenVerifier,
} from '../src/auth/google-token-verifier';
import { Role, User } from '../src/users/entities/user.entity';
import { UsersModule } from '../src/users/users.module';

// Verificador falso: nunca chama a rede do Google.
class FakeGoogleTokenVerifier extends GoogleTokenVerifier {
  identidades = new Map<string, GoogleIdentity>();

  verify(credential: string): Promise<GoogleIdentity> {
    const identidade = this.identidades.get(credential);
    if (!identidade) {
      return Promise.reject(
        new UnauthorizedException('Credencial do Google inválida.'),
      );
    }
    return Promise.resolve(identidade);
  }
}

describe('Login com Google', () => {
  let app: INestApplication;
  let repo: Repository<User>;
  const verificador = new FakeGoogleTokenVerifier();
  const sufixo = `${Date.now()}-${process.pid}`;
  const emails: string[] = [];
  const clientIdOriginal = process.env.GOOGLE_CLIENT_ID;
  const clientIdTeste = 'teste-123.apps.googleusercontent.com';

  const novoEmail = (nome: string) => {
    const e = `e2e-google-${nome}-${sufixo}@teste.com`;
    emails.push(e);
    return e;
  };

  // Registra uma identidade falsa e devolve a credencial que a representa.
  const credencial = (
    nome: string,
    identidade: Partial<GoogleIdentity> & { email: string },
  ) => {
    const token = `cred-${nome}-${sufixo}`;
    verificador.identidades.set(token, {
      sub: `sub-${nome}-${sufixo}`,
      emailVerified: true,
      name: `Pessoa ${nome}`,
      ...identidade,
    });
    return token;
  };

  const entrarComGoogle = (corpo: Record<string, unknown>) =>
    request(app.getHttpServer()).post('/api/auth/google').send(corpo);

  beforeAll(async () => {
    process.env.GOOGLE_CLIENT_ID = clientIdTeste;
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
    })
      .overrideProvider(GoogleTokenVerifier)
      .useValue(verificador)
      .compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    repo = app.get<Repository<User>>(getRepositoryToken(User));
  });

  afterAll(async () => {
    for (const e of emails) {
      await repo.delete({ email: e });
    }
    await app.close();
    if (clientIdOriginal === undefined) {
      delete process.env.GOOGLE_CLIENT_ID;
    } else {
      process.env.GOOGLE_CLIENT_ID = clientIdOriginal;
    }
  });

  it('conta nova: 200, papel user, sem senha e sem passwordHash/googleId na resposta', async () => {
    const email = novoEmail('nova');
    const token = credencial('nova', { email: email.toUpperCase() });
    const res = await entrarComGoogle({ credential: token });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.user).toEqual({
      id: expect.any(String),
      name: 'Pessoa nova',
      email,
      role: 'user',
      active: true,
    });
    const texto = JSON.stringify(res.body);
    expect(texto).not.toContain('passwordHash');
    expect(texto).not.toContain('googleId');
    expect(texto).not.toContain(`sub-nova-${sufixo}`);

    const gravado = await repo.findOneByOrFail({ email });
    expect(gravado.passwordHash).toBeNull();
    expect(gravado.googleId).toBe(`sub-nova-${sufixo}`);
    expect(gravado.role).toBe(Role.User);
  });

  it('segunda chamada com o mesmo googleId entra na mesma conta, sem duplicar', async () => {
    const email = novoEmail('repetida');
    const token = credencial('repetida', { email });
    const primeira = await entrarComGoogle({ credential: token });
    const segunda = await entrarComGoogle({ credential: token });
    expect(primeira.status).toBe(200);
    expect(segunda.status).toBe(200);
    expect(segunda.body.user.id).toBe(primeira.body.user.id);
    expect(await repo.countBy({ email })).toBe(1);
  });

  it('nome vazio no Google usa a parte local do e-mail', async () => {
    const email = novoEmail('semnome');
    const token = credencial('semnome', { email, name: '   ' });
    const res = await entrarComGoogle({ credential: token });
    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe(email.split('@')[0]);
  });

  it('nome muito longo do Google é truncado em 100 caracteres', async () => {
    const email = novoEmail('longo');
    const token = credencial('longo', { email, name: 'A'.repeat(150) });
    const res = await entrarComGoogle({ credential: token });
    expect(res.status).toBe(200);
    expect(res.body.user.name).toHaveLength(100);
  });

  it('e-mail já cadastrado por senha é vinculado à conta existente', async () => {
    const email = novoEmail('vinculo');
    const cadastro = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ name: 'Existente', email, password: 'senha-de-teste-123' });
    expect(cadastro.status).toBe(201);

    const token = credencial('vinculo', { email });
    const res = await entrarComGoogle({ credential: token });
    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(cadastro.body.user.id);
    expect(res.body.user.role).toBe('user');
    expect(res.body.user.name).toBe('Existente');
    expect(await repo.countBy({ email })).toBe(1);
    const gravado = await repo.findOneByOrFail({ email });
    expect(gravado.googleId).toBe(`sub-vinculo-${sufixo}`);
    expect(gravado.passwordHash).not.toBeNull();

    // A senha continua funcionando depois do vínculo.
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: 'senha-de-teste-123' });
    expect(login.status).toBe(200);
  });

  it('o papel nunca vem do cliente: corpo com role é recusado e conta admin existente continua admin', async () => {
    const comRole = await entrarComGoogle({
      credential: 'qualquer',
      role: 'admin',
    });
    expect(comRole.status).toBe(400);

    const email = novoEmail('admin');
    const cadastro = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ name: 'Admin de teste', email, password: 'senha-de-teste-123' });
    await repo.update({ email }, { role: Role.Admin });

    const token = credencial('admin', { email });
    const res = await entrarComGoogle({ credential: token });
    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(cadastro.body.user.id);
    expect(res.body.user.role).toBe('admin');

    // Conta nova pelo Google nunca nasce admin.
    const nova = novoEmail('naoadmin');
    const resNova = await entrarComGoogle({
      credential: credencial('naoadmin', { email: nova }),
    });
    expect(resNova.body.user.role).toBe('user');
  });

  it('e-mail não verificado retorna 401 e não cria nem vincula', async () => {
    const email = novoEmail('naoverificado');
    const token = credencial('naoverificado', { email, emailVerified: false });
    const res = await entrarComGoogle({ credential: token });
    expect(res.status).toBe(401);
    expect(await repo.findOneBy({ email })).toBeNull();

    const existente = novoEmail('naoverificado-existente');
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ name: 'X', email: existente, password: 'senha-de-teste-123' });
    const token2 = credencial('naoverificado2', {
      email: existente,
      emailVerified: false,
    });
    const res2 = await entrarComGoogle({ credential: token2 });
    expect(res2.status).toBe(401);
    expect((await repo.findOneByOrFail({ email: existente })).googleId).toBeNull();
  });

  it('token inválido retorna 401', async () => {
    const res = await entrarComGoogle({ credential: 'token-que-nao-existe' });
    expect(res.status).toBe(401);
  });

  it('conta desativada retorna 401 com a mesma mensagem de credenciais inválidas', async () => {
    const errada = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: novoEmail('inexistente'), password: 'senha-errada-999' });

    const email = novoEmail('desativada');
    const token = credencial('desativada', { email });
    const primeira = await entrarComGoogle({ credential: token });
    expect(primeira.status).toBe(200);
    await repo.update({ email }, { active: false });

    const res = await entrarComGoogle({ credential: token });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe(errada.body.message);
  });

  it('conta vinculada a outro googleId retorna 401', async () => {
    const email = novoEmail('outroid');
    const primeira = await entrarComGoogle({
      credential: credencial('outroid', { email }),
    });
    expect(primeira.status).toBe(200);

    const token = credencial('outroid-b', {
      email,
      sub: `sub-diferente-${sufixo}`,
    });
    const res = await entrarComGoogle({ credential: token });
    expect(res.status).toBe(401);
    expect((await repo.findOneByOrFail({ email })).googleId).toBe(
      `sub-outroid-${sufixo}`,
    );
  });

  it('login por senha de conta só do Google retorna 401 com a mesma mensagem', async () => {
    const errada = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: novoEmail('naoexiste'), password: 'senha-errada-999' });

    const email = novoEmail('sosgoogle');
    await entrarComGoogle({ credential: credencial('sosgoogle', { email }) });
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: 'qualquer-senha-123' });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe(errada.body.message);
  });

  it('corpo com campo extra, vazio ou sem credential retorna 400', async () => {
    expect(
      (await entrarComGoogle({ credential: 'x', extra: 1 })).status,
    ).toBe(400);
    expect((await entrarComGoogle({ credential: '' })).status).toBe(400);
    expect((await entrarComGoogle({})).status).toBe(400);
    expect((await entrarComGoogle({ credential: 123 })).status).toBe(400);
  });

  it('GET /api/auth/google retorna o clientId quando configurado', async () => {
    const res = await request(app.getHttpServer()).get('/api/auth/google');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ clientId: clientIdTeste });
  });

  it('sem GOOGLE_CLIENT_ID: GET retorna 404 e POST retorna 401', async () => {
    const antes = process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_ID;
    try {
      const get = await request(app.getHttpServer()).get('/api/auth/google');
      expect(get.status).toBe(404);
      const post = await entrarComGoogle({ credential: 'qualquer' });
      expect(post.status).toBe(401);
    } finally {
      process.env.GOOGLE_CLIENT_ID = antes;
    }
  });
});
