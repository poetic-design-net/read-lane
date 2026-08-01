export const VISIBILITIES = ["public", "unlisted", "password"] as const;
export type Visibility = (typeof VISIBILITIES)[number];

export const THEMES = ["light", "dark", "system"] as const;
export type Theme = (typeof THEMES)[number];

export const CONTENT_WIDTHS = ["narrow", "normal", "wide"] as const;
export type ContentWidth = (typeof CONTENT_WIDTHS)[number];

export const FONT_STYLES = ["sans", "serif"] as const;
export type FontStyle = (typeof FONT_STYLES)[number];

export const DOCUMENT_STATUSES = ["draft", "published", "archived"] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export const VERSION_SOURCES = ["web", "cli", "api"] as const;
export type VersionSource = (typeof VERSION_SOURCES)[number];

export const EXPIRY_PRESETS = [
  "never",
  "24h",
  "7d",
  "30d",
  "custom",
] as const;
export type ExpiryPreset = (typeof EXPIRY_PRESETS)[number];

export type RendererType =
  | "markdown"
  | "text"
  | "code"
  | "csv"
  | "pdf"
  | "html"
  | "image"
  | "docx";

/** Safe public view of a document (no secrets). */
export interface PublicDocument {
  publicId: string;
  title: string;
  description: string | null;
  markdownContent: string;
  visibility: Visibility;
  status: DocumentStatus;
  theme: Theme;
  contentWidth: ContentWidth;
  fontStyle: FontStyle;
  showTableOfContents: boolean;
  showCodeLineNumbers: boolean;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date | null;
  isPasswordProtected: boolean;
  version: number;
  rendererType: RendererType;
  sourceFilename: string | null;
  fileExtension: string | null;
  allowDownload: boolean;
}

export interface ManageableDocument extends PublicDocument {
  hasPassword: boolean;
  projectId: string | null;
  sourcePath: string | null;
  sourceFilename: string | null;
  slug: string | null;
  mimeType: string | null;
  fileSize: number | null;
}

export interface PublishResult {
  publicId: string;
  shareUrl: string;
  manageUrl: string;
  managementToken: string;
}

export interface DocumentDisplaySettings {
  theme: Theme;
  contentWidth: ContentWidth;
  fontStyle: FontStyle;
  showTableOfContents: boolean;
  showCodeLineNumbers: boolean;
}

export interface ProjectSummary {
  publicId: string;
  name: string;
  slug: string;
  description: string | null;
  documentCount: number;
  updatedAt: Date;
  archivedAt: Date | null;
  defaultVisibility: Visibility;
  defaultTheme: Theme;
  defaultContentWidth: ContentWidth;
  defaultFontStyle: FontStyle;
  /** False for projects shared with this user by someone else. */
  isOwner?: boolean;
}

export interface SafeDocumentListItem {
  publicId: string;
  title: string;
  description: string | null;
  visibility: Visibility;
  status: DocumentStatus;
  sourceFilename: string | null;
  sourcePath: string | null;
  lastSource: VersionSource;
  updatedAt: Date;
  lastCliSyncAt: Date | null;
  isPasswordProtected: boolean;
  version: number;
  slug: string | null;
  rendererType: RendererType;
  fileExtension: string | null;
}
