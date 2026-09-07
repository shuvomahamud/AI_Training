import { put } from "@vercel/blob";
import mammoth from "mammoth";
import MarkdownIt from "markdown-it";
import { sanitizeDocumentHtml } from "./sanitize";

const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
});

const REJECTED_EXTENSIONS = new Set([".doc", ".odt", ".rtf", ".pages"]);

export type SourceType = "docx" | "md" | "pdf";

export class UnsupportedDocumentError extends Error {
  constructor() {
    super("Please export to .docx and upload again.");
    this.name = "UnsupportedDocumentError";
  }
}

export function extensionOf(filename: string): string {
  const index = filename.lastIndexOf(".");
  return index === -1 ? "" : filename.slice(index).toLowerCase();
}

export function sourceTypeFor(filename: string): SourceType {
  const ext = extensionOf(filename);
  if (REJECTED_EXTENSIONS.has(ext)) {
    throw new UnsupportedDocumentError();
  }
  if (ext === ".docx") return "docx";
  if (ext === ".md" || ext === ".markdown" || ext === ".txt") return "md";
  if (ext === ".pdf") return "pdf";
  throw new UnsupportedDocumentError();
}

export async function convertDocument(options: {
  documentId: string;
  filename: string;
  bytes: Buffer;
}): Promise<{ sourceType: SourceType; html: string | null }> {
  const sourceType = sourceTypeFor(options.filename);

  if (sourceType === "pdf") {
    return { sourceType, html: null };
  }

  if (sourceType === "md") {
    const html = sanitizeDocumentHtml(markdown.render(options.bytes.toString("utf8")));
    return { sourceType, html };
  }

  const result = await mammoth.convertToHtml(
    { buffer: options.bytes },
    {
      convertImage: mammoth.images.imgElement(async (image) => {
        const contentType = image.contentType || "image/png";
        const imageBytes = await image.read();
        const uploaded = await put(
          `documents/${options.documentId}/${crypto.randomUUID()}`,
          imageBytes,
          { access: "private", contentType },
        );
        return {
          src: `/api/documents/${options.documentId}/asset?pathname=${encodeURIComponent(uploaded.pathname)}`,
        };
      }),
    },
  );

  if (result.messages.length > 0) {
    console.log("mammoth messages", result.messages);
  }

  return { sourceType, html: sanitizeDocumentHtml(result.value) };
}
