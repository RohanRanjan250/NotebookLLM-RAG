import { NextRequest, NextResponse } from "next/server";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import { QdrantVectorStore } from "@langchain/qdrant";
import { Document } from "@langchain/core/documents";
import { PDFParse } from "pdf-parse";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    let extractedText = "";

    // Parse PDF or Text manually
    if (file.type === "application/pdf") {
      const buffer = Buffer.from(await file.arrayBuffer());
      
      // Use the PDFParse class correctly
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      extractedText = result.text;
      
      // Clean up parser if necessary (though it's usually GC'd)
      await parser.destroy();
    } else if (file.type === "text/plain") {
      const buffer = await file.arrayBuffer();
      extractedText = Buffer.from(buffer).toString("utf-8");
    } else {
      return NextResponse.json(
        { error: "Unsupported file type. Please upload a PDF or TXT file." },
        { status: 400 }
      );
    }

    if (!extractedText || !extractedText.trim()) {
      return NextResponse.json({ error: "No text found in the file" }, { status: 400 });
    }

    const docsToSplit = [
      new Document({ 
        pageContent: extractedText, 
        metadata: { source: file.name } 
      })
    ];

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
