import { NextRequest, NextResponse } from "next/server";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import { QdrantVectorStore } from "@langchain/qdrant";
import { WebPDFLoader } from "@langchain/community/document_loaders/web/pdf";
import { Document } from "@langchain/core/documents";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    let docsToSplit: Document[] = [];

    // Parse PDF or Text using LangChain Document Loaders
    if (file.type === "application/pdf") {
      // WebPDFLoader is fully compatible with Edge/Next.js (no fs/worker issues)
      const loader = new WebPDFLoader(new Blob([await file.arrayBuffer()]));
      docsToSplit = await loader.load();
    } else if (file.type === "text/plain") {
      const buffer = await file.arrayBuffer();
      const text = Buffer.from(buffer).toString("utf-8");
      docsToSplit = [new Document({ pageContent: text, metadata: { source: file.name } })];
    } else {
      return NextResponse.json(
        { error: "Unsupported file type. Please upload a PDF or TXT file." },
        { status: 400 }
      );
    }

    if (docsToSplit.length === 0) {
      return NextResponse.json({ error: "No text found in the file" }, { status: 400 });
    }

    // --- CHUNKING STRATEGY ---
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const docs = await textSplitter.splitDocuments(docsToSplit);

    // Ensure we have API keys
    if (!process.env.HUGGINGFACEHUB_API_KEY || !process.env.QDRANT_URL || !process.env.QDRANT_API_KEY) {
      return NextResponse.json(
        { error: "Missing required API keys in environment variables (HuggingFace or Qdrant)" },
        { status: 500 }
      );
    }

    // Create Embeddings using HuggingFace
    const embeddings = new HuggingFaceInferenceEmbeddings({
      model: "sentence-transformers/all-MiniLM-L6-v2",
    });

    const collectionName = "notebooklm-rag";

    // Initialize Vector Store
    await QdrantVectorStore.fromDocuments(docs, embeddings, {
      url: process.env.QDRANT_URL,
      apiKey: process.env.QDRANT_API_KEY,
      collectionName: collectionName,
    });

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${file.name} into ${docs.length} chunks.`,
      chunksCount: docs.length,
    });
  } catch (error: any) {
    console.error("Error in upload route:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
