import { Disclosure } from "./ui";

const ITEMS: [string, string][] = [
  ["High intent is not incremental opportunity.", "Customers about to book anyway are the cheapest to convert and the least valuable to contact."],
  ["Agent-touched bookings are not incremental bookings.", "Only the gap between treatment and a randomised control counts; attributed totals overstate impact."],
  ["Projected GMV is not delivered GMV.", "GMV here is bookings times average order value. Cancellations, reschedules and no-shows are not modelled."],
  ["The holdout is not an experiment control.", "The holdout measures the whole channel over time; experiment controls measure one tactic against the current process."],
  ["Positive lift still fails above 10% cost to serve.", "A significant lift that costs more than 10% of incremental GMV is not scaled, and above 15% it is killed."],
  ["The score is a rule-based hypothesis.", "It is not a validated, predictive or machine-learned model. Points and weights are judgement calls to be tested."],
  ["Significance figures are approximate.", "Normal-approximation z-test and sample sizes, with no correction for three experiments or for checking results early."],
  ["The holdout here is small.", "With 60 leads it holds about 10: enough to show the mechanism, far too few to measure anything."],
  ["All data is synthetic.", "Leads come from a fixed-seed generator, and experiment inputs are editable assumptions, not observations."],
];

export function Limitations() {
  return (
    <Disclosure title="Assumptions and limitations" summary="What this prototype does not claim.">
      <ul className="grid max-w-[1000px] gap-x-10 gap-y-4 text-[15px] leading-relaxed md:grid-cols-2">
        {ITEMS.map(([h, b]) => (
          <li key={h}>
            <span className="font-semibold text-ink">{h}</span> <span className="text-ink-2">{b}</span>
          </li>
        ))}
      </ul>
    </Disclosure>
  );
}
