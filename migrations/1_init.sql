-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Document collections table
CREATE TABLE IF NOT EXISTS document_collection (
    collection_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    source_type VARCHAR(20) DEFAULT 'mixed' CHECK (source_type IN ('text', 'audio', 'video', 'website', 'mixed')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Document embeddings table with vector column
CREATE TABLE IF NOT EXISTS document_embedding (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    collection_id UUID REFERENCES document_collection(collection_id) ON DELETE CASCADE,
    embedding vector(384),
    document TEXT NOT NULL,
    source_type VARCHAR(20) CHECK (source_type IN ('text', 'audio', 'video', 'website')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- HNSW index for fast similarity search
CREATE INDEX IF NOT EXISTS idx_embedding_hnsw
ON document_embedding
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Index on collection_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_embedding_collection
ON document_embedding (collection_id);
