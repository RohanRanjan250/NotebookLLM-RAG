import { NextRequest, NextResponse } from "next/server";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import { QdrantVectorStore } from "@langchain/qdrant";
import { Document } from "@langchain/core/documents";
// import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs"; // Moved to dynamic import inside extractTextFromPDF

// Use the legacy build if possible for better Node support, 
// or set the worker to null to use the fake worker.
// pdfjs.GlobalWorkerOptions.workerSrc = false; // not needed in modern pdfjs-dist if we use it correctly

export const maxDuration = 60;

async function extractTextFromPDF(buffer: ArrayBuffer): Promise<string> {
  try {
    // Dynamic import to prevent top-level crashes
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    
    const data = new Uint8Array(buffer);
    // @ts-ignore
    const loadingTask = (pdfjs as any).getDocument({
      data,
      useSystemFonts: true,
      disableWorker: true, // Force fake worker in serverless
      verbosity: 0,
    });

    const pdf = await loadingTask.promise;
    let fullText = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => (item as any).str)
        .join(" ");
      fullText += pageText + "\n";
    }

    return fullText;
  } catch (error: any) {
    console.error("PDF Extraction Error:", error);
    throw new Error(`PDF Extraction failed: ${error.message || "Unknown error"}`);
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    let extractedText = "";

    if (file.type === "application/pdf") {
      const arrayBuffer = await file.arrayBuffer();
      extractedText = await extractTextFromPDF(arrayBuffer);
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

    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const docs = await textSplitter.splitDocuments(docsToSplit);

    if (!process.env.HUGGINGFACEHUB_API_KEY || !process.env.QDRANT_URL || !process.env.QDRANT_API_KEY) {
      return NextResponse.json(
        { error: "Missing required API keys in environment variables (HuggingFace or Qdrant)" },
        { status: 500 }
      );
    }

    const embeddings = new HuggingFaceInferenceEmbeddings({
      model: "sentence-transformers/all-MiniLM-L6-v2",
    });

    const collectionName = "notebooklm-rag";

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
