-- Phase 14/15 forward migration: multi-tenant workspaces + additive columns.
--
-- Run ONCE against an existing production database that predates Phase 14.
-- For a fresh database, `npm run db:push` applies the full current schema and
-- this file is unnecessary.
--
-- The order matters: add workspace_id as NULLABLE, backfill every existing row
-- to a default workspace, THEN enforce NOT NULL + foreign keys. This avoids the
-- constraint violation you'd hit adding a NOT NULL column to a populated table.

BEGIN;

-- 1. Tenant table.
CREATE TABLE IF NOT EXISTS workspaces (
  id text PRIMARY KEY,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Default workspace so existing (orphaned) data has a home.
INSERT INTO workspaces (id, name)
VALUES ('ws-default', 'Default Startup Workspace')
ON CONFLICT (id) DO NOTHING;

-- 3. Add tenant columns as NULLABLE first (no constraint yet).
ALTER TABLE projects   ADD COLUMN IF NOT EXISTS workspace_id text;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS workspace_id text;

-- 4. Backfill orphaned rows to the default workspace.
UPDATE projects   SET workspace_id = 'ws-default' WHERE workspace_id IS NULL;
UPDATE candidates SET workspace_id = 'ws-default' WHERE workspace_id IS NULL;

-- 5. Now that every row has a value, enforce NOT NULL.
ALTER TABLE projects   ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE candidates ALTER COLUMN workspace_id SET NOT NULL;

-- 6. Foreign keys with cascade delete (deleting a workspace purges its data).
ALTER TABLE projects
  ADD CONSTRAINT projects_workspace_id_fk
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE candidates
  ADD CONSTRAINT candidates_workspace_id_fk
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

-- 7. Additive nullable/defaulted columns from Phases 8/10/12/15 (idempotent).
ALTER TABLE analyses   ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'screening';
ALTER TABLE analyses   ADD COLUMN IF NOT EXISTS notes text NOT NULL DEFAULT '';
ALTER TABLE analyses   ADD COLUMN IF NOT EXISTS ai_summary text;
ALTER TABLE analyses   ADD COLUMN IF NOT EXISTS technical_summary text;
ALTER TABLE analyses   ADD COLUMN IF NOT EXISTS hiring_recommendation text;
ALTER TABLE analyses   ADD COLUMN IF NOT EXISTS interview_focus jsonb;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS parsed_headline text;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS parsed_skills jsonb;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS parsed_experience_years integer;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS parsed_work_summary text;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS parsed_via_fallback boolean;

COMMIT;
