-- Phase 2b: enable pgvector for job/profile embeddings. Not something
-- drizzle-kit's schema diffing manages (extensions aren't part of the
-- table schema), so this is a hand-written migration run before the
-- generated migration that actually adds the `vector(1536)` columns.
CREATE EXTENSION IF NOT EXISTS vector;
