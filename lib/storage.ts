import { del, get, list, put } from "@vercel/blob";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

export type PrivateObject = {
  body: ReadableStream<Uint8Array>;
  contentType: string;
  size: number;
};

function localStorageRoot(): string | null {
  const configured = process.env.LOCAL_STORAGE_ROOT?.trim();
  return configured ? path.resolve(configured) : null;
}

function resolveLocalPath(root: string, pathname: string): string {
  if (
    !pathname ||
    pathname.includes("\0") ||
    pathname.startsWith("/") ||
    path.posix.normalize(pathname) !== pathname
  ) {
    throw new Error("Invalid storage pathname");
  }
  const resolved = path.resolve(root, pathname);
  if (!resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error("Invalid storage pathname");
  }
  return resolved;
}

export async function putPrivateObject(
  pathname: string,
  bytes: Buffer | Uint8Array,
  contentType: string,
): Promise<{ pathname: string; url: string }> {
  const root = localStorageRoot();
  if (!root) {
    const blob = await put(pathname, Buffer.from(bytes), {
      access: "private",
      contentType,
    });
    return { pathname: blob.pathname, url: blob.url };
  }
  const target = resolveLocalPath(root, pathname);
  await mkdir(path.dirname(target), { recursive: true, mode: 0o750 });
  await writeFile(target, bytes, { mode: 0o640, flag: "wx" });
  return { pathname, url: `local:${pathname}` };
}

export async function getPrivateObject(
  pathname: string,
  fallbackContentType = "application/octet-stream",
): Promise<PrivateObject | null> {
  const root = localStorageRoot();
  if (!root) {
    const blob = await get(pathname, { access: "private" });
    if (!blob || blob.statusCode !== 200) return null;
    return {
      body: blob.stream,
      contentType: blob.blob.contentType || fallbackContentType,
      size: blob.blob.size,
    };
  }
  try {
    const target = resolveLocalPath(root, pathname);
    const [bytes, metadata] = await Promise.all([readFile(target), stat(target)]);
    if (!metadata.isFile()) return null;
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(bytes));
        controller.close();
      },
    });
    return {
      body,
      contentType: fallbackContentType,
      size: metadata.size,
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function deletePrivateObject(pathname: string): Promise<void> {
  const root = localStorageRoot();
  if (!root) {
    await del(pathname);
    return;
  }
  await rm(resolveLocalPath(root, pathname), { force: true });
}

export async function deletePrivatePrefix(prefix: string): Promise<void> {
  const root = localStorageRoot();
  if (!root) {
    const result = await list({ prefix });
    if (result.blobs.length > 0) {
      await del(result.blobs.map((blob) => blob.url));
    }
    return;
  }
  await rm(resolveLocalPath(root, prefix.replace(/\/$/, "")), {
    recursive: true,
    force: true,
  });
}
