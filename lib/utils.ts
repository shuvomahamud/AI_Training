export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "course";
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function fieldError(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}
