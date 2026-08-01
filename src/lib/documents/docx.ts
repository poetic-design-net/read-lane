/**
 * DOCX conversion (backend.md §16 "DOCX").
 *
 * mammoth's markdown writer silently drops tables, so we keep its HTML and
 * store that. Sanitizing happens at render time, exactly like markdown — the
 * content column always holds the untrusted original.
 */

import mammoth from "mammoth";

/** ZIP container magic — every .docx is a zip. */
export function isZipContainer(buf: Buffer): boolean {
  return (
    buf.length >= 4 &&
    buf[0] === 0x50 &&
    buf[1] === 0x4b &&
    buf[2] === 0x03 &&
    buf[3] === 0x04
  );
}

export async function convertDocxToHtml(data: Buffer): Promise<string> {
  const { value } = await mammoth.convertToHtml(
    { buffer: data },
    {
      // Never let a document pull in files from the host.
      externalFileAccess: false,
      // ponytail: embedded images are dropped, not copied to storage. Storing
      // them means one upload per image — add it when someone asks.
      convertImage: mammoth.images.imgElement(async () => ({ src: "" })),
    }
  );
  return value.replace(/<img\b[^>]*>/gi, "").trim();
}
