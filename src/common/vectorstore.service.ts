import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { DocumentCollection, DocumentEmbedding } from './entities';
import { EmbeddingsService } from './embeddings.service';

export interface ChunkInput {
  text: string;
  sourceType: string;
  metadata: Record<string, any>;
}

export interface SearchResult {
  text: string;
  metadata: Record<string, any>;
  score: number;
}

@Injectable()
export class VectorStoreService {
  private readonly logger = new Logger(VectorStoreService.name);

  constructor(
    @InjectRepository(DocumentCollection)
    private readonly collectionRepo: Repository<DocumentCollection>,
    @InjectRepository(DocumentEmbedding)
    private readonly embeddingRepo: Repository<DocumentEmbedding>,
    private readonly embeddingsService: EmbeddingsService,
    private readonly dataSource: DataSource,
  ) {}

  async getOrCreateCollection(
    name: string,
    sourceType: string = 'mixed',
    metadata: Record<string, any> = {},
  ): Promise<DocumentCollection> {
    let collection = await this.collectionRepo.findOne({ where: { name } });

    if (!collection) {
      collection = this.collectionRepo.create({
        name,
        source_type: sourceType as any,
        metadata,
      });
      collection = await this.collectionRepo.save(collection);
      this.logger.log(`Created collection: ${name}`);
    }

    return collection;
  }

  async insertChunks(
    collectionName: string,
    chunks: ChunkInput[],
  ): Promise<number> {
    const collection = await this.getOrCreateCollection(
      collectionName,
      chunks[0]?.sourceType || 'mixed',
    );

    const texts = chunks.map((c) => c.text);
    const embeddings = await this.embeddingsService.embedBatch(texts);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (let i = 0; i < chunks.length; i++) {
        const vectorStr = `[${embeddings[i].join(',')}]`;
        await queryRunner.query(
          `INSERT INTO document_embedding (collection_id, embedding, document, source_type, metadata)
           VALUES ($1, $2::vector, $3, $4, $5)`,
          [
            collection.collection_id,
            vectorStr,
            chunks[i].text,
            chunks[i].sourceType,
            JSON.stringify({
              ...chunks[i].metadata,
              collection_name: collectionName,
            }),
          ],
        );
      }

      await queryRunner.commitTransaction();
      this.logger.log(
        `Inserted ${chunks.length} chunks into collection "${collectionName}"`,
      );
      return chunks.length;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to insert chunks: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async similaritySearch(
    query: string,
    topK: number = 5,
    collectionName?: string,
  ): Promise<SearchResult[]> {
    const queryEmbedding = await this.embeddingsService.embedText(query);
    const vectorStr = `[${queryEmbedding.join(',')}]`;

    let sql = `
      SELECT 
        de.document,
        de.source_type,
        de.metadata,
        1 - (de.embedding <=> $1::vector) as score
      FROM document_embedding de
    `;
    const params: any[] = [vectorStr];

    if (collectionName) {
      sql += `
        JOIN document_collection dc ON de.collection_id = dc.collection_id
        WHERE dc.name = $2
      `;
      params.push(collectionName);
    }

    sql += ` ORDER BY de.embedding <=> $1::vector LIMIT $${params.length + 1}`;
    params.push(topK);

    const results = await this.dataSource.query(sql, params);

    return results.map((row: any) => ({
      text: row.document,
      metadata: {
        ...row.metadata,
        source_type: row.source_type,
      },
      score: parseFloat(row.score),
    }));
  }

  async listCollections(): Promise<
    (DocumentCollection & { chunk_count: number })[]
  > {
    const results = await this.dataSource.query(`
      SELECT dc.*, COUNT(de.id) as chunk_count
      FROM document_collection dc
      LEFT JOIN document_embedding de ON dc.collection_id = de.collection_id
      GROUP BY dc.collection_id
      ORDER BY dc.created_at DESC
    `);

    return results.map((row: any) => ({
      ...row,
      chunk_count: parseInt(row.chunk_count, 10),
    }));
  }

  async clearAll(): Promise<void> {
    await this.embeddingRepo.delete({});
    await this.collectionRepo.delete({});
    this.logger.log('Cleared all collections and embeddings');
  }

  async deleteCollection(collectionId: string): Promise<void> {
    await this.collectionRepo.delete({ collection_id: collectionId });
    this.logger.log(`Deleted collection: ${collectionId}`);
  }

  async getStats(): Promise<{
    totalCollections: number;
    totalChunks: number;
    bySourceType: Record<string, number>;
  }> {
    const totalCollections = await this.collectionRepo.count();
    const totalChunks = await this.embeddingRepo.count();

    const byType = await this.dataSource.query(`
      SELECT source_type, COUNT(*) as count
      FROM document_embedding
      GROUP BY source_type
    `);

    const bySourceType: Record<string, number> = {};
    byType.forEach((row: any) => {
      bySourceType[row.source_type] = parseInt(row.count, 10);
    });

    return { totalCollections, totalChunks, bySourceType };
  }
}
