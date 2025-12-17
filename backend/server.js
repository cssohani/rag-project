import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import fs from "fs";
import path from "path";

import { ingestPdfToCollection } from "./src/services/ingestionService.js";
import { queryCollection } from "./src/services/queryService.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Ensure runtime dirs exist
fs.mkdirSync("uploads", { recursive: true });
fs.mkdirSync("vectorstores", { recursive: true });

// Health
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Multer storage: put uploaded files into uploads/<collection_id>/
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const collectionId = req.body.collection_id;
    if (!collectionId) return cb(new Error("collection_id is required"), null);

    const dest = path.join("uploads", collectionId);
    fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage });

// POST /upload (multipart/form-data): collection_id + file
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const collectionId = req.body.collection_id;
    if (!collectionId) return res.status(400).json({ error: "collection_id is required" });
    if (!req.file) return res.status(400).json({ error: "file is required" });

    const filePath = req.file.path;

    const result = await ingestPdfToCollection({
      collectionId,
      filePath,
      mode: "replace",
    });

    res.json({
      status: "ok",
      collection_id: collectionId,
      filename: req.file.originalname,
      pagesLoaded: result.pagesLoaded,
      chunksCreated: result.chunksCreated,
    });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: err?.message || "Upload failed" });
  }
});

// POST /query (JSON): { collection_id, question, top_k? }
app.post("/query", async (req, res) => {
  try {
    const { collection_id, question, top_k } = req.body || {};
    if (!collection_id) return res.status(400).json({ error: "collection_id is required" });
    if (!question) return res.status(400).json({ error: "question is required" });

    const result = await queryCollection({
      collectionId: collection_id,
      question,
      topK: top_k ?? 4,
    });

    res.json(result);
  } catch (err) {
    if (err?.code === "NO_INDEX") {
      return res.status(404).json({ error: err.message });
    }
    console.error("Query error:", err);
    res.status(500).json({ error: err?.message || "Query failed" });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
