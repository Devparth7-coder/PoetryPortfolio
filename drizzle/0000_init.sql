CREATE TYPE "public"."admin_role" AS ENUM('OWNER', 'EDITOR', 'VIEWER');--> statement-breakpoint
CREATE TYPE "public"."comment_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'SPAM');--> statement-breakpoint
CREATE TYPE "public"."import_item_status" AS ENUM('NEW', 'DUPLICATE_EXACT', 'DUPLICATE_LIKELY', 'CONFLICT', 'LOW_CONFIDENCE', 'APPROVED', 'REJECTED', 'MERGED', 'IMPORTED', 'SKIPPED');--> statement-breakpoint
CREATE TYPE "public"."import_status" AS ENUM('PENDING', 'PARSED', 'REVIEW', 'APPROVED', 'REJECTED', 'COMPLETED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."metadata_origin" AS ENUM('SOURCE', 'EDITORIAL', 'AI_SUGGESTED', 'AI_APPROVED');--> statement-breakpoint
CREATE TYPE "public"."source_kind" AS ENUM('MY_POETIC_SIDE', 'POETRY_COM', 'ANTHOLOGY', 'MANUAL', 'PDF', 'MARKDOWN', 'TXT', 'CSV', 'JSON', 'HTML');--> statement-breakpoint
CREATE TYPE "public"."version_kind" AS ENUM('ORIGINAL', 'EDITED', 'PUBLISHED', 'ARCHIVED', 'SOURCE_VARIANT');--> statement-breakpoint
CREATE TYPE "public"."work_kind" AS ENUM('POEM', 'STORY', 'ESSAY', 'JOURNAL', 'TRANSLATION');--> statement-breakpoint
CREATE TYPE "public"."work_status" AS ENUM('DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED');--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(254) NOT NULL,
	"name" varchar(120) NOT NULL,
	"password_hash" text NOT NULL,
	"role" "admin_role" DEFAULT 'EDITOR' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"actor_email" varchar(254),
	"action" varchar(80) NOT NULL,
	"entity_type" varchar(40) NOT NULL,
	"entity_id" varchar(80),
	"summary" text,
	"diff" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "authors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(120) NOT NULL,
	"name" varchar(200) NOT NULL,
	"pen_name" varchar(200),
	"bio" text,
	"statement" text,
	"links" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"avatar_media_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "authors_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "collection_works" (
	"collection_id" uuid NOT NULL,
	"work_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "collection_works_collection_id_work_id_pk" PRIMARY KEY("collection_id","work_id")
);
--> statement-breakpoint
CREATE TABLE "collections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(120) NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"cover_media_id" uuid,
	"featured_work_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "collections_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "import_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"status" "import_item_status" DEFAULT 'NEW' NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"language" varchar(12),
	"detected_date" timestamp with time zone,
	"source_url" text,
	"source_id" varchar(120),
	"source_categories" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"trending" boolean DEFAULT false NOT NULL,
	"content_hash" varchar(64) NOT NULL,
	"normalized_hash" varchar(64) NOT NULL,
	"confidence" real DEFAULT 1 NOT NULL,
	"flags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"matched_work_id" uuid,
	"match_kind" varchar(30),
	"similarity" real,
	"resolution" varchar(30),
	"result_work_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" "source_kind" NOT NULL,
	"status" "import_status" DEFAULT 'PENDING' NOT NULL,
	"input_kind" varchar(30) NOT NULL,
	"input_label" text,
	"input_url" text,
	"input_storage_key" text,
	"totals" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"report" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"error" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "login_attempts" (
	"key" varchar(120) PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"window_start" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" varchar(30) DEFAULT 'image' NOT NULL,
	"storage_key" text NOT NULL,
	"url" text NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"size_bytes" integer NOT NULL,
	"width" integer,
	"height" integer,
	"alt_text" text,
	"caption" text,
	"variants" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"checksum" varchar(64),
	"uploaded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "search_queries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"query" varchar(200) NOT NULL,
	"result_count" integer DEFAULT 0 NOT NULL,
	"duration_ms" integer,
	"day" varchar(10) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_agent" varchar(300),
	CONSTRAINT "sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" varchar(80) PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(120) NOT NULL,
	"name" varchar(120) NOT NULL,
	"kind" varchar(30) DEFAULT 'theme' NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tags_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "work_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"work_id" uuid NOT NULL,
	"author_name" varchar(120) NOT NULL,
	"body" text NOT NULL,
	"status" "comment_status" DEFAULT 'PENDING' NOT NULL,
	"reported_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "work_favorites" (
	"work_id" uuid NOT NULL,
	"day" varchar(10) NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "work_favorites_work_id_day_pk" PRIMARY KEY("work_id","day")
);
--> statement-breakpoint
CREATE TABLE "work_shares" (
	"work_id" uuid NOT NULL,
	"channel" varchar(30) NOT NULL,
	"day" varchar(10) NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "work_shares_work_id_channel_day_pk" PRIMARY KEY("work_id","channel","day")
);
--> statement-breakpoint
CREATE TABLE "work_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"work_id" uuid NOT NULL,
	"source" "source_kind" NOT NULL,
	"source_url" text,
	"source_id" varchar(120),
	"source_title" text,
	"source_published_at" timestamp with time zone,
	"source_categories" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"source_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"content_hash" varchar(64) NOT NULL,
	"is_canonical" boolean DEFAULT false NOT NULL,
	"raw_snapshot_key" text,
	"import_item_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "work_tags" (
	"work_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"origin" "metadata_origin" DEFAULT 'EDITORIAL' NOT NULL,
	"approved" boolean DEFAULT true NOT NULL,
	CONSTRAINT "work_tags_work_id_tag_id_pk" PRIMARY KEY("work_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "work_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"work_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"kind" "version_kind" NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"language" varchar(12) NOT NULL,
	"content_hash" varchar(64) NOT NULL,
	"source_id" uuid,
	"change_note" text,
	"snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "work_views" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"work_id" uuid NOT NULL,
	"day" varchar(10) NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"completions" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "works" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "work_kind" DEFAULT 'POEM' NOT NULL,
	"author_id" uuid NOT NULL,
	"slug" varchar(220) NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"excerpt" text,
	"excerpt_origin" "metadata_origin" DEFAULT 'EDITORIAL' NOT NULL,
	"language" varchar(12) DEFAULT 'en' NOT NULL,
	"language_origin" "metadata_origin" DEFAULT 'SOURCE' NOT NULL,
	"status" "work_status" DEFAULT 'DRAFT' NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"trending_at_source" boolean DEFAULT false NOT NULL,
	"word_count" integer DEFAULT 0 NOT NULL,
	"character_count" integer DEFAULT 0 NOT NULL,
	"line_count" integer DEFAULT 0 NOT NULL,
	"reading_time_seconds" integer DEFAULT 0 NOT NULL,
	"content_hash" varchar(64) NOT NULL,
	"normalized_hash" varchar(64) NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"cover_media_id" uuid,
	"seo_title" text,
	"seo_description" text,
	"canonical_url" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"written_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"publish_at" timestamp with time zone,
	"unpublish_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "collection_works" ADD CONSTRAINT "collection_works_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_works" ADD CONSTRAINT "collection_works_work_id_works_id_fk" FOREIGN KEY ("work_id") REFERENCES "public"."works"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_cover_media_id_media_id_fk" FOREIGN KEY ("cover_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_items" ADD CONSTRAINT "import_items_job_id_import_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."import_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_admin_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."admin_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_comments" ADD CONSTRAINT "work_comments_work_id_works_id_fk" FOREIGN KEY ("work_id") REFERENCES "public"."works"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_favorites" ADD CONSTRAINT "work_favorites_work_id_works_id_fk" FOREIGN KEY ("work_id") REFERENCES "public"."works"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_shares" ADD CONSTRAINT "work_shares_work_id_works_id_fk" FOREIGN KEY ("work_id") REFERENCES "public"."works"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_sources" ADD CONSTRAINT "work_sources_work_id_works_id_fk" FOREIGN KEY ("work_id") REFERENCES "public"."works"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_tags" ADD CONSTRAINT "work_tags_work_id_works_id_fk" FOREIGN KEY ("work_id") REFERENCES "public"."works"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_tags" ADD CONSTRAINT "work_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_versions" ADD CONSTRAINT "work_versions_work_id_works_id_fk" FOREIGN KEY ("work_id") REFERENCES "public"."works"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_views" ADD CONSTRAINT "work_views_work_id_works_id_fk" FOREIGN KEY ("work_id") REFERENCES "public"."works"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "works" ADD CONSTRAINT "works_author_id_authors_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "works" ADD CONSTRAINT "works_cover_media_id_media_id_fk" FOREIGN KEY ("cover_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "collection_works_work_idx" ON "collection_works" USING btree ("work_id");--> statement-breakpoint
CREATE INDEX "import_items_job_idx" ON "import_items" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "import_items_hash_idx" ON "import_items" USING btree ("normalized_hash");--> statement-breakpoint
CREATE INDEX "media_checksum_idx" ON "media" USING btree ("checksum");--> statement-breakpoint
CREATE INDEX "search_queries_day_idx" ON "search_queries" USING btree ("day");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "work_comments_work_idx" ON "work_comments" USING btree ("work_id");--> statement-breakpoint
CREATE INDEX "work_sources_work_idx" ON "work_sources" USING btree ("work_id");--> statement-breakpoint
CREATE UNIQUE INDEX "work_sources_source_sourceid_uidx" ON "work_sources" USING btree ("source","source_id");--> statement-breakpoint
CREATE INDEX "work_tags_tag_idx" ON "work_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "work_versions_work_version_uidx" ON "work_versions" USING btree ("work_id","version");--> statement-breakpoint
CREATE INDEX "work_versions_work_idx" ON "work_versions" USING btree ("work_id");--> statement-breakpoint
CREATE UNIQUE INDEX "work_views_work_day_uidx" ON "work_views" USING btree ("work_id","day");--> statement-breakpoint
CREATE UNIQUE INDEX "works_slug_kind_uidx" ON "works" USING btree ("kind","slug");--> statement-breakpoint
CREATE INDEX "works_status_idx" ON "works" USING btree ("status");--> statement-breakpoint
CREATE INDEX "works_published_at_idx" ON "works" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "works_language_idx" ON "works" USING btree ("language");--> statement-breakpoint
CREATE INDEX "works_content_hash_idx" ON "works" USING btree ("content_hash");--> statement-breakpoint
CREATE INDEX "works_normalized_hash_idx" ON "works" USING btree ("normalized_hash");--> statement-breakpoint
CREATE INDEX "works_featured_idx" ON "works" USING btree ("featured");--> statement-breakpoint
CREATE INDEX "works_status_published_idx" ON "works" USING btree ("status","published_at");--> statement-breakpoint
CREATE INDEX "works_publish_at_idx" ON "works" USING btree ("publish_at");