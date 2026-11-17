import { AppShell } from "@/components/AppShell";
import { Limitations } from "@/components/Limitations";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header>
        <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 pt-5 sm:px-6 sm:pt-6 md:flex-row md:items-center md:justify-between md:gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-sm font-semibold text-zinc-900">Assisted Sales Experiment Workbench</h1>
            <span className="rounded-full bg-zinc-200/70 px-2.5 py-0.5 text-[11px] font-medium text-zinc-700">
              Synthetic data. Illustrative only.
            </span>
          </div>
          <p className="text-xs text-zinc-500 md:max-w-md md:text-right">
            A decision workbench for finding where human intervention creates incremental bookings, instead of paying agents to
            convert customers who would have booked anyway.
          </p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 space-y-4 px-4 pb-12 pt-8 sm:px-6 sm:pt-10">
        <AppShell />
        <div className="pt-4">
          <Limitations />
        </div>
      </main>

      <footer>
        <div className="mx-auto max-w-7xl px-4 pb-8 text-xs leading-relaxed text-zinc-400 sm:px-6">
          Concept prototype by Krish Hemani for a Mesa School of Business BSL application. Synthetic data. Not affiliated with or
          endorsed by any company.
        </div>
      </footer>
    </div>
  );
}
