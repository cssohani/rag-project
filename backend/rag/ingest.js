import "dotenv/config";

import { ingestPdfToCollection } from "../src/services/ingestionService.js";

// -------- tiny arg parser --------
function getArg(name, fallback = null) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1) return fallback;
  return process.argv[idx + 1] ?? fallback;
}

async function main() {
  const collectionId = getArg("collection", "demo");
  const filePath = getArg("file");

  if (!filePath) {
    console.error(
      "Usage:\n  node rag/ingest.js --collection demo --file uploads/demo/fitsense_plan.pdf"
    );
    process.exit(1);
  }

  console.log(`\n[Ingest] Collection: ${collectionId}`);
  console.log(`[Ingest] File: ${filePath}`);

  const result = await ingestPdfToCollection({
    collectionId,
    filePath,
  });

  console.log(
    `[Ingest] Loaded ${result.pagesLoaded} page(s), created ${result.chunksCreated} chunk(s)`
  );
  console.log(`[Ingest] Saved index to ${result.indexDir}\n`);
}

main().catch((err) => {
  console.error("Ingest error:", err);
  process.exit(1);
});
