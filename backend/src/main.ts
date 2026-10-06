import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { setupDocs } from './docs.setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  setupDocs(app);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
