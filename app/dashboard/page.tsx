import { DashboardCharts } from "@/components/dashboard-charts";
import { getDashboardData } from "@/lib/analytics";
import { getWorkspaceContext } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { workspaceId } = await getWorkspaceContext();
  const data = await getDashboardData(workspaceId);

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <div className="flex flex-col gap-8">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
            Recruitment Insights
          </h1>
          <p className="text-sm text-zinc-400">
            Aggregate scoring, skill coverage, and pipeline health across all analyses.
          </p>
        </header>

        <DashboardCharts data={data} />
      </div>
    </main>
  );
}
