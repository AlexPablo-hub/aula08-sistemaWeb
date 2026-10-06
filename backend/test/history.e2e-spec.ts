import { INestApplication } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { Repository } from 'typeorm';
import { configureApp } from '../src/app.setup';
import { AuthModule } from '../src/auth/auth.module';
import { Transcription } from '../src/transcriptions/entities/transcription.entity';
import { TRANSCRIPTION_PROVIDER } from '../src/transcriptions/providers/transcription-provider';
import { AudioStorage } from '../src/storage/audio-storage';
import { TranscriptionsModule } from '../src/transcriptions/transcriptions.module';
import { User } from '../src/users/entities/user.entity';
import { UsersModule } from '../src/users/users.module';
import { FakeAudioStorage } from './fake-audio-storage';

describe('Transcrições: histórico e exclusão', () => {
  let app: INestApplication;
  let users: Repository<User>;
  let transcricoes: Repository<Transcription>;
  const sufixo = `${Date.now()}-${process.pid}`;
  const emailA = `e2e-hist-a-${sufixo}@teste.com`;
  const emailB = `e2e-hist-b-${sufixo}@teste.com`;
  let tokenA: string;
  let tokenB: string;
  let idUsuarioA: string;
  let idUsuarioB: string;
  // Ids do usuário A, da mais recente para a mais antiga.
  const idsA: string[] = [];
  let idDeB: string;

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
        TranscriptionsModule,
      ],
    })
      // Nenhuma chamada de rede: o provedor nunca é usado nestas rotas.
      .overrideProvider(TRANSCRIPTION_PROVIDER)
      .useValue({ transcribe: () => Promise.resolve('x') })
      // Nenhuma chamada ao MinIO real.
      .overrideProvider(AudioStorage)
      .useValue(new FakeAudioStorage(false))
      .compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    users = app.get<Repository<User>>(getRepositoryToken(User));
    transcricoes = app.get<Repository<Transcription>>(
      getRepositoryToken(Transcription),
    );

    const registrar = async (name: string, email: string) => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ name, email, password: 'senha-de-teste-123' });
      return {
        token: res.body.accessToken as string,
        id: res.body.user.id as string,
      };
    };
    const a = await registrar('Hist A', emailA);
    const b = await registrar('Hist B', emailB);
    tokenA = a.token;
    idUsuarioA = a.id;
    tokenB = b.token;
    idUsuarioB = b.id;

    // Inserção direta com createdAt distintos, fora da ordem cronológica.
    const criar = (userId: string, fileName: string, createdAt: Date) =>
      transcricoes.save(
        transcricoes.create({
          userId,
          fileName,
          language: 'pt',
          text: fileName,
          createdAt,
        }),
      );
    const meio = await criar(
      idUsuarioA,
      'meio.mp3',
      new Date('2026-01-02T00:00:00Z'),
    );
    const antigo = await criar(
      idUsuarioA,
      'antigo.mp3',
      new Date('2026-01-01T00:00:00Z'),
    );
    const recente = await criar(
      idUsuarioA,
      'recente.mp3',
      new Date('2026-01-03T00:00:00Z'),
    );
    idsA.push(recente.id, meio.id, antigo.id);
    idDeB = (
      await criar(idUsuarioB, 'de-b.mp3', new Date('2026-01-04T00:00:00Z'))
    ).id;
  });

  afterAll(async () => {
    await transcricoes.delete({ userId: idUsuarioA });
    await transcricoes.delete({ userId: idUsuarioB });
    await users.delete({ email: emailA });
    await users.delete({ email: emailB });
    await app.close();
  });

  const api = (metodo: 'get' | 'delete', url: string, token?: string) => {
    const req = request(app.getHttpServer())[metodo](url);
    return token ? req.set('Authorization', `Bearer ${token}`) : req;
  };

  it('listagem traz só as do usuário, da mais recente para a mais antiga', async () => {
    const res = await api('get', '/api/transcriptions', tokenA);
    expect(res.status).toBe(200);
    expect(res.body.map((t: { id: string }) => t.id)).toEqual(idsA);
    expect(res.body.map((t: { fileName: string }) => t.fileName)).toEqual([
      'recente.mp3',
      'meio.mp3',
      'antigo.mp3',
    ]);
    expect(res.body[0]).toEqual({
      id: expect.any(String),
      fileName: 'recente.mp3',
      language: 'pt',
      text: 'recente.mp3',
      hasAudio: false,
      createdAt: expect.any(String),
    });
  });

  it('listagem de B traz apenas a de B', async () => {
    const res = await api('get', '/api/transcriptions', tokenB);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe(idDeB);
  });

  it('GET :id devolve a transcrição do dono sem userId nem passwordHash', async () => {
    const res = await api('get', `/api/transcriptions/${idsA[0]}`, tokenA);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(idsA[0]);
    expect(JSON.stringify(res.body)).not.toMatch(/userId|passwordHash|audioKey/);
  });

  it('listagem não contém userId nem passwordHash', async () => {
    const res = await api('get', '/api/transcriptions', tokenA);
    expect(JSON.stringify(res.body)).not.toMatch(/userId|passwordHash/);
  });

  it('A pedindo transcrição de B recebe 404 no GET e no DELETE, e ela continua existindo', async () => {
    const get = await api('get', `/api/transcriptions/${idDeB}`, tokenA);
    expect(get.status).toBe(404);
    const del = await api('delete', `/api/transcriptions/${idDeB}`, tokenA);
    expect(del.status).toBe(404);
    expect(await transcricoes.existsBy({ id: idDeB })).toBe(true);
    const dono = await api('get', `/api/transcriptions/${idDeB}`, tokenB);
    expect(dono.status).toBe(200);
  });

  it('id inexistente retorna 404 no GET e no DELETE', async () => {
    const id = '00000000-0000-4000-8000-000000000000';
    const get = await api('get', `/api/transcriptions/${id}`, tokenA);
    const del = await api('delete', `/api/transcriptions/${id}`, tokenA);
    expect(get.status).toBe(404);
    expect(del.status).toBe(404);
  });

  it('id malformado retorna 404 no GET e no DELETE', async () => {
    const get = await api('get', '/api/transcriptions/nao-e-uuid', tokenA);
    expect(get.status).toBe(404);
    expect(get.body.message).toBe('Transcrição não encontrada.');
    const del = await api('delete', '/api/transcriptions/123', tokenA);
    expect(del.status).toBe(404);
  });

  it('sem token retorna 401 nas três rotas', async () => {
    const id = idsA[0];
    expect((await api('get', '/api/transcriptions')).status).toBe(401);
    expect((await api('get', `/api/transcriptions/${id}`)).status).toBe(401);
    expect((await api('delete', `/api/transcriptions/${id}`)).status).toBe(401);
    expect(await transcricoes.existsBy({ id })).toBe(true);
  });

  it('DELETE retorna 204 sem corpo e a leitura seguinte retorna 404', async () => {
    const alvo = idsA[2];
    const del = await api('delete', `/api/transcriptions/${alvo}`, tokenA);
    expect(del.status).toBe(204);
    expect(del.text).toBe('');
    const get = await api('get', `/api/transcriptions/${alvo}`, tokenA);
    expect(get.status).toBe(404);
    const de_novo = await api('delete', `/api/transcriptions/${alvo}`, tokenA);
    expect(de_novo.status).toBe(404);
    const lista = await api('get', '/api/transcriptions', tokenA);
    expect(lista.body).toHaveLength(2);
  });
});
