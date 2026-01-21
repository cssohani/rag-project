
export type QueryResult = {
  answer: string;
  sources: Array<{ source: string; page: string | number; snippet: string }>;
};

export type ActiveDoc = {
  collection: string;
  filename: string;
  uploadedAt: string;
  status: "idle" | "uploading" | "ingesting" | "ready" | "error";
  error?: string;
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const API_URL = import.meta.env.VITE_API_URL as string;

if (!API_URL) {

  console.warn("VITE_API_URL is not set. Set it in frontend/.env");
}

function base(url: string) {
  return url?.replace(/\/$/, "");
}


export async function uploadPdf(params: { collectionId: string; file: File }) {
  const collectionId = (params.collectionId || "").trim();
  if (!collectionId) throw new Error("collectionId is required (e.g. 'demo').");

  const form = new FormData();
  form.append("collection_id", collectionId);
  form.append("file", params.file);

  const res = await fetch(`${base(API_URL)}/upload`, {
    method: "POST",
    body: form,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.error || `Upload failed (${res.status})`);
  }

  return data as {
    status: "ok";
    collection_id: string;
    filename: string;
    pagesLoaded?: number;
    chunksCreated?: number;
  };
}


export async function queryPdf(params: { collectionId: string; question: string; topK?: number }) {
  const collectionId = (params.collectionId || "").trim();
  if (!collectionId) throw new Error("collectionId is required (e.g. 'demo').");

  const question = (params.question || "").trim();
  if (!question) throw new Error("question is required.");

  const res = await fetch(`${base(API_URL)}/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      collection_id: collectionId,
      question,
      top_k: params.topK ?? 4,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Query failed (${res.status})`);
  return data as QueryResult;
}


export async function uploadAndIngest(opts: { file: File; collection: string }): Promise<void> {
  await uploadPdf({ collectionId: opts.collection, file: opts.file });
}


export async function queryDoc(opts: { question: string; collection: string; k?: number }): Promise<QueryResult> {
  return queryPdf({ collectionId: opts.collection, question: opts.question, topK: opts.k ?? 4 });
}

export async function healthCheck(): Promise<boolean> {
  try {
    const res = await fetch(`${base(API_URL)}/health`);
    return res.ok;
  } catch {
    return false;
  }
}
