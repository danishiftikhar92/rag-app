import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.setBaseViewsDir(join(process.cwd(), 'views'));
  app.setViewEngine('ejs');

  app.enableCors();

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`RAG Agent running at http://localhost:${port}`);
}
bootstrap();
