import { INestApplication } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { In, Repository } from 'typeorm';
import { configureApp } from '../src/app.setup';
import { AuthModule } from '../src/auth/auth.module';
import { AppSetting } from '../src/settings/entities/app-setting.entity';
import { SettingsModule } from '../src/settings/settings.module';
import { Transcription } from '../src/transcriptions/entities/transcription.entity';
import {
  TRANSCRIPTION_PROVIDER,
  TranscribeInput,
} from '../src/transcriptions/providers/transcription-provider';
import { criarProvedor } from '../src/transcriptions/providers/transcription-provider.factory';
import { AudioStorage } from '../src/storage/audio-storage';
import { TranscriptionsModule } from '../src/transcriptions/transcriptions.module';
import { Role, User } from '../src/users/entities/user.entity';
import { UsersModule } from '../src/users/users.module';
import { FakeAudioStorage } from './fake-audio-storage';

describe('Configuração de transcrição (painel do administrador)', () => {
  let app: INestApplication;
  let users: Repository<User>;
  let settings: Repository<AppSetting>;
  let transcricoes: Repository<Transcription>;
  const sufixo = `${Date.now()}-${process.pid}`;
  const senha = 'senha-de-teste-123';
  const emailAdmin = `e2e-set-admin-${sufixo}@teste.com`;
  const emailComum = `e2e-set-comum-${sufixo}@teste.com`;
  let tokenAdmin: string;
  let tokenComum: string;
  let idAdmin: string;
  let idComum: string;

  // Chaves de teste (valores falsos); o ambiente original é restaurado no fim.
  const ENV = ['GROQ_API_KEY', 'OPENROUTER_API_KEY'] as const;
  const envOriginal: Record<string, string | undefined> = {};
  // Linha de settings que existia antes do teste, restaurada no fim.
  let linhaOriginal: AppSetting | null;

  // Provedor falso: grava os argumentos recebidos. Em modo "real", delega ao
  // provedor de verdade, que sem chave responde 502 sem rede.
  const chamadas: TranscribeInput[] = [];
  let usarReal = false;
  let config: ConfigService;
  const provedorFalso = {
    transcribe: (input: TranscribeInput): Promise<string> => {
      chamadas.push(input);
      if (usarReal) {
        return criarProvedor(config).transcribe(input);
      }
      return Promise.resolve('texto transcrito de teste');
    },
  };

  const http = () => request(app.getHttpServer());
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
  const rota = '/api/settings/transcription';
  const enviar = () =>
    http()
      .post('/api/transcriptions')
      .set(auth(tokenAdmin))
      .attach('file', Buffer.from('audio-falso'), {
        filename: 'fala.wav',
        contentType: 'audio/wav',
      });
  const contar = () => transcricoes.count({ where: { userId: idAdmin } });

  beforeAll(async () => {
    for (const nome of ENV) envOriginal[nome] = process.env[nome];
    process.env.GROQ_API_KEY = 'gsk_chave-falsa-de-teste';
    process.env.OPENROUTER_API_KEY = '';

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRootAsync({
          inject: [ConfigService],
          useFactory: (c: ConfigService) => ({
            type: 'postgres',
            host: c.get<string>('DATABASE_HOST'),
            port: Number(c.get<string>('DATABASE_PORT')),
            username: c.get<string>('DATABASE_USER'),
            password: c.get<string>('DATABASE_PASSWORD'),
            database: c.get<string>('DATABASE_NAME'),
            autoLoadEntities: true,
            synchronize: true,
          }),
        }),
        UsersModule,
        AuthModule,
        SettingsModule,
        TranscriptionsModule,
      ],
    })
      .overrideProvider(TRANSCRIPTION_PROVIDER)
      .useValue(provedorFalso)
      // Nenhuma chamada ao MinIO real.
      .overrideProvider(AudioStorage)
      .useValue(new FakeAudioStorage(false))
      .compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    config = app.get(ConfigService);
    users = app.get<Repository<User>>(getRepositoryToken(User));
    settings = app.get<Repository<AppSetting>>(getRepositoryToken(AppSetting));
    transcricoes = app.get<Repository<Transcription>>(
      getRepositoryToken(Transcription),
    );

    linhaOriginal = await settings.findOneBy({ key: 'transcription' });
    await settings.delete({ key: 'transcription' });

    const registrar = async (name: string, email: string) => {
      const res = await http()
        .post('/api/auth/register')
        .send({ name, email, password: senha });
      return {
        id: res.body.user.id as string,
        token: res.body.accessToken as string,
      };
    };
    const admin = await registrar('Set Admin', emailAdmin);
    const comum = await registrar('Set Comum', emailComum);
    idAdmin = admin.id;
    idComum = comum.id;
    tokenAdmin = admin.token;
    tokenComum = comum.token;
    // Promoção direta pelo repositório: o cadastro público nunca cria admin.
    await users.update({ id: idAdmin }, { role: Role.Admin });
  });

  afterAll(async () => {
    await transcricoes.delete({ userId: In([idAdmin, idComum]) });
    // Remove somente as contas deste teste; nunca toca no administrador inicial.
    await users.delete({ id: In([idAdmin, idComum]) });
    await settings.delete({ key: 'transcription' });
    if (linhaOriginal) {
      await settings.save(linhaOriginal);
    }
    for (const nome of ENV) {
      if (envOriginal[nome] === undefined) delete process.env[nome];
      else process.env[nome] = envOriginal[nome];
    }
    await app.close();
  });

  beforeEach(() => {
    chamadas.length = 0;
    usarReal = false;
  });

  it('sem token retorna 401 no GET e no PATCH', async () => {
    await http().get(rota).expect(401);
    await http()
      .patch(rota)
      .send({ provider: 'groq', model: 'whisper-large-v3' })
      .expect(401);
  });

  it('usuário comum recebe 403 no GET e no PATCH', async () => {
    await http().get(rota).set(auth(tokenComum)).expect(403);
    await http()
      .patch(rota)
      .set(auth(tokenComum))
      .send({ provider: 'groq', model: 'whisper-large-v3' })
      .expect(403);
    expect(await settings.findOneBy({ key: 'transcription' })).toBeNull();
  });

  it('admin lê o padrão e as opções, sem expor chaves', async () => {
    const res = await http().get(rota).set(auth(tokenAdmin));
    expect(res.status).toBe(200);
    expect(res.body.provider).toBe('groq');
    expect(res.body.model).toBe('whisper-large-v3-turbo');
    expect(res.body.source).toBe('default');
    expect(res.body.options).toHaveLength(6);
    for (const o of res.body.options) {
      expect(Object.keys(o).sort()).toEqual([
        'available',
        'label',
        'model',
        'provider',
      ]);
      expect(o.available).toBe(o.provider === 'groq');
    }
    expect(res.body.options).toContainEqual({
      provider: 'openrouter',
      model: 'fish-audio/transcribe-1-pro',
      label: 'OpenRouter: Fish Audio Transcribe 1 Pro',
      available: false,
    });
    expect(JSON.stringify(res.body)).not.toContain('gsk_');
  });

  it('sem escolha salva: o envio usa groq e o modelo padrão', async () => {
    const res = await enviar();
    expect(res.status).toBe(201);
    expect(chamadas[0].provider).toBe('groq');
    expect(chamadas[0].model).toBe('whisper-large-v3-turbo');
  });

  it('combinação fora do catálogo retorna 400 e não salva', async () => {
    for (const corpo of [
      { provider: 'groq', model: 'openai/whisper-1' },
      { provider: 'openrouter', model: 'modelo-que-nao-existe' },
    ]) {
      await http().patch(rota).set(auth(tokenAdmin)).send(corpo).expect(400);
    }
    expect(await settings.findOneBy({ key: 'transcription' })).toBeNull();
  });

  it('provedor sem chave configurada retorna 400 e não salva', async () => {
    const res = await http()
      .patch(rota)
      .set(auth(tokenAdmin))
      .send({ provider: 'openrouter', model: 'fish-audio/transcribe-1-pro' });
    expect(res.status).toBe(400);
    expect(await settings.findOneBy({ key: 'transcription' })).toBeNull();
  });

  it('campo extra, campo ausente, provedor inválido e corpo vazio retornam 400', async () => {
    const corpos = [
      { provider: 'groq', model: 'whisper-large-v3', extra: 1 },
      { provider: 'groq' },
      { model: 'whisper-large-v3' },
      { provider: 'azure', model: 'whisper-large-v3' },
      {},
    ];
    for (const corpo of corpos) {
      await http().patch(rota).set(auth(tokenAdmin)).send(corpo).expect(400);
    }
    expect(await settings.findOneBy({ key: 'transcription' })).toBeNull();
  });

  it('PATCH válido salva e o GET seguinte reflete; o envio usa a escolha', async () => {
    const patch = await http()
      .patch(rota)
      .set(auth(tokenAdmin))
      .send({ provider: 'groq', model: 'whisper-large-v3' });
    expect(patch.status).toBe(200);
    expect(patch.body.provider).toBe('groq');
    expect(patch.body.model).toBe('whisper-large-v3');
    expect(patch.body.source).toBe('admin');
    expect(patch.body.options).toHaveLength(6);

    const get = await http().get(rota).set(auth(tokenAdmin));
    expect(get.body).toEqual(patch.body);

    const res = await enviar();
    expect(res.status).toBe(201);
    expect(chamadas[0].provider).toBe('groq');
    expect(chamadas[0].model).toBe('whisper-large-v3');

    const linha = await settings.findOneByOrFail({ key: 'transcription' });
    expect(JSON.parse(linha.value)).toEqual({
      provider: 'groq',
      model: 'whisper-large-v3',
    });
    expect(linha.value).not.toContain('gsk_');
  });

  it('com a chave do OpenRouter, escolhe o fish-audio e o envio o usa', async () => {
    process.env.OPENROUTER_API_KEY = 'sk-or-chave-falsa-de-teste';
    await http()
      .patch(rota)
      .set(auth(tokenAdmin))
      .send({ provider: 'openrouter', model: 'fish-audio/transcribe-1-pro' })
      .expect(200);
    const res = await enviar();
    expect(res.status).toBe(201);
    expect(chamadas[0].provider).toBe('openrouter');
    expect(chamadas[0].model).toBe('fish-audio/transcribe-1-pro');
  });

  it('escolha salva sem chave: GET mostra available false e o envio retorna 502 sem gravar', async () => {
    process.env.OPENROUTER_API_KEY = '';
    const get = await http().get(rota).set(auth(tokenAdmin));
    expect(get.status).toBe(200);
    expect(get.body.source).toBe('admin');
    expect(get.body.provider).toBe('openrouter');
    expect(get.body.options).toContainEqual({
      provider: 'openrouter',
      model: 'fish-audio/transcribe-1-pro',
      label: 'OpenRouter: Fish Audio Transcribe 1 Pro',
      available: false,
    });

    usarReal = true;
    const antes = await contar();
    const res = await enviar();
    expect(res.status).toBe(502);
    expect(res.body.message).toContain('não está configurado');
    expect(await contar()).toBe(antes);
  });
});
