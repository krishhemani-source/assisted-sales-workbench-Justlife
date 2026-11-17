import { AppShell } from "@/components/AppShell";
import { Limitations } from "@/components/Limitations";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">
              Assisted Sales Experiment Workbench
            </h1>
            <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
              Synthetic data. Illustrative only.
            </span>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-600 sm:text-base">
            A decision workbench for finding where human intervention creates incremental bookings, instead of paying agents to
            convert customers who would have booked anyway.
          </p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 space-y-5 px-4 py-6 sm:px-6">
        <AppShell />
        <Limitations />
      </main>

      <footer className="border-t border-zinc-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-5 text-xs leading-relaxed text-zinc-500 sm:px-6">
          Concept prototype by Krish Hemani for a Mesa School of Business BSL application. Synthetic data. Not affiliated with or
          endorsed by any company.
        </div>
      </footer>
    </div>
  );
}
