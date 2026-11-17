# Assisted Sales Experiment Workbench

A decision workbench for finding where human intervention creates incremental bookings, instead of paying agents to convert customers who would have booked anyway.

Concept prototype. **Synthetic data. Illustrative only.** Fully client-side: no API calls, environment variables, backend, auth or database.

## Run locally

```bash
npm install
npm run dev          # http://localhost:3000
npm run test         # Vitest: scoring, holdout, experiments, stats, preset verdicts
npm run lint
npm run build && npm run start
```

Regenerate the committed dataset (deterministic, seeded mulberry32):

```bash
npm run generate:leads
```

## Structure

| Path | Purpose |
| --- | --- |
| `lib/config.ts` | Every tunable number: point tables, weights, bands, holdout %, verdict thresholds |
| `lib/scoring.ts` | Intent, app-failure, opportunity score, action, reason line |
| `lib/holdout.ts` | FNV-1a lead-level holdout (callback requests never eligible) |
| `lib/experiments.ts` | Incrementality maths, guardrails, verdicts, validation, presets |
| `lib/stats.ts` | Pooled two-proportion z-test, approximate sample size |
| `lib/templates.ts` | Suggested approach and draft call opener / WhatsApp message |
| `data/leads.json` | 60 committed synthetic leads |
| `scripts/generate-leads.ts` | Seeded generator and action-mix check |
| `components/*` | Lead Workbench, Experiment Simulator, shared UI |

## Key formulas

- Opportunity = Intent × w_intent + App-failure × w_appfail (weights sum to 1; defaults 0.35 / 0.65)
- Incremental bookings = Treatment N × (treatment rate − control rate)
- Incremental cost = Treatment N × (cost per lead_T − cost per lead_C)
- Cost to serve = incremental cost ÷ incremental GMV (only when incremental GMV > 0)

Not affiliated with or endorsed by any company.
