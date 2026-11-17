import { SectionHeading } from "./ui";

const ROWS: [string, string][] = [
  ["Cost to serve under 10%", "The cost guardrail is measured on incremental cost and incremental GMV, never on every booking an agent touched."],
  ["App conversion protected against the holdout", "A fixed lead-level holdout is never contacted, and each experiment carries an app-conversion guardrail against it."],
  ["Interaction quality maintained", "Every experiment has a quality guardrail with a minimum score; falling below it kills the test."],
  ["Bookings attributed at 1, 3 and 7 days", "Each experiment states its attribution windows, so a booking is credited the same way in every arm."],
  ["At least $40K GMV from team experiments (about AED 147K)", "The simulator shows incremental GMV per test and returns kill, iterate or scale, so only tests that add real GMV grow."],
  ["Agents only where the app cannot close", "The opportunity score weights app-failure likelihood at 65% and intent at 35%, so routine repeat bookings stay in the app."],
];

const STEPS: { title: string; body: string }[] = [
  {
    title: "Map lead sources and set the baseline",
    body: "Agree which drop-offs and requests count as leads, switch on the holdout, and record app conversion and booking rates for held-out leads.",
  },
  {
    title: "Launch the first experiments with kill rules agreed in advance",
    body: "Start with checkout recovery, callback speed and WhatsApp-first. Write down the cost, conversion and quality limits before any data arrives.",
  },
  {
    title: "Review in the weekly growth call",
    body: "Read each test on incremental bookings and cost to serve, then kill, iterate or scale. Move agent hours to whatever survives.",
  },
];

export function BriefMap() {
  return (
    <section aria-labelledby="brief-title" className="space-y-8">
      <SectionHeading id="brief-title" title="How this maps to the brief">
        Each requirement in the problem statement, and the part of the workbench that handles it.
      </SectionHeading>

      <table className="w-full border-y border-ink/80 text-left text-[15px]">
        <thead className="sr-only sm:not-sr-only">
          <tr className="text-[13px] text-muted">
            <th scope="col" className="w-[38%] py-3 pr-6 font-medium">Brief requirement</th>
            <th scope="col" className="py-3 font-medium">How the workbench handles it</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-rule">
          {ROWS.map(([req, how]) => (
            <tr key={req} className="flex flex-col py-3 sm:table-row sm:py-0">
              <th scope="row" className="py-0.5 pr-6 align-top font-semibold text-ink sm:py-4">
                {req}
              </th>
              <td className="max-w-[68ch] py-0.5 align-top leading-relaxed text-ink-2 sm:py-4">{how}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="pt-4">
        <h3 className="text-[22px] font-semibold text-ink">How I would use this in week one</h3>
        <ol className="mt-6 max-w-[760px]">
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative grid grid-cols-[36px_minmax(0,1fr)] gap-5 pb-8 last:pb-0">
              {i < STEPS.length - 1 ? <span className="absolute bottom-0 left-[17.5px] top-10 w-px bg-rule" aria-hidden /> : null}
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-ink bg-canvas text-[15px] font-semibold text-ink" aria-hidden>
                {i + 1}
              </span>
              <div className="pt-1">
                <h4 className="text-[17px] font-semibold leading-snug text-ink">{s.title}</h4>
                <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
