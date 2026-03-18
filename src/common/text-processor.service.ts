import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';

export interface TextChunk {
  text: string;
  index: number;
  metadata: Record<string, any>;
}

@Injectable()
export class TextProcessorService {
  private readonly logger = new Logger(TextProcessorService.name);

  async extractText(
    filePath: string,
    mimeType: string,
  ): Promise<string> {
    if (mimeType === 'application/pdf') {
      return this.extractPdfText(filePath);
    }

    if (
      mimeType === 'text/plain' ||
      mimeType === 'text/markdown' ||
      mimeType === 'application/octet-stream'
    ) {
      return fs.readFileSync(filePath, 'utf-8');
    }

    throw new Error(`Unsupported text file type: ${mimeType}`);
  }

  private async extractPdfText(filePath: string): Promise<string> {
    const { PDFParse } = await import('pdf-parse');
    const data = fs.readFileSync(filePath);
    const parser = new PDFParse({ data: new Uint8Array(data) });
    const result = await parser.getText();
    this.logger.log(
      `Extracted ${result.total} pages from PDF: ${filePath}`,
    );
    await parser.destroy();
    return result.text;
  }

  chunkText(
    text: string,
    options: {
      chunkSize?: number;
      chunkOverlap?: number;
      source?: string;
      sourceType?: string;
    } = {},
  ): TextChunk[] {
    const {
      chunkSize = 500,
      chunkOverlap = 50,
      source = 'unknown',
      sourceType = 'text',
    } = options;

    if (!text || text.trim().length === 0) {
      return [];
    }

    const sentences = this.splitIntoSentences(text);
    const chunks: TextChunk[] = [];
    let currentChunk = '';
    let chunkIndex = 0;

    for (const sentence of sentences) {
      if (
        currentChunk.length + sentence.length > chunkSize &&
        currentChunk.length > 0
      ) {
        chunks.push({
          text: currentChunk.trim(),
          index: chunkIndex,
          metadata: {
            source,
            source_type: sourceType,
            chunk_index: chunkIndex,
            chunk_size: currentChunk.trim().length,
          },
        });
        chunkIndex++;

        // Keep overlap
        const words = currentChunk.split(' ');
        const overlapWords = words.slice(-Math.ceil(chunkOverlap / 5));
        currentChunk = overlapWords.join(' ') + ' ' + sentence;
      } else {
        currentChunk += (currentChunk ? ' ' : '') + sentence;
      }
    }

    if (currentChunk.trim().length > 0) {
      chunks.push({
        text: currentChunk.trim(),
        index: chunkIndex,
        metadata: {
          source,
          source_type: sourceType,
          chunk_index: chunkIndex,
          chunk_size: currentChunk.trim().length,
        },
      });
    }

    this.logger.log(
      `Split text into ${chunks.length} chunks (avg ${Math.round(text.length / Math.max(chunks.length, 1))} chars)`,
    );

    return chunks;
  }

  private splitIntoSentences(text: string): string[] {
    return text
      .replace(/([.!?])\s+/g, '$1|SPLIT|')
      .split('|SPLIT|')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
}
