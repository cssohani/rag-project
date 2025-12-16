import fs from "fs";
import path from "path";

import { OpenAIEmbeddings, ChatOpenAI } from "@langchain/openai";
import { HNSWLib } from "@langchain/community/vectorstores/hnswlib";

/**
 * Query a collection's vectorstore and return an answer + sources.
 * @param {object} params
 * @param {string} params.collectionId
 * @param {string} params.question
 * @param {number} [params.topK=4]
 * @param {string} [params.vectorstoresRoot="vectorstores"]
 */
export async function queryCollection({
  collectionId,
  question,
  topK = 4,
  vectorstoresRoot = "vectorstores",
}) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY in environment.");
  }
  if (!collectionId) throw new Error("collectionId is required");
  if (!question) throw new Error("question is required");

  const indexDir = path.join(vectorstoresRoot, collectionId);
  const existsCheckFile = path.join(indexDir, "args.json");

  if (!fs.existsSync(existsCheckFile)) {
    const err = new Error(`No index found for collection "${collectionId}"`);
    err.code = "NO_INDEX";
    throw err;
  }

  const embeddings = new OpenAIEmbeddings({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const vectorstore = await HNSWLib.load(indexDir, embeddings);
  const retriever = vectorstore.asRetriever({ k: topK });

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

  const response = await llm.invoke(prompt);

  const sources = docs.map((doc) => ({
    source: doc.metadata?.source ?? "unknown",
    page: doc.metadata?.page ?? "?",
    snippet: doc.pageContent.replace(/\s+/g, " ").slice(0, 180),
  }));

  return {
    answer: response.content,
    sources,
  };
}
