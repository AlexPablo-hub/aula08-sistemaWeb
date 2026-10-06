import { INestApplication } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { Repository } from 'typeorm';
import { configureApp } from '../src/app.setup';
import { AuthModule } from '../src/auth/auth.module';
import { AudioStorage } from '../src/storage/audio-storage';
import { Transcription } from '../src/transcriptions/entities/transcription.entity';
import { TRANSCRIPTION_PROVIDER } from '../src/transcriptions/providers/transcription-provider';
import { TranscriptionsModule } from '../src/transcriptions/transcriptions.module';
import { User } from '../src/users/entities/user.entity';
import { UsersModule } from '../src/users/users.module';
import { FakeAudioStorage } from './fake-audio-storage';

describe('Transcrições: edição do título', () => {
  let app: INestApplication;
  let users: Repository<User>;
  let transcricoes: Repository<Transcription>;
  const sufixo = `${Date.now()}-${process.pid}`;
  const emailA = `e2e-titulo-a-${sufixo}@teste.com`;
  const emailB = `e2e-titulo-b-${sufixo}@teste.com`;
  let tokenA: string;
  let tokenB: string;
  let idA: string;
  let idB: string;

  // Nenhuma chamada de rede: provedor e armazenamento falsos.
  const storage = new FakeAudioStorage(true);
  const provedorFalso = {
    transcribe: (): Promise<string> => Promise.resolve('texto transcrito'),
  };

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
      .overrideProvider(TRANSCRIPTION_PROVIDER)
      .useValue(provedorFalso)
      .overrideProvider(AudioStorage)
      .useValue(storage)
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
    const a = await registrar('Titulo A', emailA);
    const b = await registrar('Titulo B', emailB);
    tokenA = a.token;
    idA = a.id;
    tokenB = b.token;
    idB = b.id;
  });

  afterAll(async () => {
    await transcricoes.delete({ userId: idA });
    await transcricoes.delete({ userId: idB });
    await users.delete({ email: emailA });
    await users.delete({ email: emailB });
    await app.close();
  });

  const http = () => request(app.getHttpServer());
  const enviar = (token = tokenA, nome = 'Original.MP3') =>
    http()
      .post('/api/transcriptions')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('bytes-do-audio'), {
        filename: nome,
        contentType: 'audio/mpeg',
      });
  const editar = (id: string, corpo?: object, token?: string) => {
    const req = http().patch(`/api/transcriptions/${id}`);
    if (token) req.set('Authorization', `Bearer ${token}`);
    return corpo === undefined ? req : req.send(corpo);
  };
  const ler = (id: string, token = tokenA) =>
    http()
      .get(`/api/transcriptions/${id}`)
      .set('Authorization', `Bearer ${token}`);

  it('o dono edita: 200, título novo e o resto inalterado; GET e listagem refletem', async () => {
    const criada = await enviar();
    expect(criada.body.title).toBe('Original.MP3');

    const res = await editar(criada.body.id, { title: 'Reunião de segunda' }, tokenA);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: criada.body.id,
      title: 'Reunião de segunda',
      fileName: 'Original.MP3',
      language: 'pt',
      text: 'texto transcrito',
      hasAudio: true,
      createdAt: criada.body.createdAt,
    });

    const um = await ler(criada.body.id);
    expect(um.body.title).toBe('Reunião de segunda');
    expect(um.body.fileName).toBe('Original.MP3');
    const lista = await http()
      .get('/api/transcriptions')
      .set('Authorization', `Bearer ${tokenA}`);
    const item = lista.body.find((t: { id: string }) => t.id === criada.body.id);
    expect(item.title).toBe('Reunião de segunda');

    const linha = await transcricoes.findOneByOrFail({ id: criada.body.id });
    expect(linha.title).toBe('Reunião de segunda');
    expect(linha.fileName).toBe('Original.MP3');
    expect(linha.text).toBe('texto transcrito');
    expect(linha.language).toBe('pt');
  });

  it('o título é aparado', async () => {
    const criada = await enviar();
    const res = await editar(criada.body.id, { title: '   Com espaços \n' }, tokenA);
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Com espaços');
    expect((await ler(criada.body.id)).body.title).toBe('Com espaços');
  });

  it('título em branco ou só com espaços retorna 400 e nada muda', async () => {
    const criada = await enviar();
    for (const title of ['', '    ', '\t\n']) {
      const res = await editar(criada.body.id, { title }, tokenA);
      expect(res.status).toBe(400);
    }
    expect((await ler(criada.body.id)).body.title).toBe('Original.MP3');
  });

  it('título ausente ou que não é texto retorna 400', async () => {
    const criada = await enviar();
    expect((await editar(criada.body.id, {}, tokenA)).status).toBe(400);
    expect((await editar(criada.body.id, { title: 123 }, tokenA)).status).toBe(400);
    expect((await editar(criada.body.id, { title: null }, tokenA)).status).toBe(400);
  });

  it('120 caracteres é aceito e 121 retorna 400', async () => {
    const criada = await enviar();
    const exato = 'a'.repeat(120);
    const ok = await editar(criada.body.id, { title: exato }, tokenA);
    expect(ok.status).toBe(200);
    expect(ok.body.title).toBe(exato);
    const longo = await editar(criada.body.id, { title: 'a'.repeat(121) }, tokenA);
    expect(longo.status).toBe(400);
    expect((await ler(criada.body.id)).body.title).toBe(exato);
  });

  it('campo extra (text, fileName, language, userId) retorna 400 e nada muda', async () => {
    const criada = await enviar();
    for (const extra of [
      { text: 'outro texto' },
      { fileName: 'outro.mp3' },
      { language: 'en' },
      { userId: idB },
    ]) {
      const res = await editar(criada.body.id, { title: 'Novo', ...extra }, tokenA);
      expect(res.status).toBe(400);
    }
    const depois = await ler(criada.body.id);
    expect(depois.body.title).toBe('Original.MP3');
    expect(depois.body.text).toBe('texto transcrito');
  });

  it('corpo vazio retorna 400', async () => {
    const criada = await enviar();
    expect((await editar(criada.body.id, {}, tokenA)).status).toBe(400);
    expect((await editar(criada.body.id, undefined, tokenA)).status).toBe(400);
  });

  it('outro usuário recebe 404 e o título original permanece', async () => {
    const criada = await enviar();
    const res = await editar(criada.body.id, { title: 'Invasor' }, tokenB);
    expect(res.status).toBe(404);
    expect((await ler(criada.body.id)).body.title).toBe('Original.MP3');
    const linha = await transcricoes.findOneByOrFail({ id: criada.body.id });
    expect(linha.title).toBeNull();
  });

  it('id inexistente e id malformado retornam 404', async () => {
    const inexistente = await editar(
      '00000000-0000-4000-8000-000000000000',
      { title: 'X' },
      tokenA,
    );
    expect(inexistente.status).toBe(404);
    const malformado = await editar('nao-e-uuid', { title: 'X' }, tokenA);
    expect(malformado.status).toBe(404);
    expect(malformado.body.message).toBe('Transcrição não encontrada.');
  });

  it('sem token retorna 401', async () => {
    const criada = await enviar();
    expect((await editar(criada.body.id, { title: 'X' })).status).toBe(401);
    expect((await ler(criada.body.id)).body.title).toBe('Original.MP3');
  });

  it('transcrição sem título salvo lista title igual ao fileName', async () => {
    const antiga = await transcricoes.save(
      transcricoes.create({
        userId: idB,
        fileName: 'WhatsApp Audio 2026-10-06 at 15.28.23.mp4',
        language: 'pt',
        text: 'antiga',
      }),
    );
    expect(antiga.title ?? null).toBeNull();
    const lista = await http()
      .get('/api/transcriptions')
      .set('Authorization', `Bearer ${tokenB}`);
    const item = lista.body.find((t: { id: string }) => t.id === antiga.id);
    expect(item.title).toBe('WhatsApp Audio 2026-10-06 at 15.28.23.mp4');
    expect(item.fileName).toBe(item.title);
  });

  it('a resposta nunca traz userId nem audioKey', async () => {
    const criada = await enviar();
    const res = await editar(criada.body.id, { title: 'Sem vazamento' }, tokenA);
    expect(JSON.stringify(res.body)).not.toMatch(
      /audioKey|audioMimeType|audioSize|userId|audio\//,
    );
  });

  it('o áudio continua baixável depois de editar o título', async () => {
    const criada = await enviar();
    await editar(criada.body.id, { title: 'Novo título' }, tokenA);
    const res = await http()
      .get(`/api/transcriptions/${criada.body.id}/audio`)
      .set('Authorization', `Bearer ${tokenA}`)
      .buffer(true)
      .parse((r, cb) => {
        const partes: Buffer[] = [];
        r.on('data', (p: Buffer) => partes.push(p));
        r.on('end', () => cb(null, Buffer.concat(partes)));
      });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('audio/mpeg');
    expect((res.body as Buffer).toString()).toBe('bytes-do-audio');
  });
});
