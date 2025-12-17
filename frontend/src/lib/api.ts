const API_URL = import.meta.env.VITE_API_URL as string;

if (!API_URL) {
  // Helps catch misconfig early
  // eslint-disable-next-line no-console
  console.warn("VITE_API_URL is not set. Set it in frontend/.env");
}

export async function uploadPdf(params: { collectionId: string; file: File }) {
  const form = new FormData();
  form.append("collection_id", params.collectionId);
  form.append("file", params.file);

  const res = await fetch(`${API_URL}/upload`, {
    method: "POST",
    body: form,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.error || "Upload failed");
  }

  return data as {
    status: "ok";
    collection_id: string;
    filename: string;
    pagesLoaded: number;
    chunksCreated: number;
  };
}

export type QueryResult = {
  answer: string;
  sources: Array<{ source: string; page: string | number; snippet: string }>;
};

export async function queryPdf(params: {
  collectionId: string;
  question: string;
  topK?: number;
}) {
  const res = await fetch(`${API_URL}/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      collection_id: params.collectionId,
      question: params.question,
      top_k: params.topK ?? 4,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Query failed");
  return data as QueryResult;
}

