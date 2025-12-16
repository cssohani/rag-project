import "dotenv/config";
import fs from "fs";
import path from "path";

import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";

import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { OpenAIEmbeddings } from "@langchain/openai";
import { HNSWLib } from "@langchain/community/vectorstores/hnswlib";

// -------- tiny arg parser --------
function getArg(name, fallback = null) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1) return fallback;
  return process.argv[idx + 1] ?? fallback;
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

async function loadDocs(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext !== ".pdf") {
    throw new Error("Only PDF is supported right now. Please use a .pdf file.");
  }
  const loader = new PDFLoader(filePath);
  return loader.load();
}

async function main() {
  const collectionId = getArg("collection", "demo");
  const filePath = getArg("file");

  if (!process.env.OPENAI_API_KEY) {
    console.error("Missing OPENAI_API_KEY. Put it in backend/.env");
    process.exit(1);
  }

  if (!filePath) {
    console.error(
      "Usage:\n  node rag/ingest.js --collection demo --file uploads/demo/fitsense_plan.pdf"
    );
    process.exit(1);
  }

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  console.log(`\n[Ingest] Collection: ${collectionId}`);
  console.log(`[Ingest] File: ${filePath}`);

  const docs = await loadDocs(filePath);
  console.log(`[Ingest] Loaded ${docs.length} page(s)/doc(s)`);

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });

  const chunks = await splitter.splitDocuments(docs);
  console.log(`[Ingest] Split into ${chunks.length} chunks`);

  const embeddings = new OpenAIEmbeddings({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const indexDir = path.join("vectorstores", collectionId);
  ensureDir(indexDir);

  // HNSWLib stores multiple files; we’ll use this as a simple “exists” check.
  const existsCheckFile = path.join(indexDir, "args.json");

  let vectorstore;

  if (fs.existsSync(existsCheckFile)) {
    console.log(`[Ingest] Found existing index. Loading from ${indexDir}...`);
    vectorstore = await HNSWLib.load(indexDir, embeddings);
    await vectorstore.addDocuments(chunks);
    console.log(`[Ingest] Added chunks to existing index`);
  } else {
    console.log(`[Ingest] No index found. Creating new index in ${indexDir}...`);
    vectorstore = await HNSWLib.fromDocuments(chunks, embeddings);
  }

  await vectorstore.save(indexDir);
  console.log(`[Ingest] Saved index to ${indexDir}\n`);
}

main().catch((err) => {
  console.error("Ingest error:", err);
  process.exit(1);
});
