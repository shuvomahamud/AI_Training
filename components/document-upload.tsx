"use client";

import { upload } from "@vercel/blob/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { attachDocumentAction } from "@/actions/documents";

export function DocumentUpload({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(file: File) {
    if (!title.trim()) {
      setStatus("Add a title before choosing a file.");
      return;
    }
    setBusy(true);
    setStatus("Uploading…");
    try {
      const blob = await upload(file.name, file, {
        access: "private",
        handleUploadUrl: "/api/upload",
      });
      setStatus("Converting…");
      const result = await attachDocumentAction({
        sessionId,
        title: title.trim(),
        filename: file.name,
        blobUrl: blob.url,
        pathname: blob.pathname,
      });
      if (result && "error" in result) {
        setStatus(result.error);
        return;
      }
      setTitle("");
      setStatus("Document added.");
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-3 rounded-xl border border-ink-200 bg-white p-4">
      <label className="grid gap-1.5 text-sm">
        <span className="font-medium text-ink-700">Document title</span>
        <input
          className="input"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Topic 01 — Explaining AI in plain language"
          disabled={busy}
        />
      </label>
      <label className="grid gap-1.5 text-sm">
        <span className="font-medium text-ink-700">File (.docx, .md, or .pdf)</span>
        <input
          className="input file:mr-3 file:rounded file:border-0 file:bg-ink-100 file:px-3 file:py-1.5"
          type="file"
          accept=".docx,.md,.markdown,.txt,.pdf,application/pdf,text/markdown,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          disabled={busy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void onFile(file);
            event.target.value = "";
          }}
        />
      </label>
      {status ? <p className="text-sm text-ink-600">{status}</p> : null}
    </div>
  );
}
