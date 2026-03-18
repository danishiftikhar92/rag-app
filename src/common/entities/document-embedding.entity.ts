import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { DocumentCollection } from './document-collection.entity';

@Entity('document_embedding')
export class DocumentEmbedding {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  collection_id: string;

  @Column({ type: 'text' })
  document: string;

  @Column({ type: 'varchar' })
  source_type: string;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => DocumentCollection, (col) => col.embeddings, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'collection_id' })
  collection: DocumentCollection;
}
