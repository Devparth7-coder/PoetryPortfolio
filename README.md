# DEV PARTH — POETRY ARCHIVE

A production-grade personal poetry platform: a quiet, typography-led public reading site plus a private editorial CMS, built to hold every poem Dev Parth has published — imported from the original sources with exact text, dates and provenance preserved.

**Status: builds, type-checks, lints, and passes unit + integration + E2E tests. 158 real poems are imported (156 from My Poetic Side, 25 from Poetry.com, 151 matched against the 190-page anthology PDF). 46 items require manual review — nothing was guessed or invented (see [Import report](#import-report)).**

---

## 1. Architecture summary

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 16 (App Router) + React 19 + TypeScript (strict)** | Server components for SEO-critical poem pages, route handlers for the versioned API, ISR for cheap global caching. |
| Styling | **Tailwind CSS 4** + a small set of design tokens in `globals.css` | Utility classes for layout; CSS variables for the four themes (light / dark / sepia / system) so theme switching is instant and flash-free. |
| Type | Fraunces (display), Newsreader (body), Inter (UI) — self-hosted `woff2` | Editorial feel; no third-party font requests; CSP stays `font-src 'self'`. |
| Database | **PostgreSQL 14+** via **Drizzle ORM** + SQL migrations | Relational model, generated `tsvector` column + GIN index for full-text search, `pg_trgm` for fuzzy titles/tags. |
| Auth | Self-contained credential auth: bcrypt (cost 12), opaque DB-backed sessions, HTTP-only `SameSite=Lax` cookie, login rate-limit + lockout, RBAC (OWNER / EDITOR / VIEWER) enforced **server-side in every admin route** | Single-author site: no OAuth providers to configure, no external dependency. `src/proxy.ts` is only a fast redirect; the admin layout and each `/api/v1/admin/*` handler re-check the session. |
| Storage | Pluggable `Storage` interface: local disk (default) or any S3-compatible bucket (hand-rolled SigV4, no AWS SDK) | Cover images are optional; local mode works out of the box. |
| Images | `sharp`: rotate, strip EXIF, re-encode WebP, 480/960/1600 AVIF+WebP variants, checksum de-dupe | Privacy + performance. |
| Search | Postgres FTS (`websearch_to_tsquery`, ranked, highlighted) + trigram fallback; queries logged as anonymous aggregates | No LLM in the search path. |
| PDFs | Dependency-free PDF writer (`infrastructure/pdf/render.ts`) for single-poem export; print stylesheet for everything else | No headless browser needed in production. |
| OG images | `next/og` (satori) with the site fonts | Dynamic social cards per poem/collection. |
| PWA | Web manifest + service worker (offline shell, poems cached after first read) | Read on the train. |
| AI (optional) | OpenAI-compatible endpoint, off unless `AI_PROVIDER` + `AI_API_KEY` set. Suggest tags/excerpt, explain a poem, describe artwork. Deterministic fallbacks. Every output is labelled *AI-generated — requires approval* and **never writes to a poem**. | |
| Observability | Structured JSON logs (`infrastructure/logging`), audit log table, request logging in API handlers, health check at `/api/v1/session`. | |

Layering: `domain/` (pure functions: text preservation, hashing, similarity, language, parsers) → `application/` (services: poems, collections, search, import, media, analytics, ai) → `infrastructure/` (db, auth, storage, ratelimit, pdf, logging) → `app/` (routes, pages) + `components/`. Business logic never lives in UI components.

## 2. Data model (`src/infrastructure/db/schema.ts`, migrations in `drizzle/`)

```
authors ──< works ──< work_versions            (every save & every import creates a version; nothing is destroyed)
              │  ──< work_sources               (provenance: source, sourceId, URL, raw title/body, fetchedAt, importJob) UNIQUE(source, source_id)
              │  ──< work_tags >── tags         (kind: THEME | MOOD | FORM)
              │  ──< collection_works >── collections (ordered; featured work; cover media)
              │  ──< work_views / favorites / shares / comments (comments disabled by default)
              └── media (cover image; variants json)
import_jobs ──< import_items  (status NEW | DUPLICATE_EXACT | DUPLICATE_LIKELY | CONFLICT | LOW_CONFIDENCE | APPROVED | REJECTED | IMPORTED | MERGED;
                               matchedWorkId, matchKind, similarity, confidence, flags[], resolution, resultWorkId)
admin_users ──< sessions, audit_logs, login_attempts
settings (key/value json), search_queries (anonymous aggregates)
```

Key columns on `works`: `slug`, `title`, `body` (verbatim), `excerpt`, `language` (BCP-47: en / hi / hi-Latn / ur / und), `status` (DRAFT → REVIEW → PUBLISHED → ARCHIVED), `publish_at` / `unpublish_at` (scheduling), `written_at` (original date; **nullable, never guessed**), `published_at`, `content_hash` (SHA-256 of exact text) and `normalized_hash` (case/whitespace/punctuation-insensitive), `word_count`, `line_count`, `reading_time_seconds`, `trending_at_source`, `featured`, `search_vector` (generated), `deleted_at` (soft delete).

## 3. Folder structure

```
devparth-archive/
├─ drizzle/                     SQL migrations (0000_init, 0001_search)
├─ scripts/                     migrate | seed | reset | import/fetch-sources | import/run-import | import/report
├─ sources/                     Raw source snapshots (HTML, indexes, anthology PDF), fetch manifest, import report
├─ src/
│  ├─ app/                      Routes: /, /poems, /poems/[slug] (+/pdf), /archive[/year], /collections[/slug], /about, /random,
│  │                            /library, /book[/slug], /privacy, /terms, /offline, /og/*, /rss.xml, sitemap, robots, manifest
│  │  ├─ admin/                 dashboard, poems (list/new/[id]), collections, tags, import (+[id] review), media, analytics,
│  │  │                         data-quality, audit, settings, login
│  │  └─ api/v1/                public: poems, poems/[slug], search, collections, tags, random, events, session, auth/*
│  │                            admin: poems (+versions, restore), collections, tags, import (+items/auto/approve/reject),
│  │                            media, ai, settings, cron/publish
│  ├─ components/               site/ (header, footer, command palette, theme), reading/ (poem reader, controls, library),
│  │                            poem/ (lists), admin/ (shell, editor, managers, import review, media library)
│  ├─ domain/                   poem/{text,slug,language,similarity,types}, import/parsers/{my-poetic-side,poetry-com,anthology-pdf,generic}
│  ├─ application/              poems, collections, search, import, media, analytics, ai services
│  ├─ infrastructure/           db, auth (password, session), storage, ratelimit, logging, pdf
│  ├─ lib/                      site config, formatting, client prefs, API helpers, RSS, OG image
│  ├─ fonts/                    self-hosted woff2/ttf
│  └─ proxy.ts                  admin cookie gate (Next 16 “proxy”, formerly middleware)
├─ tests/ unit | integration | e2e | fixtures
├─ .github/workflows/ci.yml
└─ next.config.ts (security headers, CSP, redirects), drizzle.config.ts, vitest.config.ts, playwright.config.ts
```

## 4. Environment variables

See `.env.example`. Required: `DATABASE_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_SITE_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` (seed only). Optional: `STORAGE_DRIVER=s3` + `S3_*`, `AI_PROVIDER` + `AI_API_KEY` + `AI_BASE_URL` + `AI_MODEL`, `CRON_SECRET`, `REDIS_URL`, `LOG_LEVEL`, `DB_POOL_MAX`.

## 5. Local setup

```bash
npm ci
cp .env.example .env.local            # edit DATABASE_URL, AUTH_SECRET, ADMIN_*
npm run db:migrate                    # applies drizzle/*.sql
npm run db:seed                       # author, default collections/tags, first OWNER admin
npm run dev                           # http://localhost:3000  (admin: /admin/login)
```

## 6. Importing the poems

The committed `sources/` snapshot means the import is **offline and reproducible**:

```bash
npm run import:run -- --publish       # parses sources/raw/**, de-duplicates, versions, publishes; writes sources/reports/import-manifest.json
npm run import:report                 # human-readable summary + list of everything needing manual action
npm run import:fetch -- --only=pc     # (optional) politely re-fetch Poetry.com pages that previously returned a challenge page
```

Pipeline per item: parse → `preserveText` (CRLF→LF only; whitespace, punctuation, blank lines untouched) → language detection → `content_hash` / `normalized_hash` → match against existing works (exact hash → `DUPLICATE_EXACT`; normalized hash or same title with text similarity ≥ 0.97 → `DUPLICATE_LIKELY`; same title with text similarity below that → `CONFLICT`; extraction confidence < 0.6 or garbled non-Latin → `LOW_CONFIDENCE`) → `import_items`. **Only NEW and DUPLICATE_EXACT are ever auto-resolved** (create / add-as-source). Conflicts and low-confidence items wait in `/admin/import/[job]`, where the editor sees a line-level diff and picks: *add as source*, *keep as private variant*, *make canonical* (old text kept as a version), *create as new poem*, or *skip*.

The admin import UI accepts: a URL (My Poetic Side / Poetry.com / generic page), pasted text/Markdown (`---` separates poems), and uploaded HTML / TXT / MD / JSON / CSV / PDF files.

### Import report

`sources/reports/import-manifest.json` (regenerated on every run). Current state:

| Source | Indexed | Parsed | Created | Merged as source | Not retrievable / pending |
|---|---|---|---|---|---|
| My Poetic Side (user-51801) | 156 | 156 | 156 | — | 0 |
| Poetry.com (user 318517) | 66 | 25 | 2 | 23 | **41** pages returned an anti-bot challenge (HTTP 202). Not bypassed by design. Import them by saving the page HTML from your browser and uploading it at `/admin/import`, or pasting the text. Each is listed by title + URL in the manifest. |
| Anthology PDF (190 pages) | 156 extracted | — | 0 | 151 | **5** Devanagari poems whose text the PDF does not encode recoverably → flagged `LOW_CONFIDENCE`, held for review (the web versions of these 5 poems are already imported correctly from My Poetic Side). |

Note: the profile page now shows 157 poems while the listing pages expose 156 IDs; the difference is tracked in `sources/fetch-manifest.json`.

## 7. Testing

```bash
npm run typecheck && npm run lint
npm test                              # vitest: unit (text preservation, hashing, similarity, language, slugs, parsers on real fixtures, rate limiter)
                                      #         + integration (full import → dedupe → conflict → replace-canonical with versioning; needs DATABASE_URL)
npm run build && npm run start
npm run test:e2e                      # playwright, desktop + mobile: reading page, keyboard reading mode, theme, palette, API, admin auth
```

## 8. Deployment

Any Node 20 host with PostgreSQL (Vercel + Neon/Supabase, Fly.io, Railway, a VPS with PM2/systemd):

1. Provision Postgres; set env vars from §4 (generate `AUTH_SECRET` with `openssl rand -base64 48`; set `NEXT_PUBLIC_SITE_URL` to the real origin).
2. `npm ci && npm run db:migrate && npm run db:seed && npm run build`.
3. Start with `npm run start` (binds `0.0.0.0:3000`); put it behind TLS (Caddy / platform).
4. Import: run `npm run import:run -- --publish` once (or upload via `/admin/import`).
5. Scheduling: call `GET /api/v1/admin/cron/publish` with `Authorization: Bearer $CRON_SECRET` every 5–15 minutes (Vercel Cron / system cron) to publish/unpublish scheduled poems.
6. Media: for multi-instance or serverless deploys set `STORAGE_DRIVER=s3` (R2/S3/MinIO) so uploads are not on local disk.
7. Backups: nightly `pg_dump`; media bucket versioning. Poem text is only ever appended (versions), so point-in-time recovery is straightforward.

## 9. Security checklist

- [x] All admin pages and `/api/v1/admin/*` verify the session and role server-side (`requireAdmin`), independent of the edge redirect.
- [x] Passwords bcrypt(12); sessions are random 256-bit tokens stored hashed; cookie `HttpOnly; Secure (prod); SameSite=Lax`; logout revokes server-side.
- [x] Login rate-limited per IP and per account (`login_attempts`), constant-time comparison, generic error message.
- [x] Strict input validation with Zod on every route; UUID/slug format checks before DB access; poem text is stored verbatim and rendered as text (never `dangerouslySetInnerHTML`).
- [x] CSP (`default-src 'self'`, no remote scripts/fonts), `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options`; admin responses `no-store, noindex`.
- [x] Upload hardening: 10 MB cap, magic-byte MIME sniffing, re-encode through sharp (strips EXIF/GPS and any embedded payload), randomised storage keys.
- [x] Public API rate limits (in-memory; swap to Redis via `REDIS_URL` for multi-instance).
- [x] Audit log for every editorial action (create/update/publish/restore/import/settings/media/login).
- [x] Soft deletes + versions: no destructive operation on poem text; DELETE of media is OWNER-only.
- [x] No third-party analytics; view/completion counters are anonymous daily aggregates; comments off by default.
- [ ] Rotate `AUTH_SECRET`/admin password before go-live; enable DB TLS (`?sslmode=require`).

## 10. Production-readiness checklist

- [x] `next build` succeeds; static/ISR for public pages (poem pages revalidate 10 min), dynamic for admin/API.
- [x] Sitemap, robots, RSS (site + poems), canonical URLs, JSON-LD (`CreativeWork`/`Poem`, `Person`, breadcrumbs), dynamic OG images, `/poem/:slug` → `/poems/:slug` 301.
- [x] Accessibility: semantic landmarks, skip link, visible focus, keyboard reading mode (R / Esc / ← →), `prefers-reduced-motion` respected, `lang` attributes per poem, AA contrast in all themes, form labels/ARIA on palette and dialogs.
- [x] Performance: self-hosted fonts with `font-display: swap`, no client JS on poem text (server-rendered), AVIF/WebP images, immutable static assets.
- [x] PWA: manifest, icons (SVG + 192/512 PNG + apple-touch), offline page, SW caching read poems.
- [x] Error boundaries (`error.tsx`, `global-error.tsx`, `not-found.tsx`), structured logs, 404 for unknown slugs, 415 for PDF export of non-Latin poems (print path instead).
- [x] CI: lint → typecheck → migrate → seed → unit/integration → build → offline import → E2E, on a Postgres 17 service.
- [ ] Post-launch: hook logs to your provider, set `CRON_SECRET`, configure S3 if not single-node, review the 46 manual-action items in `/admin/import`.

## 11. Keyboard & reading features

`/` or `⌘K` command palette · `R` cinematic reading mode · `Esc` exit · `←`/`→` previous/next poem · `F` favourite · `P` print · reading controls for font size, line-height, measure, theme (light / dark / sepia / system) · progress bar + “continue reading” · book mode (`/book`) · random poem (`/random`) · PDF & print per poem · share (native share / copy link) · local-only library (favourites, bookmarks, history — never sent to a server).

## 12. One-click deploys

| Target | File | Notes |
|---|---|---|
| **Vercel** | `vercel.json` | Build runs `db:migrate` then `next build`; cron hits `/api/v1/admin/cron/publish` every 10 min (Vercel sends `Authorization: Bearer $CRON_SECRET` automatically). Use Neon/Supabase/Vercel Postgres for `DATABASE_URL` and **set `STORAGE_DRIVER=s3`** (Vercel's filesystem is read-only) — R2/S3 credentials in `S3_*`. Region `bom1` (Mumbai); change in `vercel.json` if needed. |
| **Render** | `render.yaml` + `Dockerfile` | Blueprint creates the web service, a Postgres 17 database, a 1 GB persistent disk for media, and a cron job for scheduled publishing. `AUTH_SECRET`/`CRON_SECRET` are generated; set `NEXT_PUBLIC_SITE_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` in the dashboard when prompted. Migrations + first-admin seed run on every boot (idempotent) via `docker-entrypoint.sh`. |
| **Docker / VPS** | `docker-compose.yml` | `cp .env.example .env.production`, edit, then `docker compose up -d --build`. Postgres + media volumes persist. Put Caddy/nginx in front for TLS. |

After the first deploy of any target: sign in at `/admin/login`, then either run `npm run import:run -- --publish` once against the production `DATABASE_URL` (from your machine) or upload the poems through `/admin/import`.
