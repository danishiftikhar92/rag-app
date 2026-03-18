# Multi-Modal RAG Agent

A production-ready, multi-modal Retrieval-Augmented Generation (RAG) application that lets you build a knowledge base from documents, audio, video, and websites, then query it conversationally with source attribution. Runs fully open-source with no paid API keys required.

## Tech Stack

| Component | Technology |
|---|---|
| Backend | NestJS 10 / Express 5 |
| UI | EJS (server-side rendering) |
| Database | PostgreSQL 17 + pgvector |
| ORM | TypeORM |
| LLM | Phi-3 Mini via Ollama (LangChain ChatOllama) |
| Embeddings | HuggingFace Xenova/all-MiniLM-L6-v2 (384-dim) |
| RAG Framework | LangChain.js |
| Media Processing | FFmpeg (fluent-ffmpeg) |
| Web Scraping | Axios + Cheerio |
| PDF Parsing | pdf-parse |
| Deployment | Docker + Docker Compose |

## Features

- **Multi-modal ingestion** — PDF, TXT, Markdown, audio (MP3, WAV, OGG, FLAC), video (MP4, WEBM, AVI, MKV), and websites
- **Intelligent chunking** — sentence-boundary splitting with configurable size (default 500 chars) and overlap (default 50 chars)
- **Local embeddings** — HuggingFace Xenova transformer model runs in-process, no external API calls; batch size of 32 for efficient processing
- **Vector search** — cosine similarity via pgvector HNSW index for fast approximate nearest-neighbor lookup
- **RAG pipeline** — top-K relevant chunks injected as context into the LLM prompt with source attribution in every response
- **Web scraping** — Cheerio-based HTML parsing that extracts main content from any public URL
- **Media processing** — FFmpeg extracts audio from video files for the transcription pipeline
- **Modern dark-themed UI** — dashboard with stats, drag-and-drop file upload, website URL ingestion, and chat interface with source citations
- **Collection support** — organize ingested sources into named collections for scoped queries
- **Dockerized deployment** — single `docker compose up` brings up PostgreSQL, Ollama, and the app with automatic model pull on first run
- **Fully open-source** — no paid APIs required; everything runs locally

## Quick Start (Docker)

```bash
# 1. Clone and enter the project
cd rag_app

# 2. Start all services
docker compose up -d --build

# 3. Wait for Ollama to pull the model (first run only, can take a few minutes)
docker compose logs -f ollama-pull

# 4. Open the app
open http://localhost:3000
```

This starts four containers:

| Container | Service | Host Port |
|---|---|---|
| `rag-postgres` | PostgreSQL 17 + pgvector | 5433 |
| `rag-ollama` | Ollama LLM server | 11435 |
| `rag-ollama-pull` | One-shot model pull (exits after download) | — |
| `rag-app` | NestJS application | 3000 |

### Convenience Scripts

| Script | Description |
|---|---|
| `npm run app` | `docker compose up -d --build` |
| `npm run app:stop` | `docker compose down` |
| `npm run app:logs` | Follow app container logs |

## Local Development

**Prerequisites:** Node.js 20+, PostgreSQL with pgvector extension, Ollama, FFmpeg.

```bash
# Install dependencies
npm install --legacy-peer-deps

# Copy and configure environment variables
cp .env.example .env
# Edit .env — set DB_HOST=localhost, OLLAMA_BASE_URL=http://localhost:11434

# Run database migrations
npm run migrate

# Start in dev mode (with hot reload)
npm run start:dev
```

### NPM Scripts

| Script | Description |
|---|---|
| `npm run build` | Compile TypeScript via Nest CLI |
| `npm run start` | Start the app |
| `npm run start:dev` | Start with file watching (hot reload) |
| `npm run start:debug` | Start with debugger attached |
| `npm run start:prod` | Start compiled production build |
| `npm run migrate` | Run SQL migrations against the database |
| `npm run lint` | Lint and auto-fix with ESLint |
| `npm run test` | Run unit tests with Jest |
| `npm run test:cov` | Run tests with coverage report |
| `npm run test:e2e` | Run end-to-end tests |

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DB_HOST` | `postgres` | PostgreSQL host (`localhost` for local dev) |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_USER` | `raguser` | PostgreSQL username |
| `DB_PASSWORD` | `ragpass` | PostgreSQL password |
| `DB_NAME` | `ragdb` | PostgreSQL database name |
| `OLLAMA_BASE_URL` | `http://ollama:11434` | Ollama API URL (`http://localhost:11434` for local dev) |
| `OLLAMA_MODEL` | `phi3:mini` | Ollama LLM model for generation |
| `EMBEDDING_MODEL` | `Xenova/all-MiniLM-L6-v2` | HuggingFace embedding model name |
| `PORT` | `3000` | Application listen port |
| `UPLOAD_DIR` | `./uploads` | Temporary directory for uploaded files |

## API Endpoints

| Method | Endpoint | Body / Params | Description |
|---|---|---|---|
| `POST` | `/api/rag/ingest` | Multipart: `files` (max 10, 100 MB each), optional `collectionName` | Upload and ingest files |
| `POST` | `/api/rag/ingest/url` | `{ url, collectionName? }` | Scrape and ingest a website URL |
| `POST` | `/api/rag/query` | `{ question, collectionName?, topK? }` | Query the knowledge base (default `topK: 5`) |
| `GET` | `/api/rag/sources` | — | List all ingested collections with chunk counts |
| `GET` | `/api/rag/stats` | — | Get knowledge base statistics (total collections, chunks, breakdown by source type) |
| `DELETE` | `/api/rag/clear` | — | Clear the entire knowledge base |

### Supported File Types

| Category | MIME Types |
|---|---|
| Documents | `application/pdf`, `text/plain`, `text/markdown` |
| Audio | `audio/mpeg`, `audio/mp3`, `audio/wav`, `audio/ogg`, `audio/flac` |
| Video | `video/mp4`, `video/webm`, `video/avi`, `video/mkv` |

## UI Pages

| URL | Page | Description |
|---|---|---|
| `/` | Dashboard | Knowledge base stats, source list, and clear button |
| `/upload` | Upload | Drag-and-drop multi-file upload with optional collection name |
| `/website` | Website | URL input for website ingestion with optional collection name |
| `/chat` | Chat | Conversational Q&A with source attribution |

## Architecture

```
Ingestion Flow:
  User Input → Text Extraction → Sentence Chunking → Embedding (384-dim) → pgvector Storage

Query Flow:
  User Query → Query Embedding → HNSW Similarity Search → Top-K Context Injection → LLM → Response + Sources
```

### Core Services

| Service | Responsibility |
|---|---|
| `EmbeddingsService` | Loads the HuggingFace Xenova model in-process, generates 384-dimensional vectors, supports batch embedding (batch size 32) |
| `LlmService` | Connects to Ollama, invokes Phi-3 Mini (temperature 0.3) with system + context prompt, returns answers with deduplicated source references |
| `VectorStoreService` | Manages pgvector storage and retrieval, HNSW-indexed cosine similarity search, collection-scoped queries |
| `TextProcessorService` | Extracts text from PDF (pdf-parse), TXT, and Markdown files; sentence-boundary chunking with configurable size and overlap |
| `MediaProcessorService` | Converts video to audio via FFmpeg, handles the audio transcription pipeline |
| `WebScraperService` | Fetches URLs with Axios, parses and extracts main content from HTML using Cheerio |

## Database Schema

**`document_collection`** — groups of ingested sources

| Column | Type | Description |
|---|---|---|
| `collection_id` | UUID | Primary key |
| `name` | varchar | Collection name |
| `source_type` | varchar | Source type (pdf, text, audio, video, website) |
| `metadata` | jsonb | Additional metadata |
| `created_at` | timestamp | Creation timestamp |

**`document_embedding`** — individual text chunks with vector embeddings

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `collection_id` | UUID | FK to `document_collection` |
| `embedding` | vector(384) | 384-dimensional embedding vector |
| `document` | text | Original text chunk |
| `source_type` | varchar | Source type |
| `metadata` | jsonb | Chunk metadata (source, index, size) |
| `created_at` | timestamp | Creation timestamp |

**Indexes:** HNSW on `embedding` (cosine distance), B-tree on `collection_id`.

## Project Structure

```
rag_app/
├── src/
│   ├── common/              # Shared services
│   │   ├── entities/        # TypeORM entities (document-collection, document-embedding)
│   │   ├── common.module.ts
│   │   ├── embeddings.service.ts
│   │   ├── llm.service.ts
│   │   ├── vectorstore.service.ts
│   │   ├── text-processor.service.ts
│   │   ├── media-processor.service.ts
│   │   └── web-scraper.service.ts
│   ├── rag/                 # RAG API module
│   │   ├── dto/             # Request validation DTOs
│   │   ├── rag.controller.ts
│   │   ├── rag.service.ts
│   │   └── rag.module.ts
│   ├── ui/                  # UI controller for server-rendered pages
│   │   ├── ui.controller.ts
│   │   ├── ui.service.ts
│   │   └── ui.module.ts
│   ├── app.module.ts
│   └── main.ts
├── views/                   # EJS templates
│   ├── partials/            # Shared header and footer
│   ├── dashboard.ejs
│   ├── upload.ejs
│   ├── website.ejs
│   └── chat.ejs
├── public/                  # Static assets
│   ├── css/styles.css
│   └── js/app.js
├── migrations/              # SQL migration files
│   └── 1_init.sql
├── scripts/                 # Migration runner
│   └── run-migrations.ts
├── docker-compose.yml       # Multi-service orchestration
├── Dockerfile               # Node 20, FFmpeg, build + migrate + run
├── .env.example             # Environment variable template
├── package.json
├── tsconfig.json
└── nest-cli.json
```

## License

UNLICENSED
