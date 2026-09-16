/**
 * Relational content model for the Dev Parth Poetry Archive.
 *
 * Design notes
 * - `works` is the polymorphic content root (kind = POEM today; STORY/ESSAY/… later).
 *   The public product only exposes poems, but the schema is ready for extension (§54).
 * - Every meaningful edit writes a `work_versions` row. The ORIGINAL version is immutable.
 * - Provenance lives in `work_sources` (one work → many sources), never only in a string column.
 * - Full-text search uses a generated tsvector column + GIN index (see migration SQL).
 */
import {
  pgTable, pgEnum, text, varchar, integer, boolean, timestamp, jsonb, uuid, index, uniqueIndex, primaryKey, real,
} from "drizzle-orm/pg-core";
import { sql, relations } from "drizzle-orm";

// ---------- Enums ----------
export const workKind = pgEnum("work_kind", ["POEM", "STORY", "ESSAY", "JOURNAL", "TRANSLATION"]);
export const workStatus = pgEnum("work_status", ["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"]);
export const versionKind = pgEnum("version_kind", ["ORIGINAL", "EDITED", "PUBLISHED", "ARCHIVED", "SOURCE_VARIANT"]);
export const sourceKind = pgEnum("source_kind", ["MY_POETIC_SIDE", "POETRY_COM", "ANTHOLOGY", "MANUAL", "PDF", "MARKDOWN", "TXT", "CSV", "JSON", "HTML"]);
export const importStatus = pgEnum("import_status", ["PENDING", "PARSED", "REVIEW", "APPROVED", "REJECTED", "COMPLETED", "FAILED"]);
export const importItemStatus = pgEnum("import_item_status", ["NEW", "DUPLICATE_EXACT", "DUPLICATE_LIKELY", "CONFLICT", "LOW_CONFIDENCE", "APPROVED", "REJECTED", "MERGED", "IMPORTED", "SKIPPED"]);
export const adminRole = pgEnum("admin_role", ["OWNER", "EDITOR", "VIEWER"]);
export const metadataOrigin = pgEnum("metadata_origin", ["SOURCE", "EDITORIAL", "AI_SUGGESTED", "AI_APPROVED"]);
export const commentStatus = pgEnum("comment_status", ["PENDING", "APPROVED", "REJECTED", "SPAM"]);

// ---------- Author ----------
export const authors = pgTable("authors", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
  name: varchar("name", { length: 200 }).notNull(),
  penName: varchar("pen_name", { length: 200 }),
  bio: text("bio"),
  statement: text("statement"),
  links: jsonb("links").$type<{ label: string; url: string; kind: string }[]>().notNull().default([]),
  avatarMediaId: uuid("avatar_media_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------- Media ----------
export const media = pgTable("media", {
  id: uuid("id").primaryKey().defaultRandom(),
  kind: varchar("kind", { length: 30 }).notNull().default("image"),
  storageKey: text("storage_key").notNull(),
  url: text("url").notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  width: integer("width"),
  height: integer("height"),
  altText: text("alt_text"),
  caption: text("caption"),
  variants: jsonb("variants").$type<{ width: number; url: string; format: string }[]>().notNull().default([]),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  checksum: varchar("checksum", { length: 64 }),
  uploadedBy: uuid("uploaded_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("media_checksum_idx").on(t.checksum)]);

// ---------- Works (Poems) ----------
export const works = pgTable("works", {
  id: uuid("id").primaryKey().defaultRandom(),
  kind: workKind("kind").notNull().default("POEM"),
  authorId: uuid("author_id").notNull().references(() => authors.id),
  slug: varchar("slug", { length: 220 }).notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  excerpt: text("excerpt"),
  excerptOrigin: metadataOrigin("excerpt_origin").notNull().default("EDITORIAL"),
  language: varchar("language", { length: 12 }).notNull().default("en"),
  languageOrigin: metadataOrigin("language_origin").notNull().default("SOURCE"),
  status: workStatus("status").notNull().default("DRAFT"),
  featured: boolean("featured").notNull().default(false),
  trendingAtSource: boolean("trending_at_source").notNull().default(false),
  wordCount: integer("word_count").notNull().default(0),
  characterCount: integer("character_count").notNull().default(0),
  lineCount: integer("line_count").notNull().default(0),
  readingTimeSeconds: integer("reading_time_seconds").notNull().default(0),
  contentHash: varchar("content_hash", { length: 64 }).notNull(),
  normalizedHash: varchar("normalized_hash", { length: 64 }).notNull(),
  version: integer("version").notNull().default(1),
  coverMediaId: uuid("cover_media_id").references(() => media.id, { onDelete: "set null" }),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  canonicalUrl: text("canonical_url"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  /** Date the poem was written/published at the original source, when known. Never fabricated. */
  writtenAt: timestamp("written_at", { withTimezone: true }),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  publishAt: timestamp("publish_at", { withTimezone: true }),
  unpublishAt: timestamp("unpublish_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdBy: uuid("created_by"),
  updatedBy: uuid("updated_by"),
}, (t) => [
  uniqueIndex("works_slug_kind_uidx").on(t.kind, t.slug),
  index("works_status_idx").on(t.status),
  index("works_published_at_idx").on(t.publishedAt),
  index("works_language_idx").on(t.language),
  index("works_content_hash_idx").on(t.contentHash),
  index("works_normalized_hash_idx").on(t.normalizedHash),
  index("works_featured_idx").on(t.featured),
  index("works_status_published_idx").on(t.status, t.publishedAt),
  index("works_publish_at_idx").on(t.publishAt),
]);

export const workVersions = pgTable("work_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  workId: uuid("work_id").notNull().references(() => works.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  kind: versionKind("kind").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  language: varchar("language", { length: 12 }).notNull(),
  contentHash: varchar("content_hash", { length: 64 }).notNull(),
  sourceId: uuid("source_id"),
  changeNote: text("change_note"),
  snapshot: jsonb("snapshot").$type<Record<string, unknown>>().notNull().default({}),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("work_versions_work_version_uidx").on(t.workId, t.version),
  index("work_versions_work_idx").on(t.workId),
]);

export const workSources = pgTable("work_sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  workId: uuid("work_id").notNull().references(() => works.id, { onDelete: "cascade" }),
  source: sourceKind("source").notNull(),
  sourceUrl: text("source_url"),
  sourceId: varchar("source_id", { length: 120 }),
  sourceTitle: text("source_title"),
  sourcePublishedAt: timestamp("source_published_at", { withTimezone: true }),
  sourceCategories: jsonb("source_categories").$type<string[]>().notNull().default([]),
  sourceMetadata: jsonb("source_metadata").$type<Record<string, unknown>>().notNull().default({}),
  /** Hash of the body exactly as extracted from this source. */
  contentHash: varchar("content_hash", { length: 64 }).notNull(),
  isCanonical: boolean("is_canonical").notNull().default(false),
  rawSnapshotKey: text("raw_snapshot_key"),
  importItemId: uuid("import_item_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("work_sources_work_idx").on(t.workId),
  uniqueIndex("work_sources_source_sourceid_uidx").on(t.source, t.sourceId),
]);

// ---------- Tags & Collections ----------
export const tags = pgTable("tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  kind: varchar("kind", { length: 30 }).notNull().default("theme"), // theme | mood | form | source-genre
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const workTags = pgTable("work_tags", {
  workId: uuid("work_id").notNull().references(() => works.id, { onDelete: "cascade" }),
  tagId: uuid("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
  origin: metadataOrigin("origin").notNull().default("EDITORIAL"),
  approved: boolean("approved").notNull().default(true),
}, (t) => [primaryKey({ columns: [t.workId, t.tagId] }), index("work_tags_tag_idx").on(t.tagId)]);

export const collections = pgTable("collections", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  coverMediaId: uuid("cover_media_id").references(() => media.id, { onDelete: "set null" }),
  featuredWorkId: uuid("featured_work_id"),
  sortOrder: integer("sort_order").notNull().default(0),
  isPublished: boolean("is_published").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const collectionWorks = pgTable("collection_works", {
  collectionId: uuid("collection_id").notNull().references(() => collections.id, { onDelete: "cascade" }),
  workId: uuid("work_id").notNull().references(() => works.id, { onDelete: "cascade" }),
  position: integer("position").notNull().default(0),
  addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.collectionId, t.workId] }), index("collection_works_work_idx").on(t.workId)]);

// ---------- Engagement (privacy-conscious: no IPs, no fingerprints) ----------
export const workViews = pgTable("work_views", {
  id: uuid("id").primaryKey().defaultRandom(),
  workId: uuid("work_id").notNull().references(() => works.id, { onDelete: "cascade" }),
  day: varchar("day", { length: 10 }).notNull(), // YYYY-MM-DD bucket
  views: integer("views").notNull().default(0),
  completions: integer("completions").notNull().default(0),
}, (t) => [uniqueIndex("work_views_work_day_uidx").on(t.workId, t.day)]);

export const workFavorites = pgTable("work_favorites", {
  workId: uuid("work_id").notNull().references(() => works.id, { onDelete: "cascade" }),
  day: varchar("day", { length: 10 }).notNull(),
  count: integer("count").notNull().default(0),
}, (t) => [primaryKey({ columns: [t.workId, t.day] })]);

export const workShares = pgTable("work_shares", {
  workId: uuid("work_id").notNull().references(() => works.id, { onDelete: "cascade" }),
  channel: varchar("channel", { length: 30 }).notNull(),
  day: varchar("day", { length: 10 }).notNull(),
  count: integer("count").notNull().default(0),
}, (t) => [primaryKey({ columns: [t.workId, t.channel, t.day] })]);

export const workComments = pgTable("work_comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  workId: uuid("work_id").notNull().references(() => works.id, { onDelete: "cascade" }),
  authorName: varchar("author_name", { length: 120 }).notNull(),
  body: text("body").notNull(),
  status: commentStatus("status").notNull().default("PENDING"),
  reportedCount: integer("reported_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("work_comments_work_idx").on(t.workId)]);

export const searchQueries = pgTable("search_queries", {
  id: uuid("id").primaryKey().defaultRandom(),
  query: varchar("query", { length: 200 }).notNull(),
  resultCount: integer("result_count").notNull().default(0),
  durationMs: integer("duration_ms"),
  day: varchar("day", { length: 10 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("search_queries_day_idx").on(t.day)]);

// ---------- Import pipeline ----------
export const importJobs = pgTable("import_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  source: sourceKind("source").notNull(),
  status: importStatus("status").notNull().default("PENDING"),
  inputKind: varchar("input_kind", { length: 30 }).notNull(), // url | file | paste
  inputLabel: text("input_label"),
  inputUrl: text("input_url"),
  inputStorageKey: text("input_storage_key"),
  totals: jsonb("totals").$type<Record<string, number>>().notNull().default({}),
  report: jsonb("report").$type<Record<string, unknown>>().notNull().default({}),
  error: text("error"),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const importItems = pgTable("import_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  jobId: uuid("job_id").notNull().references(() => importJobs.id, { onDelete: "cascade" }),
  position: integer("position").notNull().default(0),
  status: importItemStatus("status").notNull().default("NEW"),
  title: text("title").notNull(),
  body: text("body").notNull(),
  language: varchar("language", { length: 12 }),
  detectedDate: timestamp("detected_date", { withTimezone: true }),
  sourceUrl: text("source_url"),
  sourceId: varchar("source_id", { length: 120 }),
  sourceCategories: jsonb("source_categories").$type<string[]>().notNull().default([]),
  trending: boolean("trending").notNull().default(false),
  contentHash: varchar("content_hash", { length: 64 }).notNull(),
  normalizedHash: varchar("normalized_hash", { length: 64 }).notNull(),
  confidence: real("confidence").notNull().default(1),
  flags: jsonb("flags").$type<string[]>().notNull().default([]),
  matchedWorkId: uuid("matched_work_id"),
  matchKind: varchar("match_kind", { length: 30 }), // exact | normalized | title+text | title
  similarity: real("similarity"),
  resolution: varchar("resolution", { length: 30 }), // create | merge-source | replace-canonical | keep-variant | skip
  resultWorkId: uuid("result_work_id"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("import_items_job_idx").on(t.jobId), index("import_items_hash_idx").on(t.normalizedHash)]);

// ---------- Admin / security ----------
export const adminUsers = pgTable("admin_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 254 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  passwordHash: text("password_hash").notNull(),
  role: adminRole("role").notNull().default("EDITOR"),
  isActive: boolean("is_active").notNull().default(true),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => adminUsers.id, { onDelete: "cascade" }),
  tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  userAgent: varchar("user_agent", { length: 300 }),
}, (t) => [index("sessions_user_idx").on(t.userId), index("sessions_expires_idx").on(t.expiresAt)]);

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorId: uuid("actor_id"),
  actorEmail: varchar("actor_email", { length: 254 }),
  action: varchar("action", { length: 80 }).notNull(),
  entityType: varchar("entity_type", { length: 40 }).notNull(),
  entityId: varchar("entity_id", { length: 80 }),
  summary: text("summary"),
  diff: jsonb("diff").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("audit_logs_entity_idx").on(t.entityType, t.entityId), index("audit_logs_created_idx").on(t.createdAt)]);

export const settings = pgTable("settings", {
  key: varchar("key", { length: 80 }).primaryKey(),
  value: jsonb("value").$type<unknown>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const loginAttempts = pgTable("login_attempts", {
  key: varchar("key", { length: 120 }).primaryKey(),
  count: integer("count").notNull().default(0),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull().defaultNow(),
});

// ---------- Relations ----------
export const worksRelations = relations(works, ({ one, many }) => ({
  author: one(authors, { fields: [works.authorId], references: [authors.id] }),
  cover: one(media, { fields: [works.coverMediaId], references: [media.id] }),
  versions: many(workVersions),
  sources: many(workSources),
  tags: many(workTags),
  collections: many(collectionWorks),
}));
export const workVersionsRelations = relations(workVersions, ({ one }) => ({ work: one(works, { fields: [workVersions.workId], references: [works.id] }) }));
export const workSourcesRelations = relations(workSources, ({ one }) => ({ work: one(works, { fields: [workSources.workId], references: [works.id] }) }));
export const workTagsRelations = relations(workTags, ({ one }) => ({
  work: one(works, { fields: [workTags.workId], references: [works.id] }),
  tag: one(tags, { fields: [workTags.tagId], references: [tags.id] }),
}));
export const tagsRelations = relations(tags, ({ many }) => ({ works: many(workTags) }));
export const collectionsRelations = relations(collections, ({ many, one }) => ({
  works: many(collectionWorks),
  cover: one(media, { fields: [collections.coverMediaId], references: [media.id] }),
}));
export const collectionWorksRelations = relations(collectionWorks, ({ one }) => ({
  collection: one(collections, { fields: [collectionWorks.collectionId], references: [collections.id] }),
  work: one(works, { fields: [collectionWorks.workId], references: [works.id] }),
}));
export const importJobsRelations = relations(importJobs, ({ many }) => ({ items: many(importItems) }));
export const importItemsRelations = relations(importItems, ({ one }) => ({ job: one(importJobs, { fields: [importItems.jobId], references: [importJobs.id] }) }));

export const _sqlHelpers = { sql };
