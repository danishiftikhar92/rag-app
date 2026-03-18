import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentCollection, DocumentEmbedding } from './entities';
import { EmbeddingsService } from './embeddings.service';
import { LlmService } from './llm.service';
import { VectorStoreService } from './vectorstore.service';
import { MediaProcessorService } from './media-processor.service';
import { WebScraperService } from './web-scraper.service';
import { TextProcessorService } from './text-processor.service';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([DocumentCollection, DocumentEmbedding]),
  ],
  providers: [
    EmbeddingsService,
    LlmService,
    VectorStoreService,
    MediaProcessorService,
    WebScraperService,
    TextProcessorService,
  ],
  exports: [
    EmbeddingsService,
    LlmService,
    VectorStoreService,
    MediaProcessorService,
    WebScraperService,
    TextProcessorService,
    TypeOrmModule,
  ],
})
export class CommonModule {}
