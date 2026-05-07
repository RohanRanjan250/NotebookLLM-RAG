# Google NotebookLM RAG Clone

This project is a Next.js application that implements a full Retrieval-Augmented Generation (RAG) pipeline, replicating the core functionality of Google NotebookLM. Users can upload a document (PDF or Text), have it chunked and indexed into a vector database, and then ask natural language questions to get grounded answers based strictly on the uploaded document.

## 🚀 Features
- **Full RAG Pipeline**: Ingestion -> Chunking -> Embedding -> Storage -> Retrieval -> Generation.
- **Serverless Ready**: Built with Next.js App Router, deployable on Vercel.
- **Vector Database**: Integrates with Qdrant Cloud for storing embeddings.
- **AI Models**: Uses `text-embedding-3-large` for embeddings and `gpt-4o-mini` for generation.
- **Beautiful UI**: Modern, responsive, dark-mode UI with clear visualization of retrieved chunks.

## 🧠 Chunking Strategy Documented

A core requirement of this assignment is a documented chunking strategy.

**Strategy Used: Recursive Character Text Splitting**
We use LangChain's `RecursiveCharacterTextSplitter`. 

**Why this strategy?**
Instead of blindly splitting text at a fixed character count (which might cut sentences or words in half), this strategy attempts to split text hierarchically using natural language boundaries:
1. Double newlines (paragraphs)
2. Single newlines (lines)
3. Spaces (words)
4. Individual characters (if all else fails)

**Parameters:**
- `chunkSize: 1000` - We create chunks of roughly 1000 characters. This is optimal for capturing a complete thought or paragraph, providing enough semantic context for the embeddings model to represent the concept accurately.
- `chunkOverlap: 200` - We maintain a 200-character overlap between adjacent chunks. This is crucial for avoiding the "cut-off context" problem where a concept begins at the end of chunk A and finishes at the beginning of chunk B.

*This strategy guarantees that context isn't lost at the borders of the chunks, leading to higher quality retrieval.*

## 🛠️ Setup & Local Deployment

### 1. Prerequisites
- Node.js (v18+)
- OpenAI API Key
- Qdrant Cloud URL and API Key (or a local Qdrant instance)

### 2. Environment Variables
Copy `.env.example` to `.env` and fill in your keys:
```env
OPENAI_API_KEY=your_openai_api_key_here
QDRANT_URL=your_qdrant_cloud_cluster_url
QDRANT_API_KEY=your_qdrant_api_key
```

### 3. Install & Run
```bash
npm install --legacy-peer-deps
npm run dev
```
Navigate to `http://localhost:3000`.

## 📦 Vercel Deployment

This project is fully ready to be deployed on Vercel:
1. Push your code to a public GitHub repository.
2. Import the repository in your Vercel Dashboard.
3. Add the three Environment Variables (`OPENAI_API_KEY`, `QDRANT_URL`, `QDRANT_API_KEY`) in the Vercel project settings.
4. Deploy!

---
*Built for Assignment 03 — Google NotebookLM RAG*
