import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { CommonModule } from './common/common.module';
import { RagModule } from './rag/rag.module';
import { UiModule } from './ui/ui.module';
import { DocumentCollection, DocumentEmbedding } from './common/entities';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get('DB_USER', 'raguser'),
        password: config.get('DB_PASSWORD', 'ragpass'),
        database: config.get('DB_NAME', 'ragdb'),
        entities: [DocumentCollection, DocumentEmbedding],
        synchronize: false,
      }),
    }),

    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'public'),
      serveRoot: '/',
      serveStaticOptions: {
        index: false,
      },
    }),

    CommonModule,
    RagModule,
    UiModule,
  ],
})
export class AppModule {}
