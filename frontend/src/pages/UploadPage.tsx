import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { uploadPdf } from "../lib/api";

export default function UploadPage() {
  const [collectionId, setCollectionId] = useState<string>("demo");
  const [file, setFile] = useState<File | null>(null);

  const [status, setStatus] = useState<
    "idle" | "uploading" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState<string>("");

  const navigate = useNavigate();

  const canUpload = useMemo(() => {
    return collectionId.trim().length > 0 && file !== null && status !== "uploading";
  }, [collectionId, file, status]);

  async function handleUpload() {
    if (!file) return;

    try {
      setStatus("uploading");
      setMessage("Uploading & ingesting…");

      const result = await uploadPdf({ collectionId: collectionId.trim(), file });

      setStatus("success");
      setMessage(
        `Uploaded ${result.filename}. Loaded ${result.pagesLoaded} pages and created ${result.chunksCreated} chunks.`
      );
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Upload failed");
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
      <h1>Document Q&A</h1>
      <p>Upload a PDF to a collection, then chat with it.</p>

      <div style={{ marginTop: 16 }}>
        <label style={{ display: "block", marginBottom: 8 }}>
          Collection ID
        </label>
        <input
          value={collectionId}
          onChange={(e) => setCollectionId(e.target.value)}
          style={{ display: "block", width: "100%", padding: 10 }}
          placeholder="e.g. demo, hr-policies, client-a"
        />
      </div>

      <div style={{ marginTop: 16 }}>
        <label style={{ display: "block", marginBottom: 8 }}>PDF File</label>
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        {file && (
          <div style={{ marginTop: 8, fontSize: 14 }}>
            Selected: <b>{file.name}</b>
          </div>
        )}
      </div>

      <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
        <button
          onClick={handleUpload}
          disabled={!canUpload}
          style={{ padding: "10px 14px" }}
        >
          {status === "uploading" ? "Uploading…" : "Upload & Ingest"}
        </button>

        <button
          onClick={() => navigate("/chat", { state: { collectionId: collectionId.trim() } })}
          style={{ padding: "10px 14px" }}
          disabled={collectionId.trim().length === 0}
        >
          Go to Chat →
        </button>
      </div>

      {status !== "idle" && (
        <div style={{ marginTop: 16 }}>
          <p style={{ margin: 0 }}>
            <b>Status:</b> {status}
          </p>
          <p style={{ marginTop: 8 }}>{message}</p>
        </div>
      )}
    </div>
  );
}
