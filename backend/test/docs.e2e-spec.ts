import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { configureApp } from '../src/app.setup';
import { setupDocs } from '../src/docs.setup';
import { HealthModule } from '../src/health/health.module';

describe('GET /docs', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [HealthModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    setupDocs(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('sem credenciais retorna 401', async () => {
    const res = await request(app.getHttpServer()).get('/docs');
    expect(res.status).toBe(401);
    expect(res.headers['www-authenticate']).toContain('Basic');
  });

  it('com senha errada retorna 401', async () => {
    const res = await request(app.getHttpServer())
      .get('/docs-json')
      .auth('admin', 'errada');
    expect(res.status).toBe(401);
  });

  it('com admin/admin retorna 200 e lista a rota de saúde', async () => {
    const ui = await request(app.getHttpServer()).get('/docs').auth('admin', 'admin');
    expect(ui.status).toBe(200);
    const json = await request(app.getHttpServer())
      .get('/docs-json')
      .auth('admin', 'admin');
    expect(json.status).toBe(200);
    expect(Object.keys(json.body.paths)).toContain('/api/health');
  });

  it('a rota /api/health continua sem autenticação', async () => {
    const res = await request(app.getHttpServer()).get('/api/health');
    expect(res.status).toBe(200);
  });
});
