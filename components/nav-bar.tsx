import Link from "next/link";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import { listWorkspaces } from "@/lib/db/repository";
import { getWorkspaceContext, WORKSPACE_ROLES } from "@/lib/workspace";

const LINKS = [
  { href: "/projects", label: "Projects" },
  { href: "/insights", label: "Portfolio" },
  { href: "/dashboard", label: "Insights" },
  { href: "/candidates", label: "Candidates" },
  { href: "/", label: "Analysis" },
];

export async function NavBar() {
  const [workspaces, context] = await Promise.all([listWorkspaces(), getWorkspaceContext()]);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-900 px-6">
      <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
        <span className="size-2 rounded-full bg-emerald-400" />
        RecruitRAG
      </Link>
      <div className="flex items-center gap-4">
        <nav className="flex items-center gap-1 text-sm">
          {LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="rounded-lg px-3 py-1.5 text-zinc-400 transition-colors hover:text-zinc-100"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <WorkspaceSwitcher
          workspaces={workspaces.map((workspace) => ({ id: workspace.id, name: workspace.name }))}
          activeWorkspaceId={context.workspaceId}
          activeRole={context.role}
          roles={WORKSPACE_ROLES}
        />
      </div>
    </header>
  );
}
