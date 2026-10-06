import { BadGatewayException, INestApplication } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { Repository } from 'typeorm';
import { configureApp } from '../src/app.setup';
import { AuthModule } from '../src/auth/auth.module';
import {
  TRANSCRIPTION_PROVIDER,
  TranscribeInput,
} from '../src/transcriptions/providers/transcription-provider';
import { Transcription } from '../src/transcriptions/entities/transcription.entity';
import { AudioStorage } from '../src/storage/audio-storage';
import { TranscriptionsModule } from '../src/transcriptions/transcriptions.module';
import { User } from '../src/users/entities/user.entity';
import { UsersModule } from '../src/users/users.module';
import { FakeAudioStorage } from './fake-audio-storage';

describe('Transcrições: envio', () => {
  let app: INestApplication;
  let users: Repository<User>;
  let transcricoes: Repository<Transcription>;
  const sufixo = `${Date.now()}-${process.pid}`;
  const email = `e2e-transc-${sufixo}@teste.com`;
  let token: string;
  let userId: string;

  // Provedor falso: nenhuma chamada de rede nos testes.
  const chamadas: TranscribeInput[] = [];
  let falhar = false;
  const provedorFalso = {
    transcribe: (input: TranscribeInput): Promise<string> => {
      chamadas.push(input);
      if (falhar) {
        return Promise.reject(
          new BadGatewayException('O serviço de transcrição está indisponível.'),
        );
      }
      return Promise.resolve('texto transcrito de teste');
    },
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
      // Armazenamento desligado: nenhuma chamada ao MinIO real.
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

    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ name: 'Transc', email, password: 'senha-de-teste-123' });
    token = res.body.accessToken;
    userId = res.body.user.id;
  });

  afterAll(async () => {
    await transcricoes.delete({ userId });
    await users.delete({ email });
    await app.close();
  });

  beforeEach(() => {
    chamadas.length = 0;
    falhar = false;
  });

  const enviar = () =>
    request(app.getHttpServer())
      .post('/api/transcriptions')
      .set('Authorization', `Bearer ${token}`);

  const contar = () => transcricoes.count({ where: { userId } });

  it('envio válido retorna 201 com text e grava com o userId do token', async () => {
    const antes = await contar();
    const res = await enviar()
      .field('language', 'en')
      .attach('file', Buffer.from('audio-falso'), {
        filename: 'fala.mp3',
        contentType: 'audio/mpeg',
      });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      id: expect.any(String),
      fileName: 'fala.mp3',
      language: 'en',
      text: 'texto transcrito de teste',
      hasAudio: false,
      createdAt: expect.any(String),
    });
    expect(res.body.userId).toBeUndefined();
    expect(chamadas[0].language).toBe('en');

    expect(await contar()).toBe(antes + 1);
    const linha = await transcricoes.findOneByOrFail({ id: res.body.id });
    expect(linha.userId).toBe(userId);
    expect(linha.text).not.toBe('');
  });

  it('idioma omitido usa pt', async () => {
    const res = await enviar().attach('file', Buffer.from('x'), {
      filename: 'a.wav',
      contentType: 'audio/wav',
    });
    expect(res.status).toBe(201);
    expect(res.body.language).toBe('pt');
  });

  it('tipo não aceito retorna 400 e não chama o provedor', async () => {
    const antes = await contar();
    const res = await enviar().attach('file', Buffer.from('x'), {
      filename: 'documento.pdf',
      contentType: 'application/pdf',
    });
    expect(res.status).toBe(400);
    expect(chamadas).toHaveLength(0);
    expect(await contar()).toBe(antes);
  });

  it('extensão aceita com mimetype incompatível retorna 400', async () => {
    const res = await enviar().attach('file', Buffer.from('x'), {
      filename: 'falso.mp3',
      contentType: 'text/html',
    });
    expect(res.status).toBe(400);
  });

  it('arquivo ausente retorna 400', async () => {
    const res = await enviar().field('language', 'pt');
    expect(res.status).toBe(400);
  });

  it('idioma inválido retorna 400', async () => {
    for (const language of ['xx', 'PT', 'por', '']) {
      const res = await enviar()
        .field('language', language)
        .attach('file', Buffer.from('x'), {
          filename: 'a.mp3',
          contentType: 'audio/mpeg',
        });
      expect(res.status).toBe(400);
    }
    expect(chamadas).toHaveLength(0);
  });

  it('campo não declarado retorna 400', async () => {
    const res = await enviar()
      .field('role', 'admin')
      .attach('file', Buffer.from('x'), {
        filename: 'a.mp3',
        contentType: 'audio/mpeg',
      });
    expect(res.status).toBe(400);
  });

  it('arquivo acima de 25 MB retorna 413', async () => {
    const antes = await contar();
    const grande = Buffer.alloc(25 * 1024 * 1024 + 1024);
    const res = await enviar().attach('file', grande, {
      filename: 'grande.mp3',
      contentType: 'audio/mpeg',
    });
    expect(res.status).toBe(413);
    expect(res.body.statusCode).toBe(413);
    expect(chamadas).toHaveLength(0);
    expect(await contar()).toBe(antes);
  });

  it('falha do provedor retorna 502 e não grava nenhuma linha', async () => {
    falhar = true;
    const antes = await contar();
    const res = await enviar().attach('file', Buffer.from('x'), {
      filename: 'a.mp3',
      contentType: 'audio/mpeg',
    });
    expect(res.status).toBe(502);
    expect(await contar()).toBe(antes);
  });

  it('sem token retorna 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/transcriptions')
      .attach('file', Buffer.from('x'), {
        filename: 'a.mp3',
        contentType: 'audio/mpeg',
      });
    expect(res.status).toBe(401);
  });
});
