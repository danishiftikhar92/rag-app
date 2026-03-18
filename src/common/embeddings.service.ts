import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmbeddingsService implements OnModuleInit {
  private readonly logger = new Logger(EmbeddingsService.name);
  private embedder: any;
  private readonly modelName: string;

  constructor(private readonly config: ConfigService) {
    this.modelName =
      this.config.get<string>('EMBEDDING_MODEL') ||
      'Xenova/all-MiniLM-L6-v2';
  }

  async onModuleInit() {
    this.logger.log(`Loading embedding model: ${this.modelName}`);
    const { pipeline } = await import('@xenova/transformers');
    this.embedder = await pipeline('feature-extraction', this.modelName);
    this.logger.log('Embedding model loaded successfully');
  }

  async embedText(text: string): Promise<number[]> {
    const output = await this.embedder(text, {
      pooling: 'mean',
      normalize: true,
    });
    return Array.from(output.data as Float32Array);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];
    const batchSize = 32;

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((text) => this.embedText(text)),
      );
      results.push(...batchResults);
      this.logger.debug(
        `Embedded batch ${i / batchSize + 1}/${Math.ceil(texts.length / batchSize)}`,
      );
    }

    return results;
  }

  getDimension(): number {
    return 384;
  }
}
