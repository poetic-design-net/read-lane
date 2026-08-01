import { NextRequest, NextResponse } from "next/server";
import { getStorage, verifySignedFileParams } from "@/lib/storage";
import { getFileByStorageKey, resolveDelivery } from "@/lib/files/service";
import { extensionOf } from "@/lib/documents/formats";

/**
 * Controlled file proxy for signed storage URLs.
 * Requires valid HMAC signature + expiry.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");
  const exp = Number(searchParams.get("exp"));
  const sig = searchParams.get("sig");
  const forceDownload = searchParams.get("download") === "1";

  if (!key || !exp || !sig) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!verifySignedFileParams(key, exp, sig)) {
    return NextResponse.json({ error: "Expired or invalid" }, { status: 403 });
  }

  const obj = await getStorage().getObject(key);
  if (!obj) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Storage providers do not reliably report a content type, so the files row
  // is the source of truth — without it PDFs arrive as octet-stream and no
  // viewer renders them.
  const record = await getFileByStorageKey(key);
  const { contentType, disposition } = resolveDelivery({
    mimeType: record?.mimeType ?? obj.mimeType,
    extension: record?.fileExtension ?? extensionOf(key),
    forceDownload,
  });
  const filename = record?.safeFilename ?? key.split("/").pop() ?? "download";

  return new NextResponse(new Uint8Array(obj.data), {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `${disposition}; filename="${filename.replace(/"/g, "")}"`,
      "Cache-Control": "private, max-age=60",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
