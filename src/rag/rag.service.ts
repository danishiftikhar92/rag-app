import { Injectable, Logger } from '@nestjs/common';
import { VectorStoreService, ChunkInput } from '../common/vectorstore.service';
import { TextProcessorService } from '../common/text-processor.service';
import { MediaProcessorService } from '../common/media-processor.service';
import { WebScraperService } from '../common/web-scraper.service';
import { LlmService } from '../common/llm.service';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);

  constructor(
    private readonly vectorStore: VectorStoreService,
    private readonly textProcessor: TextProcessorService,
    private readonly mediaProcessor: MediaProcessorService,
    private readonly webScraper: WebScraperService,
    private readonly llm: LlmService,
  ) {}

  async ingestFiles(
    files: Express.Multer.File[],
    collectionName?: string,
  ): Promise<{ message: string; totalChunks: number; files: string[] }> {
    let totalChunks = 0;
    const processedFiles: string[] = [];

    for (const file of files) {
      const name =
        collectionName ||
        `upload_${path.basename(file.originalname, path.extname(file.originalname))}`;

      try {
        let text: string;
        let sourceType: string;

        if (this.mediaProcessor.isMediaFile(file.mimetype)) {
          const result = await this.mediaProcessor.processMediaFile(
            file.path,
            file.mimetype,
          );
          text = result.text;
          sourceType = result.sourceType;
        } else {
          text = await this.textProcessor.extractText(file.path, file.mimetype);
          sourceType = 'text';
        }

        const chunks = this.textProcessor.chunkText(text, {
          source: file.originalname,
          sourceType,
        });

        const chunkInputs: ChunkInput[] = chunks.map((chunk) => ({
          text: chunk.text,
          sourceType,
          metadata: {
            ...chunk.metadata,
            originalFilename: file.originalname,
            mimeType: file.mimetype,
            fileSize: file.size,
          },
        }));

        const inserted = await this.vectorStore.insertChunks(name, chunkInputs);
        totalChunks += inserted;
        processedFiles.push(file.originalname);

        this.logger.log(
          `Ingested file "${file.originalname}": ${inserted} chunks`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to ingest file "${file.originalname}": ${error.message}`,
        );
        throw error;
      } finally {
        this.cleanupFile(file.path);
      }
    }

    return {
      message: `Successfully ingested ${processedFiles.length} file(s)`,
      totalChunks,
      files: processedFiles,
    };
  }

  async ingestUrl(
    url: string,
    collectionName?: string,
  ): Promise<{ message: string; totalChunks: number; title: string }> {
    const { text, title, metadata } = await this.webScraper.scrapeUrl(url);

    const name = collectionName || `web_${this.slugify(title)}`;

    const chunks = this.textProcessor.chunkText(text, {
      source: url,
      sourceType: 'website',
    });

    const chunkInputs: ChunkInput[] = chunks.map((chunk) => ({
      text: chunk.text,
      sourceType: 'website',
      metadata: {
        ...chunk.metadata,
        ...metadata,
      },
    }));

    const totalChunks = await this.vectorStore.insertChunks(name, chunkInputs);

    this.logger.log(`Ingested URL "${url}": ${totalChunks} chunks`);

    return {
      message: `Successfully ingested website: ${title}`,
      totalChunks,
      title,
    };
  }

  async query(
    question: string,
    collectionName?: string,
    topK: number = 5,
  ): Promise<{
    answer: string;
    sources: Record<string, any>[];
    chunksUsed: number;
  }> {
    const results = await this.vectorStore.similaritySearch(
      question,
      topK,
      collectionName,
    );

    if (results.length === 0) {
      return {
        answer:
          'I could not find any relevant information in the knowledge base to answer your question. Please try ingesting some documents first.',
        sources: [],
        chunksUsed: 0,
      };
    }

    const chunks = results.map((r) => ({
      text: r.text,
      metadata: r.metadata,
    }));

    const { answer, sources } = await this.llm.generateWithSources(
      question,
      chunks,
    );

    return {
      answer,
      sources,
      chunksUsed: results.length,
    };
  }

  async getSources() {
    return this.vectorStore.listCollections();
  }

  async getStats() {
    return this.vectorStore.getStats();
  }

  async deleteSource(collectionId: string) {
    await this.vectorStore.deleteCollection(collectionId);
    return { message: 'Source deleted successfully' };
  }

  async clearAll() {
    await this.vectorStore.clearAll();
    return { message: 'Knowledge base cleared successfully' };
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .substring(0, 50);
  }

  private cleanupFile(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch {
      this.logger.warn(`Could not cleanup: ${filePath}`);
    }
  }
}
