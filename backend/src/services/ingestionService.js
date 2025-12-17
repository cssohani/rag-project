import fs from "fs";
import path from "path";

import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { OpenAIEmbeddings } from "@langchain/openai";
import { HNSWLib } from "@langchain/community/vectorstores/hnswlib";

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

async function loadPdfDocs(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext !== ".pdf") {
    throw new Error("Only PDF is supported right now. Please upload a .pdf file.");
  }
  const loader = new PDFLoader(filePath);
  return loader.load();
}

/**
 * Ingest a PDF into a collection's vectorstore on disk.
 * @param {object} params
 * @param {string} params.collectionId
 * @param {string} params.filePath - path to a local PDF file
 * @param {string} [params.vectorstoresRoot="vectorstores"]
 * @param {number} [params.chunkSize=1000]
 * @param {number} [params.chunkOverlap=200]
 */
export async function ingestPdfToCollection({
  collectionId,
  filePath,
  vectorstoresRoot = "vectorstores",
  chunkSize = 1000,
  chunkOverlap = 200,
  mode = "replace"
}) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY in environment.");
  }
  if (!collectionId) throw new Error("collectionId is required");
  if (!filePath) throw new Error("filePath is required");
  if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);

  const docs = await loadPdfDocs(filePath);

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap,
  });

  const chunks = await splitter.splitDocuments(docs);

  const embeddings = new OpenAIEmbeddings({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const indexDir = path.join(vectorstoresRoot, collectionId);
  ensureDir(indexDir);
  
  if (mode === "replace" && fs.existsSync(indexDir)) {
  fs.rmSync(indexDir, { recursive: true, force: true });
  ensureDir(indexDir);
}

  const existsCheckFile = path.join(indexDir, "args.json");

  
  let vectorstore;
  if (fs.existsSync(existsCheckFile)) {
    vectorstore = await HNSWLib.load(indexDir, embeddings);
    await vectorstore.addDocuments(chunks);
  } else {
    vectorstore = await HNSWLib.fromDocuments(chunks, embeddings);
  }

  await vectorstore.save(indexDir);

  return {
    collectionId,
    pagesLoaded: docs.length,
    chunksCreated: chunks.length,
    indexDir,
  };
}
