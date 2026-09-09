"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import {
  saveMarkdownMaterialAction,
  type ActionState,
} from "@/actions/documents";
import { FormError, FormOk, SubmitButton } from "./ui";

export function DocumentUpload({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [fileStatus, setFileStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [markdownState, markdownAction] = useActionState<ActionState, FormData>(
    saveMarkdownMaterialAction,
    null,
  );

  async function onFile(file: File) {
    if (!title.trim()) {
      setFileStatus("Add a title before choosing a file.");
      return;
    }
    setBusy(true);
    setFileStatus("Uploading…");
    try {
      const formData = new FormData();
      formData.set("sessionId", sessionId);
      formData.set("title", title.trim());
      formData.set("file", file);
      const response = await fetch("/api/upload", { method: "POST", body: formData });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Upload failed.");
      setTitle("");
      setFileStatus("Reading added.");
      router.refresh();
    } catch (error) {
      setFileStatus(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6">
      <label className="grid gap-1.5 text-sm">
        <span className="font-medium text-ink-700">Title</span>
        <input
          className="input"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Topic 01 — Explaining AI in plain language"
          disabled={busy}
        />
      </label>

      <form action={markdownAction} className="grid gap-3 rounded-xl border border-border bg-surface p-4">
        <input type="hidden" name="sessionId" value={sessionId} />
        <input type="hidden" name="title" value={title} />
        <p className="text-sm text-ink-600">
          Paste or write the reading in Markdown. Headings, lists, and links
          become a readable page for learners.
        </p>
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium text-ink-700">Reading (Markdown or plain text)</span>
          <textarea
            className="input min-h-48 font-mono text-sm"
            name="markdown"
            required
            placeholder={"# Heading\n\nWrite the section here.\n\n- Point one\n- Point two"}
            disabled={busy}
          />
        </label>
        <FormError
          message={markdownState && "error" in markdownState ? markdownState.error : undefined}
        />
        <FormOk
          show={markdownState !== null && "ok" in markdownState}
          message="Reading saved. Learners can open this section now."
        />
        <SubmitButton disabled={!title.trim()}>Save reading</SubmitButton>
      </form>

      <div className="grid gap-3 rounded-xl border border-dashed border-border p-4">
        <p className="text-sm font-medium text-ink-800">Or upload a file</p>
        <p className="text-sm text-ink-600">
          Uses the title above. PDF stays as a PDF. Word (.docx) and Markdown
          files are converted to a readable page.
        </p>
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium text-ink-700">File (.md, .docx, or .pdf)</span>
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
        {fileStatus ? <p className="text-sm text-ink-600">{fileStatus}</p> : null}
      </div>
    </div>
  );
}
