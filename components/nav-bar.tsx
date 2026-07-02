import Link from "next/link";

const LINKS = [
  { href: "/projects", label: "Projects" },
  { href: "/insights", label: "Portfolio" },
  { href: "/dashboard", label: "Insights" },
  { href: "/candidates", label: "Candidates" },
  { href: "/", label: "Analysis" },
];

export function NavBar() {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-900 px-6">
      <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
        <span className="size-2 rounded-full bg-emerald-400" />
        RecruitRAG
      </Link>
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
    </header>
  );
}
