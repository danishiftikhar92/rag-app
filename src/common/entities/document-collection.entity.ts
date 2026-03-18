import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { DocumentEmbedding } from './document-embedding.entity';

export type SourceType = 'text' | 'audio' | 'video' | 'website' | 'mixed';

@Entity('document_collection')
export class DocumentCollection {
  @PrimaryGeneratedColumn('uuid')
  collection_id: string;

  @Column({ unique: true })
  name: string;

  @Column({ type: 'varchar', default: 'mixed' })
  source_type: SourceType;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => DocumentEmbedding, (emb) => emb.collection)
  embeddings: DocumentEmbedding[];
}
