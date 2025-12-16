import "dotenv/config";
import fs from "fs";
import path from "path";

import { OpenAIEmbeddings, ChatOpenAI } from "@langchain/openai";
import { HNSWLib } from "@langchain/community/vectorstores/hnswlib";

// -------- tiny arg parser --------
function getArg(name, fallback = null) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1) return fallback;
  return process.argv[idx + 1] ?? fallback;
}

async function main() {
  const collectionId = getArg("collection", "demo");
  const question = getArg("question");
  const topK = Number(getArg("top_k", "4"));

  if (!process.env.OPENAI_API_KEY) {
    console.error("Missing OPENAI_API_KEY. Put it in backend/.env");
    process.exit(1);
  }

  if (!question) {
    console.error(
      'Usage:\n  node rag/query.js --collection demo --question "What is this about?" --top_k 4'
    );
    process.exit(1);
  }

  const indexDir = path.join("vectorstores", collectionId);
  const existsCheckFile = path.join(indexDir, "args.json");

  if (!fs.existsSync(existsCheckFile)) {
    console.error(
      `No index found for collection "${collectionId}". Run ingest first.\n` +
        `Example: node rag/ingest.js --collection ${collectionId} --file uploads/${collectionId}/fitsense_plan.pdf`
    );
    process.exit(1);
  }

  console.log(`\n[Query] Collection: ${collectionId}`);
  console.log(`[Query] Loading index from: ${indexDir}`);

  const embeddings = new OpenAIEmbeddings({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const vectorstore = await HNSWLib.load(indexDir, embeddings);
  const retriever = vectorstore.asRetriever(topK);

  // Retrieve relevant chunks
  console.log(`[Query] Retrieving top ${topK} chunk(s)...`);
  const docs = await retriever.invoke(question);

  const context = docs.map((d) => d.pageContent).join("\n\n---\n\n");

  const llm = new ChatOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    model: "gpt-4o-mini",
    temperature: 0.1,
  });

  const prompt = [
    "You are a helpful assistant.",
    "Answer the question using ONLY the context below.",
    "If the answer is not in the context, say you don't know.",
    "",
    "Context:",
    context,
    "",
    "Question:",
    question,
  ].join("\n");

  console.log(`[Query] Asking LLM...\n`);
  const response = await llm.invoke(prompt);

  console.log("Answer:\n");
  console.log(response.content);

  if (docs.length) {
    console.log("\nSources:\n");
    docs.forEach((doc, i) => {
      const src = doc.metadata?.source ?? "unknown";
      const page = doc.metadata?.page ?? "?";
      const snippet = doc.pageContent.replace(/\s+/g, " ").slice(0, 180);
      console.log(`${i + 1}. ${src} (page ${page}) — ${snippet}...`);
    });
  }

  console.log();
}

main().catch((err) => {
  console.error("Query error:", err);
  process.exit(1);
});
