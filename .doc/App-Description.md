# 🧠 Multi-Modal RAG Agent (NestJS + EJS + PostgreSQL + Open Source Models)

## 🎯 Objective

A **production-ready, multi-modal RAG (Retrieval-Augmented Generation) application** using:

- **NestJS (Backend + API)**
- **EJS (Server-side UI)**
- **PostgreSQL + pgvector (Vector Database)**
- **LangChain.js (RAG Orchestration)**
- **Ollama (Open-source LLM)**
- **HuggingFace (Open-source embeddings)**
- **FFmpeg (Audio/Video processing)**
- **Docker Compose (Deployment)**

The system must allow users to **build a knowledge base from multiple data sources** and query it via a chat interface.

---

## 🧩 Core Capabilities

### 1. Multi-Modal Knowledge Base (RAG)

Users can ingest and build a knowledge base from:

- 📄 Documents: PDF, TXT, MD
- 🌐 Websites (URL scraping + parsing)
- 🎥 Videos (extract audio → transcribe → chunk)
- 🎧 Audio (transcription + chunking)

Each source must:
- Be processed into text
- Be chunked intelligently
- Be embedded into vectors
- Be stored in PostgreSQL (pgvector)

---

### 2. RAG Pipeline

Implement full pipeline:

1. **Ingestion Layer**
   - File upload (multi-file)
   - URL ingestion (website scraping)
   - Media processing (audio/video)

2. **Processing Layer**
   - Text extraction
   - Chunking strategy (semantic / token-based)
   - Metadata tagging (source, type, timestamp)

3. **Embedding Layer**
   - Use open-source embedding model
   - Store vectors in PostgreSQL (pgvector)

4. **Retrieval Layer**
   - Similarity search (cosine distance)
   - Top-K retrieval

5. **Generation Layer**
   - Use Ollama LLM
   - Context injection
   - Answer with sources

---

## 🛠️ Tech Stack (Strict)

| Component | Technology |
|----------|-----------|
| Backend | NestJS |
| UI | EJS |
| Database | PostgreSQL 17 + pgvector |
| LLM | Phi-3 Mini (via Ollama) |
| Embeddings | HuggingFace (open-source) |
| RAG Framework | LangChain.js |
| Media Processing | FFmpeg |
| Deployment | Docker Compose |

---

## 🗂️ Project Structure

```

multimodal-rag-agent/
├── src/
│   ├── rag/
│   │   ├── dto/
│   │   ├── rag.controller.ts
│   │   ├── rag.service.ts
│   │   └── rag.module.ts
│   ├── ui/
│   │   ├── ui.controller.ts
│   │   ├── ui.service.ts
│   │   └── ui.module.ts
│   ├── common/
│   │   ├── embeddings.service.ts
│   │   ├── llm.service.ts
│   │   ├── vectorstore.service.ts
│   │   ├── media-processor.service.ts
│   │   └── web-scraper.service.ts
│   ├── app.module.ts
│   └── main.ts
├── views/
├── public/
├── migrations/
├── docker-compose.yml
├── Dockerfile
├── .env.example
└── package.json

```

---

## 🗄️ Database Schema (PostgreSQL + pgvector)

- Use **pgvector extension**
- Use **HNSW index for fast similarity search**

### Tables

#### `document_collection`
- collection_id (UUID)
- name (unique)
- source_type (`text`, `audio`, `video`, `website`, `mixed`)
- metadata (JSONB)
- created_at

#### `document_embedding`
- id (UUID)
- collection_id (FK)
- embedding (VECTOR 4096)
- document (TEXT)
- source_type (`text`, `audio`, `video`, `website`)
- metadata (JSONB)
- created_at

---

## ⚙️ Core Services (Must Implement)

### 1. Embeddings Service
- Generate embeddings using HuggingFace model
- Support large batch processing

### 2. LLM Service
- Connect to Ollama
- Use Phi-3 Mini
- Accept prompt + context

### 3. Vector Store Service
- Insert embeddings
- Perform similarity search
- Filter by metadata

### 4. Media Processor Service
- Extract audio from video (FFmpeg)
- Convert formats
- Prepare for transcription

### 5. Web Scraper Service
- Fetch URL content
- Remove HTML noise
- Extract clean readable text

---

## 🌐 API Endpoints

### RAG API (`/api/rag`)

- `POST /ingest`
  - Upload files (text/audio/video)
- `POST /ingest/url`
  - Ingest website URL
- `POST /query`
  - Ask questions
- `GET /sources`
  - List ingested sources
- `DELETE /clear`
  - Clear knowledge base

---

## 🖥️ UI (EJS)

### Pages

1. **Dashboard**
   - Show recent sources
   - Show types (text/audio/video/website)
   - Clear data

2. **Upload Page**
   - Drag & drop files
   - Accept:
     - PDF / TXT
     - Audio
     - Video

3. **Website Ingestion**
   - Input URL field
   - Trigger ingestion

4. **Chat Page**
   - Ask questions
   - Show answers with sources

---

## 🔄 RAG Flow (Must Follow)

```

User Input → Retrieve Top-K Chunks → Inject Context → LLM → Response + Sources

```

---

## 🐳 Docker Requirements

- PostgreSQL (pgvector enabled)
- Ollama service
- NestJS app

Include:
- Health checks
- Volume persistence
- Auto migrations

---

## 🧪 Testing Flow

1. Start system with Docker
2. Upload:
   - PDF
   - Audio file
   - Video file
   - Website URL
3. Verify:
   - Chunks stored in DB
   - Embeddings created
4. Query system
5. Validate:
   - Relevant answers
   - Source attribution

---

## 🚀 Expected Outcome

A complete application where:

- Users upload **documents, audio, video, and websites**
- System builds a **vector-based knowledge base**
- Users query via chat
- System responds using **retrieved contextual knowledge**

---

# ✅ What Was Improved & Why

### 1. Added Website Ingestion
**Why:** Original version lacked structured URL ingestion  
**Improvement:** Introduced `web-scraper.service.ts` and `/ingest/url` endpoint

---

### 2. Enforced PostgreSQL + pgvector Only
**Why:** Requirement to standardize DB  
**Improvement:** Removed ambiguity and locked vector store to PostgreSQL

---

### 3. Strengthened Multi-Modal RAG Design
**Why:** Ensure all input types behave consistently  
**Improvement:** Unified pipeline for:
- PDF
- Text
- Audio
- Video
- Website

---

### 4. Clear Separation of Services
**Why:** Better maintainability and scalability  
**Improvement:** Introduced:
- Media processor
- Web scraper
- Vector store abstraction

---

### 5. Improved RAG Pipeline Definition
**Why:** Avoid weak implementations  
**Improvement:** Explicit step-by-step flow:
- Ingestion → Processing → Embedding → Retrieval → Generation

---

### 6. UI Enhancement Scope
**Why:** Original prompt UI lacked website ingestion  
**Improvement:** Added:
- URL input feature
- Clear source typing

---

### 7. Production Readiness
**Why:** Ensure deployable system  
**Improvement:**
- Docker health checks
- Structured environment config
- Clean architecture

---

### 8. Open-Source Only Constraint Enforced
**Why:** Cost & control requirement  
**Improvement:**
- Ollama (LLM)
- HuggingFace (Embeddings)
- No paid APIs
