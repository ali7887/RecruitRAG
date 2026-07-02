import { cookies } from "next/headers";

// L1 mock multi-tenancy (Phase 14). Active workspace + role are held in cookies;
// no real auth provider. Roles gate mutating actions and interactive UI.
export type WorkspaceRole = "Owner" | "Recruiter" | "Viewer";

export const WORKSPACE_ROLES: WorkspaceRole[] = ["Owner", "Recruiter", "Viewer"];

// Seeded demo workspaces (mirrored in lib/db/memory.ts).
export const DEMO_WORKSPACES = [
  { id: "ws-startup", name: "Tech Startup Hub" },
  { id: "ws-automotive", name: "Automotive Tech GmbH" },
] as const;

export const DEFAULT_WORKSPACE_ID = DEMO_WORKSPACES[0].id;
export const DEFAULT_ROLE: WorkspaceRole = "Owner";

export const WORKSPACE_COOKIE = "rr_workspace";
export const ROLE_COOKIE = "rr_role";

export interface WorkspaceContext {
  workspaceId: string;
  role: WorkspaceRole;
}

// Read the active workspace + role from cookies, with safe defaults.
export async function getWorkspaceContext(): Promise<WorkspaceContext> {
  const store = await cookies();
  const workspaceId = store.get(WORKSPACE_COOKIE)?.value || DEFAULT_WORKSPACE_ID;
  const roleValue = store.get(ROLE_COOKIE)?.value;
  const role = WORKSPACE_ROLES.includes(roleValue as WorkspaceRole)
    ? (roleValue as WorkspaceRole)
    : DEFAULT_ROLE;
  return { workspaceId, role };
}

// Owner + Recruiter may create/edit; Viewer is read-only.
export function canWrite(role: WorkspaceRole): boolean {
  return role === "Owner" || role === "Recruiter";
}

// Only Owner may perform destructive/settings actions.
export function canDelete(role: WorkspaceRole): boolean {
  return role === "Owner";
}
