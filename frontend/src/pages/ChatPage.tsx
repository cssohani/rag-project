import { useLocation, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { queryPdf } from "../lib/api";
import type { QueryResult } from "../lib/api";

type ChatRouteState = {
  collectionId: string;
};

type ChatMessage =
  | { role: "user"; text: string }
  | { role: "assistant"; text: string; sources?: QueryResult["sources"] };

export default function ChatPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as ChatRouteState | null;

  const collectionId = state?.collectionId ?? "demo";

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const canSend = useMemo(
    () => input.trim().length > 0 && !loading,
    [input, loading]
  );

  async function sendMessage() {
    if (!canSend) return;

    const question = input.trim();
    setInput("");
    setError("");

    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setLoading(true);

    try {
      const result = await queryPdf({
        collectionId,
        question,
        topK: 4,
      });

      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: result.answer, sources: result.sources },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Query failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: "24px auto", padding: 16 }}>
      <button onClick={() => navigate("/")}>← Back</button>

      <h1 style={{ marginTop: 16 }}>Chat</h1>
      <p>
        Collection: <b>{collectionId}</b>
      </p>

      <div
        style={{
          marginTop: 16,
          border: "1px solid #ddd",
          borderRadius: 8,
          padding: 12,
          minHeight: 240,
        }}
      >
        {messages.length === 0 && (
          <p style={{ opacity: 0.6 }}>
            Ask a question about your uploaded document.
          </p>
        )}

        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 600 }}>
              {m.role === "user" ? "You" : "Assistant"}
            </div>
            <div style={{ whiteSpace: "pre-wrap", marginTop: 4 }}>
              {m.text}
            </div>

            {m.role === "assistant" && m.sources?.length ? (
              <details style={{ marginTop: 8 }}>
                <summary style={{ cursor: "pointer" }}>Sources</summary>
                <ul style={{ marginTop: 8 }}>
                  {m.sources.map((s, idx) => (
                    <li key={idx} style={{ marginBottom: 6, fontSize: 14 }}>
                      <b>{s.source}</b> (page {s.page}):{" "}
                      <span style={{ opacity: 0.8 }}>{s.snippet}…</span>
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Ask a question…"
          style={{ flex: 1, padding: 10 }}
        />
        <button onClick={sendMessage} disabled={!canSend}>
          {loading ? "Thinking…" : "Send"}
        </button>
      </div>

      {error && (
        <p style={{ marginTop: 8, color: "crimson" }}>
          Error: {error}
        </p>
      )}
    </div>
  );
}
