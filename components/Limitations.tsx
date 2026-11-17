import { Collapsible } from "./ui";

const ITEMS: [string, string][] = [
  ["High intent ≠ incremental opportunity.", "Customers who are about to book anyway are the cheapest to 'convert' and the least valuable to contact."],
  ["Assisted-attributed bookings ≠ incremental bookings.", "Only the gap between treatment and a randomised control counts; attributed totals overstate impact."],
  ["Projected GMV ≠ delivered GMV.", "GMV here is bookings × AOV. Cancellations, reschedules and no-shows are not modelled."],
  ["Lead-level holdout ≠ experiment control.", "The holdout measures the whole channel over time; experiment controls measure one tactic against the current process."],
  ["Positive lift fails if cost to serve > 10%.", "A significant lift that costs more than 10% of incremental GMV is not scaled; above 15% it is killed."],
  ["The score is a rule-based hypothesis.", "It is not a validated, predictive or machine-learned model. Points and weights are judgement calls to be tested."],
  ["Significance figures are approximate.", "Normal-approximation z-test and sample sizes; no correction for testing three experiments or for peeking at results early."],
  ["Small holdout here.", "With 60 leads the holdout is about 10 leads: enough to show the mechanism, far too few to measure anything."],
  ["All data is synthetic.", "Leads are generated with a fixed seed; experiment inputs are editable assumptions, not observations."],
];

export function Limitations() {
  return (
    <Collapsible title="Assumptions & limitations" subtitle="What this prototype does not claim">
      <ul className="grid gap-x-8 gap-y-3 text-sm md:grid-cols-2">
        {ITEMS.map(([h, b]) => (
          <li key={h}>
            <span className="font-medium text-zinc-900">{h}</span> <span className="text-zinc-600">{b}</span>
          </li>
        ))}
      </ul>
    </Collapsible>
  );
}
