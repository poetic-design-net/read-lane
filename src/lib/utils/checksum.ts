import { createHash } from "crypto";

export function contentChecksum(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}
