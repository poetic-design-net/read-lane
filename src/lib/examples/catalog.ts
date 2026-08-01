/**
 * One example per supported format, so every renderer can be seen without
 * having to find a file first. Binary samples live in /public/examples and go
 * through the normal upload path.
 */

import { EXAMPLE_MARKDOWN } from "@/lib/markdown/example";
import type { RendererType } from "@/lib/documents/formats";

export interface ExampleDocument {
  id: string;
  label: string;
  hint: string;
  title: string;
  filename: string;
  rendererType: RendererType;
  /** Text formats carry their content; binary ones are fetched from `url`. */
  content?: string;
  url?: string;
}

const EXAMPLE_TEXT = `Readlane — Beispiel

Reiner Text wird so ausgeliefert, wie er geschrieben wurde: gleiche Umbrüche,
gleiche Reihenfolge, nur in einer Schrift, die sich lesen lässt.

Typische Fälle
  · Release Notes aus dem Build
  · Logs, die jemand ohne Terminal sehen soll
  · Notizen, die niemand formatieren möchte

Der Share-Link bleibt bestehen, auch wenn Sie den Inhalt später ersetzen.
`;

const EXAMPLE_CODE = `// Beispiel: Dokument per CLI veröffentlichen
import { readFile } from "node:fs/promises";

interface PublishOptions {
  file: string;
  project?: string;
  visibility: "public" | "unlisted" | "password";
}

export async function publish({ file, project, visibility }: PublishOptions) {
  const content = await readFile(file, "utf8");

  const response = await fetch("https://app.readlane.io/api/v1/documents", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: \`Bearer \${process.env.READLANE_TOKEN}\`,
    },
    body: JSON.stringify({ title: file, markdownContent: content, project, visibility }),
  });

  if (!response.ok) {
    const { error } = await response.json();
    throw new Error(\`\${error.code}: \${error.message}\`);
  }

  const { data } = await response.json();
  return data.document.shareUrl;
}
`;

const EXAMPLE_CSV = `Monat,Umsatz,Neukunden,Veränderung
Januar,12400,18,+4%
Februar,13900,24,+12%
März,15200,29,+9%
April,14800,21,-3%
Mai,16350,33,+10%
Juni,17900,41,+9%
`;

const EXAMPLE_HTML = `<!doctype html>
<html lang="de">
  <head>
    <meta charset="utf-8" />
    <title>Beispielseite</title>
  </head>
  <body>
    <h1>Statusbericht</h1>
    <p>HTML-Dateien werden als Quelltext angezeigt, nicht ausgeführt.</p>
    <ul>
      <li>Kein Script läuft auf unserer Domain</li>
      <li>Der Inhalt bleibt trotzdem lesbar</li>
    </ul>
  </body>
</html>
`;

export const EXAMPLE_DOCUMENTS: ExampleDocument[] = [
  {
    id: "markdown",
    label: "Markdown",
    hint: "Überschriften, Listen, Code",
    title: "Beispiel — Markdown",
    filename: "beispiel.md",
    rendererType: "markdown",
    content: EXAMPLE_MARKDOWN,
  },
  {
    id: "text",
    label: "Text",
    hint: "Unformatierter Fließtext",
    title: "Beispiel — Text",
    filename: "beispiel.txt",
    rendererType: "text",
    content: EXAMPLE_TEXT,
  },
  {
    id: "code",
    label: "Code",
    hint: "Syntax-Highlighting",
    title: "Beispiel — Code",
    filename: "beispiel.ts",
    rendererType: "code",
    content: EXAMPLE_CODE,
  },
  {
    id: "csv",
    label: "CSV",
    hint: "Als Tabelle dargestellt",
    title: "Beispiel — Tabelle",
    filename: "beispiel.csv",
    rendererType: "csv",
    content: EXAMPLE_CSV,
  },
  {
    id: "html",
    label: "HTML",
    hint: "Quelltext, nie ausgeführt",
    title: "Beispiel — HTML",
    filename: "beispiel.html",
    rendererType: "html",
    content: EXAMPLE_HTML,
  },
  {
    id: "pdf",
    label: "PDF",
    hint: "Im Browser lesbar",
    title: "Beispiel — PDF",
    filename: "beispiel.pdf",
    rendererType: "pdf",
    url: "/examples/beispiel.pdf",
  },
  {
    id: "image",
    label: "Bild",
    hint: "PNG, JPG, WebP, GIF",
    title: "Beispiel — Bild",
    filename: "beispiel.png",
    rendererType: "image",
    url: "/examples/beispiel.png",
  },
  {
    id: "docx",
    label: "Word",
    hint: "Wird zu formatiertem Text",
    title: "Beispiel — Word",
    filename: "beispiel.docx",
    rendererType: "docx",
    url: "/examples/beispiel.docx",
  },
];
