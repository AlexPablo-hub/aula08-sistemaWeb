import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { timingSafeEqual } from 'crypto';
import { NextFunction, Request, Response } from 'express';

function iguais(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

// Autenticação Basic para a documentação. Não afeta as rotas de /api.
function basicAuth(usuario: string, senha: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const cabecalho = req.headers.authorization ?? '';
    if (cabecalho.startsWith('Basic ')) {
      const decodificado = Buffer.from(cabecalho.slice(6), 'base64').toString();
      const separador = decodificado.indexOf(':');
      const u = decodificado.slice(0, separador);
      const s = decodificado.slice(separador + 1);
      if (separador >= 0 && iguais(u, usuario) && iguais(s, senha)) {
        return next();
      }
    }
    res.setHeader('WWW-Authenticate', 'Basic realm="Documentação do Ditado"');
    res.status(401).send('Autenticação necessária.');
  };
}

// Documentação OpenAPI em /docs (UI) e /docs-json (especificação).
export function setupDocs(app: INestApplication): void {
  const usuario = process.env.DOCS_USER || 'admin';
  const senha = process.env.DOCS_PASSWORD || 'admin';
  app.use(['/docs', '/docs-json'], basicAuth(usuario, senha));

  const config = new DocumentBuilder()
    .setTitle('Ditado API')
    .setDescription('Transcrição de áudio. Rotas sob /api.')
    .setVersion('0.1')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, { jsonDocumentUrl: 'docs-json' });
}
