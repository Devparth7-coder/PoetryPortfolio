-- Full-text search + fuzzy matching support
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Immutable wrapper so unaccent can be used in a generated column
CREATE OR REPLACE FUNCTION immutable_unaccent(text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT AS $$ SELECT public.unaccent('public.unaccent', $1) $$;

ALTER TABLE works ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', immutable_unaccent(coalesce(title, ''))), 'A') ||
    setweight(to_tsvector('english', immutable_unaccent(coalesce(title, ''))), 'A') ||
    setweight(to_tsvector('english', immutable_unaccent(coalesce(excerpt, ''))), 'B') ||
    setweight(to_tsvector('english', immutable_unaccent(coalesce(body, ''))), 'C') ||
    setweight(to_tsvector('simple', immutable_unaccent(coalesce(body, ''))), 'D')
  ) STORED;

CREATE INDEX IF NOT EXISTS works_search_vector_idx ON works USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS works_title_trgm_idx ON works USING GIN (lower(title) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS import_items_title_trgm_idx ON import_items USING GIN (lower(title) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS collections_title_trgm_idx ON collections USING GIN (lower(title) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS tags_name_trgm_idx ON tags USING GIN (lower(name) gin_trgm_ops);
