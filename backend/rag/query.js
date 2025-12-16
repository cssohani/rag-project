import "dotenv/config";

import { queryCollection } from "../src/services/queryService.js";

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

  if (!question) {
    console.error(
      'Usage:\n  node rag/query.js --collection demo --question "Summarize this plan" --top_k 4'
    );
    process.exit(1);
  }

  console.log(`\n[Query] Collection: ${collectionId}`);
  console.log(`[Query] Question: ${question}\n`);

  const result = await queryCollection({
    collectionId,
    question,
    topK,
  });

  console.log("Answer:\n");
  console.log(result.answer);

  if (result.sources?.length) {
    console.log("\nSources:\n");
    result.sources.forEach((s, i) => {
      console.log(`${i + 1}. ${s.source} (page ${s.page}) — ${s.snippet}...`);
    });
  }

  console.log();
}

main().catch((err) => {
  // nicer message if no index exists
  if (err?.code === "NO_INDEX") {
    console.error(`${err.message}`);
    process.exit(1);
  }
  console.error("Query error:", err);
  process.exit(1);
});
