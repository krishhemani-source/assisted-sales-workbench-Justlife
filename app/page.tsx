import { AppShell } from "@/components/AppShell";
import { BriefMap } from "@/components/BriefMap";
import { Limitations } from "@/components/Limitations";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto w-full max-w-[1120px] px-4 pt-6 sm:px-8 sm:pt-8">
        <div className="flex items-start gap-3 border-b border-rule pb-5">
          <svg viewBox="0 0 32 32" className="mt-0.5 h-7 w-7 shrink-0" aria-hidden>
            <rect width="32" height="32" rx="7" fill="#0E5C49" />
            <path d="M9.2 23 15 9h2l5.8 14h-2.6l-1.4-3.6h-5.6L11.8 23H9.2Zm4.8-5.8h4l-2-5.3-2 5.3Z" fill="#F3F5F4" />
          </svg>
          <div className="min-w-0">
            <h1 className="text-[15px] font-semibold leading-snug text-ink">Assisted Sales Experiment Workbench</h1>
            <p className="text-[13px] leading-snug text-muted">
              Built for Justlife&apos;s BSL problem statement on scaling assisted sales. Synthetic data.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1120px] flex-1 px-4 pb-16 pt-12 sm:px-8 sm:pt-16">
        <AppShell />
        <div className="mt-20 sm:mt-28">
          <BriefMap />
        </div>
        <div className="mt-16">
          <Limitations />
        </div>
      </main>

      <footer className="mx-auto w-full max-w-[1120px] px-4 pb-10 sm:px-8">
        <p className="border-t border-rule pt-5 text-[13px] leading-relaxed text-muted">
          Concept prototype by Krish Hemani for a Mesa School of Business BSL application. Synthetic data. Not affiliated with or
          endorsed by Justlife.
        </p>
      </footer>
    </div>
  );
}
