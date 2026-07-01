import { UploadForm } from "@/components/upload-form";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-12 px-6 py-20">
      <header className="flex flex-col items-center gap-3 text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-zinc-50">RecruitRAG</h1>
        <p className="max-w-md text-balance text-zinc-400">
          AI resume-to-job-description matching powered by retrieval-augmented analysis.
        </p>
      </header>

      <UploadForm />
    </main>
  );
}
