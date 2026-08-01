import { z } from "zod";
import { appConfig } from "@/lib/config";
import { isTextBasedRenderer } from "@/lib/documents/formats";
import {
  CONTENT_WIDTHS,
  DOCUMENT_STATUSES,
  EXPIRY_PRESETS,
  FONT_STYLES,
  THEMES,
  VISIBILITIES,
} from "@/types/document";

export const visibilitySchema = z.enum(VISIBILITIES);
export const themeSchema = z.enum(THEMES);
export const contentWidthSchema = z.enum(CONTENT_WIDTHS);
export const fontStyleSchema = z.enum(FONT_STYLES);
export const documentStatusSchema = z.enum(DOCUMENT_STATUSES);
export const expiryPresetSchema = z.enum(EXPIRY_PRESETS);

export const publishDocumentSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Titel ist erforderlich")
      .max(appConfig.limits.titleMax),
    description: z
      .string()
      .trim()
      .max(appConfig.limits.descriptionMax)
      .optional()
      .nullable(),
    // Binary documents (pdf, image) carry no text — content lives in storage.
    markdownContent: z
      .string()
      .max(appConfig.limits.markdownMax, "Dokument ist zu groß")
      .default(""),
    visibility: visibilitySchema.default("unlisted"),
    status: documentStatusSchema.default("published"),
    password: z
      .string()
      .min(appConfig.limits.passwordMin)
      .max(appConfig.limits.passwordMax)
      .optional()
      .nullable(),
    theme: themeSchema.default("system"),
    contentWidth: contentWidthSchema.default("normal"),
    fontStyle: fontStyleSchema.default("sans"),
    showTableOfContents: z.boolean().default(false),
    showCodeLineNumbers: z.boolean().default(false),
    expiryPreset: expiryPresetSchema.default("never"),
    customExpiryDate: z.string().optional().nullable(),
    projectId: z.string().optional().nullable(),
    sourcePath: z.string().optional().nullable(),
    sourceFilename: z.string().optional().nullable(),
    slug: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .max(80)
      .optional()
      .nullable(),
    /** Free tier: replace the single active document, keep share link */
    replaceActive: z.boolean().optional().default(false),
    rendererType: z
      .enum([
        "markdown",
        "text",
        "code",
        "csv",
        "pdf",
        "html",
        "image",
        "docx",
      ])
      .optional(),
    /** publicId of a file uploaded via POST /api/v1/uploads */
    fileId: z.string().optional().nullable(),
    allowDownload: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if (data.visibility === "password" && !data.password) {
      ctx.addIssue({
        code: "custom",
        path: ["password"],
        message: "Passwort ist bei passwortgeschützten Dokumenten erforderlich",
      });
    }
    const needsText =
      !data.rendererType || isTextBasedRenderer(data.rendererType);
    if (needsText && !data.markdownContent.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["markdownContent"],
        message: "Dokument darf nicht leer sein",
      });
    }
    if (!needsText && !data.fileId) {
      ctx.addIssue({
        code: "custom",
        path: ["fileId"],
        message: "Für dieses Format wird eine hochgeladene Datei benötigt",
      });
    }
  });

export type PublishDocumentInput = z.infer<typeof publishDocumentSchema>;

export const updateDocumentSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1)
    .max(appConfig.limits.titleMax)
    .optional(),
  description: z
    .string()
    .trim()
    .max(appConfig.limits.descriptionMax)
    .optional()
    .nullable(),
  markdownContent: z
    .string()
    .min(1)
    .max(appConfig.limits.markdownMax)
    .optional(),
  visibility: visibilitySchema.optional(),
  status: documentStatusSchema.optional(),
  password: z
    .string()
    .min(appConfig.limits.passwordMin)
    .max(appConfig.limits.passwordMax)
    .optional()
    .nullable(),
  clearPassword: z.boolean().optional(),
  theme: themeSchema.optional(),
  contentWidth: contentWidthSchema.optional(),
  fontStyle: fontStyleSchema.optional(),
  showTableOfContents: z.boolean().optional(),
  showCodeLineNumbers: z.boolean().optional(),
  allowDownload: z.boolean().optional(),
  expiryPreset: expiryPresetSchema.optional(),
  customExpiryDate: z.string().optional().nullable(),
  baseVersion: z.number().int().positive().optional(),
  force: z.boolean().optional(),
  sourcePath: z.string().optional().nullable(),
  sourceFilename: z.string().optional().nullable(),
  sourceChecksum: z.string().optional().nullable(),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(80)
    .optional()
    .nullable(),
});

export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;

export const unlockDocumentSchema = z.object({
  publicId: z.string().min(1),
  password: z.string().min(1).max(appConfig.limits.passwordMax),
});

export const authRegisterSchema = z.object({
  email: z.string().email().max(appConfig.limits.emailMax),
  password: z
    .string()
    .min(8, "Mindestens 8 Zeichen")
    .max(appConfig.limits.passwordMax),
  name: z.string().trim().max(100).optional(),
});

export const authLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const projectCreateSchema = z.object({
  name: z.string().trim().min(1).max(appConfig.limits.projectNameMax),
  description: z.string().trim().max(500).optional().nullable(),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(80)
    .optional(),
  defaultVisibility: visibilitySchema.optional(),
  defaultTheme: themeSchema.optional(),
  defaultContentWidth: contentWidthSchema.optional(),
  defaultFontStyle: fontStyleSchema.optional(),
});

export const projectUpdateSchema = projectCreateSchema.partial().extend({
  archived: z.boolean().optional(),
});

export const memberRoleSchema = z.enum(["editor", "viewer"]);

export const addMemberSchema = z.object({
  email: z.string().email().max(appConfig.limits.emailMax),
  role: memberRoleSchema.default("viewer"),
});

export const frontmatterSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  visibility: visibilitySchema.optional(),
  theme: themeSchema.optional(),
  width: contentWidthSchema.optional(),
  font: fontStyleSchema.optional(),
  toc: z.boolean().optional(),
  lineNumbers: z.boolean().optional(),
  published: z.boolean().optional(),
  slug: z.string().optional(),
  expiresAt: z.string().optional(),
});
