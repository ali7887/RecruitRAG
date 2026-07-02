# Migration Guide — Live Postgres Deployment

RecruitRAG runs in two modes:

- **Demo / in-memory** (no `DATABASE_URL`): data is seeded per process, nothing to migrate.
- **Live Postgres** (`DATABASE_URL` set): schema is managed with Drizzle.

## Fresh database

```bash
export DATABASE_URL="postgres://…"
npm run db:push
```

`db:push` reads [`lib/db/schema.ts`](../lib/db/schema.ts) and creates every table
(`workspaces`, `projects`, `candidates`, `analyses`, `audit_logs`) with all
current columns and foreign keys. No manual SQL needed.

## Existing database (predates Phase 14)

An existing database has `projects`/`candidates` **without** a `workspace_id`.
Adding a `NOT NULL` foreign key to a populated table fails, so the migration is
staged. Apply [`drizzle/0001_phase14_15_workspaces.sql`](../drizzle/0001_phase14_15_workspaces.sql):

```bash
psql "$DATABASE_URL" -f drizzle/0001_phase14_15_workspaces.sql
```

Sequence (also inline in the SQL):

1. **Create `workspaces`** table.
2. **Insert a default workspace** (`ws-default` — "Default Startup Workspace") as
   the backfill target.
3. **Add `workspace_id` as NULLABLE** on `projects` and `candidates`.
4. **Backfill**: set every existing row's `workspace_id` to `ws-default`.
5. **Enforce `NOT NULL`** now that no row is orphaned.
6. **Add foreign keys** (`ON DELETE CASCADE`) to `workspaces.id`.
7. **Add the additive columns** from Phases 8/10/12/15
   (`status`, `notes`, briefing fields, `parsed_*`, `parsed_via_fallback`) with
   `ADD COLUMN IF NOT EXISTS`.

The whole script runs in a transaction, so a failure rolls back cleanly.

## Phase 16 — audit logs

The `audit_logs` table is part of the current schema, so `db:push` creates it on
fresh databases. For an existing database it is created by the additive migration
[`drizzle/0002_phase16_audit_logs.sql`](../drizzle/0002_phase16_audit_logs.sql):

```bash
psql "$DATABASE_URL" -f drizzle/0002_phase16_audit_logs.sql
```

## Notes

- Migrations are **forward-only** and intended to run once. Re-running the FK
  step will error because the constraint already exists — that is expected.
- No data is dropped or overwritten; every step is additive or a backfill.
