import { expect, test } from "bun:test";
import { sanitizeDocumentHtml } from "./sanitize";

test("strips scripts, styles, and classes", () => {
  const html = sanitizeDocumentHtml(
    `<p class="danger" style="color:red" onclick="alert(1)">Hello <script>alert(1)</script></p>`,
  );
  expect(html).toContain("Hello");
  expect(html).not.toContain("script");
  expect(html).not.toContain("onclick");
  expect(html).not.toContain("style=");
  expect(html).not.toContain("class=");
});

test("forces safe link attributes", () => {
  const html = sanitizeDocumentHtml(`<a href="https://example.com">Site</a>`);
  expect(html).toContain('rel="noopener noreferrer"');
  expect(html).toContain('target="_blank"');
});

test("drops javascript urls", () => {
  const html = sanitizeDocumentHtml(`<a href="javascript:alert(1)">x</a>`);
  expect(html).not.toContain("javascript:");
});
