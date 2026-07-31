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
  (t) => [index("users_email_idx").on(t.email)]
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
    stripeSubscriptionId: text("stripe_subscription_id").unique(),
    stripePriceId: text("stripe_price_id"),
    currentPeriodStart: timestamp("current_period_start", {
      withTimezone: true,
    }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
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
    processedAt: timestamp("processed_at", { withTimezone: true }),
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

export type User = typeof users.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type CliToken = typeof cliTokens.$inferSelect;
export type DocumentVersion = typeof documentVersions.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
