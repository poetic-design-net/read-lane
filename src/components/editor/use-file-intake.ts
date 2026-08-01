"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import {
  detectRenderer,
  isBlockedFilename,
  isTextBasedRenderer,
  type RendererType,
} from "@/lib/documents/formats";
import { planLimits } from "@/lib/plans/config";
import type { PlanId } from "@/lib/plans/config";

export interface IntakeResult {
  rendererType: RendererType;
  title: string;
  sourceFilename: string;
  /** Text formats only — binary content stays in storage */
  markdownContent: string;
  /** publicId of the stored file, binary formats only */
  fileId: string | null;
  previewUrl: string | null;
  mimeType: string | null;
  fileSize: number;
}

/**
 * Single entry point for picking a file, shared by every upload surface.
 *
 * Text formats are read locally so they stay editable and cost no storage
 * quota. Everything else goes to /api/v1/uploads, which validates magic bytes
 * and plan limits server-side and converts DOCX; only the file's publicId
 * comes back.
 */
export function useFileIntake(plan: PlanId = "free") {
  const [uploading, setUploading] = useState(false);

  const pickFile = useCallback(
    async (file: File): Promise<IntakeResult | null> => {
      if (isBlockedFilename(file.name)) {
        toast.error("Secret- oder Credential-Dateien sind nicht erlaubt.");
        return null;
      }

      const maxBytes = planLimits[plan].maxFileSizeBytes;
      if (file.size > maxBytes) {
        toast.error(
          `Datei ist zu groß (max. ${Math.round(maxBytes / 1024 / 1024)} MB).`
        );
        return null;
      }

      const rendererType = detectRenderer(file.name, file.type);
      const title = stripExtension(file.name);

      if (isTextBasedRenderer(rendererType)) {
        const text = await file.text();
        if (!text.trim()) {
          toast.error("Die Datei ist leer.");
          return null;
        }
        if (/\u0000/.test(text)) {
          toast.error("Binärdatei kann nicht als Text gelesen werden.");
          return null;
        }
        return {
          rendererType,
          title,
          sourceFilename: file.name,
          markdownContent: text,
          fileId: null,
          previewUrl: null,
          mimeType: file.type || null,
          fileSize: file.size,
        };
      }

      setUploading(true);
      try {
        const body = new FormData();
        body.append("file", file);
        const res = await fetch("/api/v1/uploads", { method: "POST", body });
        const json = await res.json();
        if (!res.ok) {
          toast.error(json?.error?.message ?? "Upload fehlgeschlagen");
          return null;
        }
        const data = json.data ?? json;
        return {
          rendererType: data.file.rendererType as RendererType,
          title,
          sourceFilename: data.file.filename ?? file.name,
          markdownContent: data.content ?? "",
          fileId: data.file.id,
          previewUrl: data.previewUrl ?? null,
          mimeType: data.file.mimeType ?? file.type ?? null,
          fileSize: data.file.size ?? file.size,
        };
      } catch {
        toast.error("Upload fehlgeschlagen");
        return null;
      } finally {
        setUploading(false);
      }
    },
    [plan]
  );

  return { pickFile, uploading };
}

function stripExtension(name: string): string {
  return name.replace(/\.[^.]+$/, "") || name;
}
