import { BadGatewayException, INestApplication } from '@nestjs/common';
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

describe('Transcrições: áudio guardado', () => {
  let app: INestApplication;
  let users: Repository<User>;
  let transcricoes: Repository<Transcription>;
  const sufixo = `${Date.now()}-${process.pid}`;
  const emailA = `e2e-audio-a-${sufixo}@teste.com`;
  const emailB = `e2e-audio-b-${sufixo}@teste.com`;
  let tokenA: string;
  let tokenB: string;
  let idA: string;
  let idB: string;

  // Provedor de transcrição falso e armazenamento falso em memória.
  let falharProvedor = false;
  const provedorFalso = {
    transcribe: (): Promise<string> =>
      falharProvedor
        ? Promise.reject(
            new BadGatewayException('O serviço de transcrição está indisponível.'),
          )
        : Promise.resolve('texto transcrito de teste'),
  };
  const storage = new FakeAudioStorage(true);

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
    const a = await registrar('Audio A', emailA);
    const b = await registrar('Audio B', emailB);
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

  beforeEach(() => {
    falharProvedor = false;
    storage.configurado = true;
    storage.falharPut = false;
    storage.falharDelete = false;
    storage.apagados.length = 0;
  });

  const http = () => request(app.getHttpServer());
  const enviar = (
    conteudo: Buffer = Buffer.from('bytes-do-audio'),
    nome = 'Fala.MP3',
  ) =>
    http()
      .post('/api/transcriptions')
      .set('Authorization', `Bearer ${tokenA}`)
      .attach('file', conteudo, { filename: nome, contentType: 'audio/mpeg' });
  const audio = (id: string, token?: string) => {
    const req = http().get(`/api/transcriptions/${id}/audio`);
    return token ? req.set('Authorization', `Bearer ${token}`) : req;
  };
  const contar = () => transcricoes.count({ where: { userId: idA } });

  it('envio guarda o objeto com a chave padrão e hasAudio verdadeiro', async () => {
    const res = await enviar();
    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      id: expect.any(String),
      fileName: 'Fala.MP3',
      language: 'pt',
      text: 'texto transcrito de teste',
      hasAudio: true,
      createdAt: expect.any(String),
    });
    const chave = `audio/${idA}/${res.body.id}.mp3`;
    expect(storage.objetos.has(chave)).toBe(true);
    // O nome original nunca entra na chave do objeto.
    expect(chave).not.toMatch(/fala/i);

    const linha = await transcricoes.findOneByOrFail({ id: res.body.id });
    expect(linha.audioKey).toBe(chave);
    expect(linha.audioMimeType).toBe('audio/mpeg');
    expect(linha.audioSize).toBe(Buffer.from('bytes-do-audio').length);
  });

  it('resposta nunca traz audioKey nem userId (envio, leitura e listagem)', async () => {
    const criada = await enviar();
    const um = await http()
      .get(`/api/transcriptions/${criada.body.id}`)
      .set('Authorization', `Bearer ${tokenA}`);
    const lista = await http()
      .get('/api/transcriptions')
      .set('Authorization', `Bearer ${tokenA}`);
    for (const corpo of [criada.body, um.body, lista.body]) {
      expect(JSON.stringify(corpo)).not.toMatch(
        /audioKey|audioMimeType|audioSize|userId|audio\//,
      );
    }
    expect(um.body.hasAudio).toBe(true);
  });

  it('o dono baixa o áudio e os bytes e o Content-Type batem', async () => {
    const conteudo = Buffer.from([0, 1, 2, 3, 250, 251, 252, 253, 254, 255]);
    const criada = await enviar(conteudo);
    const res = await audio(criada.body.id, tokenA)
      .buffer(true)
      .parse((r, cb) => {
        const partes: Buffer[] = [];
        r.on('data', (p: Buffer) => partes.push(p));
        r.on('end', () => cb(null, Buffer.concat(partes)));
      });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('audio/mpeg');
    expect(Number(res.headers['content-length'])).toBe(conteudo.length);
    expect(res.headers['cache-control']).toBe('private, no-store');
    expect(res.headers['content-disposition']).toBe('inline');
    expect(Buffer.compare(res.body as Buffer, conteudo)).toBe(0);
  });

  it('outro usuário recebe 404 no áudio', async () => {
    const criada = await enviar();
    const res = await audio(criada.body.id, tokenB);
    expect(res.status).toBe(404);
  });

  it('sem token retorna 401 e id malformado ou inexistente retorna 404', async () => {
    const criada = await enviar();
    expect((await audio(criada.body.id)).status).toBe(401);
    expect((await audio('nao-e-uuid', tokenA)).status).toBe(404);
    expect(
      (await audio('00000000-0000-4000-8000-000000000000', tokenA)).status,
    ).toBe(404);
  });

  it('excluir apaga o objeto e a leitura seguinte do áudio retorna 404', async () => {
    const criada = await enviar();
    const chave = `audio/${idA}/${criada.body.id}.mp3`;
    expect(storage.objetos.has(chave)).toBe(true);
    const del = await http()
      .delete(`/api/transcriptions/${criada.body.id}`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(del.status).toBe(204);
    expect(storage.objetos.has(chave)).toBe(false);
    expect((await audio(criada.body.id, tokenA)).status).toBe(404);
  });

  it('falha ao apagar o objeto não impede a exclusão', async () => {
    const criada = await enviar();
    storage.falharDelete = true;
    const del = await http()
      .delete(`/api/transcriptions/${criada.body.id}`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(del.status).toBe(204);
    expect(await transcricoes.existsBy({ id: criada.body.id })).toBe(false);
    expect(storage.apagados).toContain(`audio/${idA}/${criada.body.id}.mp3`);
  });

  it('falha do armazenamento retorna 502 e não grava nenhuma linha', async () => {
    storage.falharPut = true;
    const antes = await contar();
    const objetosAntes = storage.objetos.size;
    const res = await enviar();
    expect(res.status).toBe(502);
    expect(res.body.statusCode).toBe(502);
    expect(await contar()).toBe(antes);
    expect(storage.objetos.size).toBe(objetosAntes);
  });

  it('falha do provedor de transcrição retorna 502 e nenhum objeto é criado', async () => {
    falharProvedor = true;
    const antes = await contar();
    const objetosAntes = storage.objetos.size;
    const res = await enviar();
    expect(res.status).toBe(502);
    expect(await contar()).toBe(antes);
    expect(storage.objetos.size).toBe(objetosAntes);
  });

  it('sem armazenamento configurado o envio funciona, hasAudio é falso e a rota de áudio retorna 404', async () => {
    storage.configurado = false;
    const objetosAntes = storage.objetos.size;
    const res = await enviar();
    expect(res.status).toBe(201);
    expect(res.body.hasAudio).toBe(false);
    expect(storage.objetos.size).toBe(objetosAntes);
    const linha = await transcricoes.findOneByOrFail({ id: res.body.id });
    expect(linha.audioKey).toBeNull();
    expect((await audio(res.body.id, tokenA)).status).toBe(404);
  });

  it('transcrição antiga, sem áudio, continua listável e sem áudio', async () => {
    const antiga = await transcricoes.save(
      transcricoes.create({
        userId: idA,
        fileName: 'antiga.mp3',
        language: 'pt',
        text: 'antiga',
        audioKey: null,
        audioMimeType: null,
        audioSize: null,
      }),
    );
    const lista = await http()
      .get('/api/transcriptions')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(lista.status).toBe(200);
    const item = lista.body.find((t: { id: string }) => t.id === antiga.id);
    expect(item.hasAudio).toBe(false);
    expect((await audio(antiga.id, tokenA)).status).toBe(404);
  });
});
