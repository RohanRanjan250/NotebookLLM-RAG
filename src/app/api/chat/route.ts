import { NextRequest, NextResponse } from "next/server";
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import { QdrantVectorStore } from "@langchain/qdrant";
import { ChatGroq } from "@langchain/groq";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();

    if (!query) {
      return NextResponse.json({ error: "Missing query" }, { status: 400 });
    }

    if (!process.env.GROQ_API_KEY || !process.env.HUGGINGFACEHUB_API_KEY || !process.env.QDRANT_URL || !process.env.QDRANT_API_KEY) {
      return NextResponse.json(
        { error: "Missing required API keys in environment variables (Groq, HuggingFace, or Qdrant)" },
        { status: 500 }
      );
    }

    // 1. Initialize Embeddings
    const embeddings = new HuggingFaceInferenceEmbeddings({
      model: "sentence-transformers/all-MiniLM-L6-v2",
    });

    const collectionName = "notebooklm-rag";

    // 2. Connect to existing Qdrant Vector Store
    const vectorStore = await QdrantVectorStore.fromExistingCollection(embeddings, {
      url: process.env.QDRANT_URL,
      apiKey: process.env.QDRANT_API_KEY,
      collectionName: collectionName,
    });

    // 3. Retrieve relevant chunks
    const retriever = vectorStore.asRetriever({
      k: 4, // retrieve top 4 most relevant chunks
    });

    const searchedChunks = await retriever.invoke(query);

    // If no chunks are found
    if (!searchedChunks || searchedChunks.length === 0) {
      return NextResponse.json({
        answer: "I couldn't find any relevant information in the uploaded document to answer your question.",
        chunks: [],
      });
    }

    // 4. Generate answer using Groq
    const llm = new ChatGroq({
      model: "llama-3.1-8b-instant",
      temperature: 0.2, // low temperature for more deterministic/grounded answers
    });

    // Prepare context from chunks
    const contextText = searchedChunks.map(chunk => chunk.pageContent).join("\n\n---\n\n");

    const systemPrompt = `You are a helpful AI Assistant (NotebookLM Clone) that answers user queries based strictly on the provided context from an uploaded document.

RULES:
- You must ONLY answer based on the available context.
- If the answer is not in the context, politely say that you cannot find the answer in the provided document.
- Do NOT use your general knowledge to answer.
- Keep your answers clear, concise, and structured.

CONTEXT:
${contextText}`;

    // Invoke ChatGroq
    const response = await llm.invoke([
      { role: "system", content: systemPrompt },
      { role: "user", content: query }
    ]);

    return NextResponse.json({
      answer: response.content,
      chunks: searchedChunks,
    });
  } catch (error: any) {
    console.error("Error in chat route:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
