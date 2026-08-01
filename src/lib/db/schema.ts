import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const visibilityEnum = pgEnum("visibility", [
  "public",
  "unlisted",
  "password",
]);

export const themeEnum = pgEnum("theme", ["light", "dark", "system"]);

export const contentWidthEnum = pgEnum("content_width", [
  "narrow",
  "normal",
  "wide",
]);

export const fontStyleEnum = pgEnum("font_style", ["sans", "serif"]);

export const documentStatusEnum = pgEnum("document_status", [
  "draft",
  "published",
  "archived",
]);

export const versionSourceEnum = pgEnum("version_source", [
  "web",
  "cli",
  "api",
]);

export const memberRoleEnum = pgEnum("member_role", [
  "owner",
  "editor",
  "viewer",
]);

export const tokenScopeEnum = pgEnum("token_scope", [
  "full",
  "project_read",
  "project_write",
  "project_publish",
]);

export const planEnum = pgEnum("plan", ["free", "pro", "business"]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "trialing",
  "past_due",
  "canceled",
  "incomplete",
  "unpaid",
]);

export const rendererTypeEnum = pgEnum("renderer_type", [
  "markdown",
  "text",
  "code",
  "csv",
  "pdf",
  "html",
  "image",
  "docx",
]);

/* ─── Users ─────────────────────────────────────────────────────────────── */

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicId: text("public_id").unique(),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    name: text("name"),
    avatarUrl: text("avatar_url"),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    stripeCustomerId: text("stripe_customer_id").unique(),
    /** Cached effective plan for fast UI (source of truth: subscriptions). */
    plan: planEnum("plan").notNull().default("free"),
    /** Platform admin — unlimited plan features, bypasses Free limits. */
    isAdmin: boolean("is_admin").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("users_email_idx").on(t.email),
    index("users_public_id_idx").on(t.publicId),
  ]
);


/* ─── Subscriptions (Stripe) ────────────────────────────────────────────── */

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    plan: planEnum("plan").notNull().default("free"),
    status: subscriptionStatusEnum("status").notNull().default("active"),
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id").unique(),
    stripePriceId: text("stripe_price_id"),
    billingInterval: text("billing_interval"), // monthly | yearly
    currentPeriodStart: timestamp("current_period_start", {
      withTimezone: true,
    }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("subscriptions_user_id_idx").on(t.userId),
    index("subscriptions_stripe_sub_idx").on(t.stripeSubscriptionId),
  ]
);

export const stripeEvents = pgTable(
  "stripe_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    stripeEventId: text("stripe_event_id").notNull().unique(),
    eventType: text("event_type").notNull(),
    payloadHash: text("payload_hash"),
    status: text("status").notNull().default("pending"), // pending | processing | processed | failed
    processedAt: timestamp("processed_at", { withTimezone: true }),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("stripe_events_event_id_idx").on(t.stripeEventId)]
);


/* ─── Auth helpers ──────────────────────────────────────────────────────── */

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const magicLinkTokens = pgTable("magic_link_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* ─── Projects ──────────────────────────────────────────────────────────── */

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicId: text("public_id").notNull().unique(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    defaultVisibility: visibilityEnum("default_visibility")
      .notNull()
      .default("unlisted"),
    defaultTheme: themeEnum("default_theme").notNull().default("system"),
    defaultContentWidth: contentWidthEnum("default_content_width")
      .notNull()
      .default("normal"),
    defaultFontStyle: fontStyleEnum("default_font_style")
      .notNull()
      .default("sans"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("projects_owner_slug_idx").on(t.ownerId, t.slug),
    index("projects_public_id_idx").on(t.publicId),
    index("projects_owner_id_idx").on(t.ownerId),
  ]
);

export const projectMembers = pgTable(
  "project_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: memberRoleEnum("role").notNull().default("viewer"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("project_members_unique_idx").on(t.projectId, t.userId),
  ]
);

/* ─── CLI / API tokens ──────────────────────────────────────────────────── */

export const cliTokens = pgTable(
  "cli_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicId: text("public_id").notNull().unique(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    name: text("name").notNull().default("CLI"),
    deviceName: text("device_name"),
    operatingSystem: text("operating_system"),
    /** Optional project scope for CI tokens. */
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "cascade",
    }),
    scope: tokenScopeEnum("scope").notNull().default("full"),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("cli_tokens_user_id_idx").on(t.userId),
    index("cli_tokens_token_hash_idx").on(t.tokenHash),
  ]
);

/** Device-code flow for CLI login (browser confirmation). */
export const cliDeviceCodes = pgTable(
  "cli_device_codes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    deviceCodeHash: text("device_code_hash").notNull().unique(),
    userCode: text("user_code").notNull().unique(),
    deviceName: text("device_name"),
    operatingSystem: text("operating_system"),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    status: text("status").notNull().default("pending"), // pending | approved | denied | expired
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    /** Issued token public id once approved (plaintext token only returned once via poll). */
    issuedTokenPlain: text("issued_token_plain"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("cli_device_codes_user_code_idx").on(t.userCode)]
);

/* ─── Documents ─────────────────────────────────────────────────────────── */

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicId: text("public_id").notNull().unique(),
    /** Optional human-readable slug for nicer URLs within a project. */
    slug: text("slug"),
    /** bcrypt hash of management token — never store plaintext. */
    managementTokenHash: text("management_token_hash").notNull(),
    title: text("title").notNull().default("Untitled"),
    description: text("description"),
    /** Primary text content (markdown, code, csv, plain text, converted html). */
    markdownContent: text("markdown_content").notNull(),
    convertedContent: text("converted_content"),
    contentChecksum: text("content_checksum").notNull().default(""),
    version: integer("version").notNull().default(1),
    visibility: visibilityEnum("visibility").notNull().default("unlisted"),
    status: documentStatusEnum("status").notNull().default("published"),
    passwordHash: text("password_hash"),
    theme: themeEnum("theme").notNull().default("system"),
    contentWidth: contentWidthEnum("content_width").notNull().default("normal"),
    fontStyle: fontStyleEnum("font_style").notNull().default("sans"),
    showTableOfContents: boolean("show_table_of_contents")
      .notNull()
      .default(false),
    showCodeLineNumbers: boolean("show_code_line_numbers")
      .notNull()
      .default(false),
    allowDownload: boolean("allow_download").notNull().default(true),
    rendererType: rendererTypeEnum("renderer_type")
      .notNull()
      .default("markdown"),
    mimeType: text("mime_type"),
    fileExtension: text("file_extension"),
    fileSize: integer("file_size"),
    /** Object storage key for original binary (PDF, image, …). */
    originalFileKey: text("original_file_key"),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    sourcePath: text("source_path"),
    sourceFilename: text("source_filename"),
    sourceChecksum: text("source_checksum"),
    lastCliSyncAt: timestamp("last_cli_sync_at", { withTimezone: true }),
    lastSource: versionSourceEnum("last_source").notNull().default("web"),
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    updatedBy: uuid("updated_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (t) => [
    index("documents_public_id_idx").on(t.publicId),
    index("documents_project_id_idx").on(t.projectId),
    index("documents_status_idx").on(t.status),
    index("documents_deleted_at_idx").on(t.deletedAt),
    index("documents_created_by_idx").on(t.createdBy),
    index("documents_renderer_type_idx").on(t.rendererType),
  ]
);

export const documentVersions = pgTable(
  "document_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    markdownContent: text("markdown_content").notNull(),
    contentChecksum: text("content_checksum").notNull(),
    title: text("title"),
    source: versionSourceEnum("source").notNull().default("web"),
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    deviceName: text("device_name"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("document_versions_doc_version_idx").on(
      t.documentId,
      t.version
    ),
    index("document_versions_document_id_idx").on(t.documentId),
  ]
);

/* ─── Files (object storage metadata) ───────────────────────────────────── */

export const fileUploadStatusEnum = pgEnum("file_upload_status", [
  "pending",
  "uploaded",
  "processing",
  "ready",
  "failed",
  "deleted",
]);

export const fileScanStatusEnum = pgEnum("file_scan_status", [
  "pending",
  "clean",
  "rejected",
  "not_required",
]);

export const files = pgTable(
  "files",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicId: text("public_id").notNull().unique(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    documentId: uuid("document_id").references(() => documents.id, {
      onDelete: "set null",
    }),
    storageProvider: text("storage_provider").notNull().default("local"),
    storageKey: text("storage_key").notNull(),
    originalFilename: text("original_filename").notNull(),
    safeFilename: text("safe_filename").notNull(),
    mimeType: text("mime_type").notNull(),
    fileExtension: text("file_extension"),
    fileSize: integer("file_size").notNull().default(0),
    checksum: text("checksum"),
    uploadStatus: fileUploadStatusEnum("upload_status")
      .notNull()
      .default("pending"),
    scanStatus: fileScanStatusEnum("scan_status")
      .notNull()
      .default("not_required"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("files_owner_id_idx").on(t.ownerId),
    index("files_document_id_idx").on(t.documentId),
    index("files_storage_key_idx").on(t.storageKey),
  ]
);

/* ─── Audit logs ────────────────────────────────────────────────────────── */

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    documentId: uuid("document_id").references(() => documents.id, {
      onDelete: "set null",
    }),
    actorType: text("actor_type").notNull().default("user"),
    actorId: text("actor_id"),
    action: text("action").notNull(),
    metadata: text("metadata"),
    ipHash: text("ip_hash"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("audit_logs_user_id_idx").on(t.userId),
    index("audit_logs_action_idx").on(t.action),
    index("audit_logs_created_at_idx").on(t.createdAt),
  ]
);

/* ─── Processing jobs (heavy formats) ───────────────────────────────────── */

export const processingJobStatusEnum = pgEnum("processing_job_status", [
  "pending",
  "processing",
  "completed",
  "failed",
  "canceled",
]);

export const processingJobs = pgTable(
  "processing_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    type: text("type").notNull(),
    documentId: uuid("document_id").references(() => documents.id, {
      onDelete: "cascade",
    }),
    fileId: uuid("file_id").references(() => files.id, {
      onDelete: "cascade",
    }),
    status: processingJobStatusEnum("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(3),
    payload: text("payload"),
    errorMessage: text("error_message"),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("processing_jobs_status_idx").on(t.status),
    index("processing_jobs_document_id_idx").on(t.documentId),
  ]
);

/* ─── Email verification ────────────────────────────────────────────────── */

export const emailVerificationTokens = pgTable("email_verification_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* ─── Document access sessions (password unlock) ────────────────────────── */

export const documentAccessSessions = pgTable(
  "document_access_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    sessionTokenHash: text("session_token_hash").notNull().unique(),
    ipHash: text("ip_hash"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  },
  (t) => [index("doc_access_sessions_document_id_idx").on(t.documentId)]
);

/* ─── Idempotency keys ──────────────────────────────────────────────────── */

export const idempotencyKeys = pgTable(
  "idempotency_keys",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    keyHash: text("key_hash").notNull(),
    operation: text("operation").notNull(),
    responseJson: text("response_json"),
    statusCode: integer("status_code"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("idempotency_user_key_op_idx").on(
      t.userId,
      t.keyHash,
      t.operation
    ),
  ]
);

/* ─── Free-document selection for downgrade ─────────────────────────────── */

export const freeDocumentSelections = pgTable(
  "free_document_selections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" })
      .unique(),
    documentPublicId: text("document_public_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  }
);

/* ─── Custom domains & branding (Business) ──────────────────────────────── */

export const customDomains = pgTable(
  "custom_domains",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicId: text("public_id").notNull().unique(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Null means the domain serves every document of this account. */
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "cascade",
    }),
    host: text("host").notNull().unique(),
    /** Expected value of the TXT record at _readlane-verify.<host>. */
    verificationToken: text("verification_token").notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    brandName: text("brand_name"),
    brandColor: text("brand_color"),
    brandLogoUrl: text("brand_logo_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("custom_domains_user_id_idx").on(t.userId),
    index("custom_domains_project_id_idx").on(t.projectId),
  ]
);

export type User = typeof users.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type CliToken = typeof cliTokens.$inferSelect;
export type DocumentVersion = typeof documentVersions.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type FileRecord = typeof files.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;

