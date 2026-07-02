"use client";

import { useTransition } from "react";
import { setRoleAction, setWorkspaceAction } from "@/lib/actions";

// Mock tenancy control (Phase 14): pick the active workspace and simulate the
// current user's role. Both persist via cookies and revalidate every view.
export function WorkspaceSwitcher({
  workspaces,
  activeWorkspaceId,
  activeRole,
  roles,
}: {
  workspaces: { id: string; name: string }[];
  activeWorkspaceId: string;
  activeRole: string;
  roles: string[];
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2">
      <select
        value={activeWorkspaceId}
        disabled={isPending}
        onChange={(event) => {
          const value = event.target.value;
          startTransition(() => {
            void setWorkspaceAction(value);
          });
        }}
        aria-label="Active workspace"
        className="max-w-[11rem] truncate rounded-lg border border-zinc-800 bg-zinc-950/60 px-2 py-1 text-xs text-zinc-200 outline-none focus:border-cyan-500/40 disabled:opacity-50"
      >
        {workspaces.map((workspace) => (
          <option key={workspace.id} value={workspace.id}>
            {workspace.name}
          </option>
        ))}
      </select>
      <select
        value={activeRole}
        disabled={isPending}
        onChange={(event) => {
          const value = event.target.value;
          startTransition(() => {
            void setRoleAction(value);
          });
        }}
        aria-label="Active role"
        className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-2 py-1 text-xs text-teal-300 outline-none focus:border-teal-500/40 disabled:opacity-50"
      >
        {roles.map((role) => (
          <option key={role} value={role}>
            {role}
          </option>
        ))}
      </select>
    </div>
  );
}
