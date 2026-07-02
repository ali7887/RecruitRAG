-- Phase 16: workspace-scoped audit log. Additive and idempotent — safe to run
-- once on an existing database. Fresh databases get this via `npm run db:push`.

CREATE TABLE IF NOT EXISTS audit_logs (
  id text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  actor_role text NOT NULL,
  action text NOT NULL,
  target_id text,
  target_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_workspace_created_idx
  ON audit_logs (workspace_id, created_at DESC);
