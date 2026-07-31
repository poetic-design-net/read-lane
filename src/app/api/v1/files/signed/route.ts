import { NextRequest, NextResponse } from "next/server";
import { getStorage, verifySignedFileParams } from "@/lib/storage";

/**
 * Controlled file proxy for signed storage URLs.
 * Requires valid HMAC signature + expiry.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");
  const exp = Number(searchParams.get("exp"));
  const sig = searchParams.get("sig");

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

  return new NextResponse(new Uint8Array(obj.data), {
    status: 200,
    headers: {
      "Content-Type": obj.mimeType || "application/octet-stream",
      "Cache-Control": "private, max-age=60",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
