# Implementation Plan — BreatheWise AI

## Project Rule

Build one phase at a time.

Do not start the next phase until the current phase passes its verification checks. Before coding, list assumptions and the files you expect to create or modify. After each phase, update `TRD.md`, `APP_FLOW.md`, and `TESTING.md` if a decision or behavior changed.

## Current Phase: Phase F — Daily Setup and Fixed Impact (Complete in working tree)

Dependencies: Phase R and Phase 1.

Assumptions:

- No user accounts are added; `spaceType`, `groupSize`, and `setupComplete` live in the existing session-scoped settings.
- Open-Meteo remains the live data source; missing PM2.5 uses a labeled fixed AQI-breakpoint proxy.
- AI is advisory only and cannot originate impact numbers.

Files created or modified:

- `src/types/breathewise.ts`, `src/lib/validation.ts`, `src/lib/demo-data.ts`, `src/lib/store.ts`
- `src/lib/impact-engine.ts`, `src/lib/__tests__/breathewise.test.ts`
- `src/app/api/air-quality/route.ts`, `src/app/api/chat/route.ts`
- `src/lib/ai-assistant.ts`, `src/components/BreatheWiseProvider.tsx`
- `src/components/AirPlanSetupCard.tsx`, `src/components/DailyRecommendations.tsx`
- `src/app/page.tsx`, `src/app/settings/page.tsx`
- `src/components/LocationSelector.tsx`
- `TRD.md`, `APP_FLOW.md`, `TESTING.md`, `README.md`

Tasks completed:

- Fixed the former theme typing and set-state-in-effect blockers.
- Added `spaceType`, `groupSize`, and `setupComplete` to settings validation, defaults, persistence merging, dashboard setup, and settings page.
- Built six deterministic impact recommendations with formulas, assumptions, official sources, and data-mode labels.
- Returned recommendations from `/api/air-quality` and exposed them through `BreatheWiseProvider`.
- Grounded Gemini, OpenAI, and fallback AI answers in fixed results with explicit no-recalculation rules.
- Added tests for recommendation shape, fixed factors, and AI grounding.

Deliverable:

- A user can set up a location and group, see plain-language current AQI meaning, read six visible-impact actions, and ask AI to explain the fixed plan.

Verify:

- `npm run typecheck` passes.
- `npm run lint` passes.
- `npm test` passes with 29 tests.
- `npm run build` passes.
- `git status --short` shows only intended changes.

Next phase:

- Phase G: confirm production deployment and complete manual mobile/desktop verification before claiming release readiness.

## Phase 0 — Project Setup

Dependencies: none.

Tasks:

- Maintain the Next.js 16 App Router + TypeScript + Tailwind 4 foundation.
- Keep the exact dependency versions recorded in `TRD.md`.
- Keep `.env.example` aligned with the code and never commit `.env.local`.
- Keep `README.md`, `DEMO_SCRIPT.md`, and the four project docs in sync.

Deliverable:

- A fresh install can run `npm install`, `npm run dev`, and all verification scripts.

Verify:

- App starts at `http://localhost:3000`.
- No secrets are present in committed files.

## Phase 1 — Session, Data Foundation, and Shell

Dependencies: Phase 0 and Phase R.

Tasks:

- Keep `BreatheWiseProvider` as the single source for settings, active city, air quality, alerts, loading, and errors.
- Keep the signed session cookie and proxy trust marker as the anonymous identity boundary.
- Keep `AppShell` navigation usable on desktop sidebar and mobile drawer.
- Keep `LocationSelector`, alerts bell, theme toggle, refresh, and data-mode controls functional.
- Keep `apiFetch` and `PrefetchLink` behavior consistent.

Deliverable:

- A user can move between every primary page and see consistent global state.

Verify:

- All primary routes open.
- City selection refreshes data.
- Forged session headers do not select another user's data.
- Mobile drawer opens and closes.

## Phase 2 — Dashboard, Alerts, and Location

Dependencies: Phase 1.

Tasks:

- Keep `/` displaying current AQI, categories, pollutants, weather, charts, and feature links.
- Keep server-evaluated alerts and home alert strip.
- Keep city pills, debounced geocoding, geolocation, prefetching, and retry states.
- Preserve demo/degraded labeling and `N/A` behavior.

Deliverable:

- The user can understand current air conditions and receive in-app advisories.

Verify:

- Live, demo, and degraded modes are visibly distinct.
- Null pollutants render `N/A`.
- Alert thresholds from settings change advisories.
- No horizontal overflow at 320 px.

## Phase 3 — AI Assistant

Dependencies: Phase 2.

Tasks:

- Keep `/assistant` grounded in active city, AQI, data mode, and planning threshold.
- Keep current-question-only AI requests, server-side keys, output validation, and inert rendering.
- Keep suggested questions, custom input, history cap, clear action, provider label, and error states.

Deliverable:

- The user can ask contextual questions and recover from failures safely.

Verify:

- Keys are not present in client bundles.
- Chat history is capped at 40 messages.
- AI failure shows a usable inline error; the user may need to retype or retry.
- Prompt-injection-style output is rejected or rendered inertly.

## Phase 4 — Cleaner Day and Indoor Advisor

Dependencies: Phase 2.

Tasks:

- Keep `/cleaner-day` generating schedules from sensitivity, commute, budget, and activity inputs, preferring future forecast hours.
- Make planned-activity toggles materially affect output, or remove labels that imply unsupported behavior.
- Keep `/indoor` filters, outdoor baseline, HEPA/MERV-13, and source-control references.
- Keep non-medical disclaimers visible.

Deliverable:

- The user gets practical, budget-aware actions with honest caveats.

Verify:

- Generated schedule prefers future hours and falls back safely when none are available.
- Free, balanced, and advanced budgets produce different recommendations where appropriate.
- Missing data renders safely.

## Phase 5 — Live Air Map

Dependencies: Phase 2.

Tasks:

- Keep `/map` Leaflet map, layer selectors, marker popups, and node table.
- Keep `Active City` and `Global Hubs` modes.
- Keep source labels for model grid, official station, and demo sample station.
- Improve the zero-local-station empty state.

Deliverable:

- The user can compare spatial readings without confusing demo stations with live sensors.

Verify:

- Map loads dynamically.
- Global mode loading and error states work.
- All marker values include source and timestamp.
- Official stations appear only with `WAQI_API_TOKEN`.

## Phase 6 — Impact Calculator

Dependencies: Phase 1.

Tasks:

- Keep `/calculator` sliders, formulas, citations, save plan, and What-If scenarios.
- Keep load defaults when saved data cannot be read.
- Keep transient success/error notices.

Deliverable:

- The user can estimate and save weekly environmental impact.

Verify:

- Saved frequencies survive refresh.
- Sliders cannot exceed documented maximums.
- Unknown action IDs are dropped by the server.
- Scenario adoption percentage changes results.

## Phase 7 — Community Network and Persistence

Dependencies: Phases 1 and 2.

Tasks:

- Keep `/community` observation submission, upvotes, challenges, and action logging.
- Keep coordinate-like text redaction locally and on remote rows.
- Keep Supabase RLS and local JSON fallback behavior.
- Add explicit empty states for zero observations or challenges.

Deliverable:

- The user can participate without publishing precise location or private data.

Verify:

- Anon users cannot read private tables.
- Observations cap at 50 locally.
- Challenge action logs cap at 10 per challenge per session.
- Coordinate-like text is redacted before display.

## Phase 8 — Settings, Legal, Presentation, and Docs

Dependencies: Phases 1–7.

Tasks:

- Keep `/settings` preferences, alert thresholds, theme/demo toggles, and validation.
- Keep `/legal` disclosures and replace the DMCA agent placeholder before commercial launch.
- Keep `/presentation` CTAs aligned with real features.
- Keep all four project docs current.

Deliverable:

- Product behavior, disclosures, and documentation agree.

Verify:

- Settings persist after refresh.
- Legal footer link works on mobile and desktop.
- Presentation CTAs open the promised pages.
- Documentation contains no stale claims such as email/SMS/push alerts.

## Phase 9 — Production Readiness

Dependencies: Phases R and 0–8.

Tasks:

- Run full `TESTING.md` checklist.
- Run `npm audit --audit-level=moderate`.
- Verify security headers and CORS behavior.
- Verify preview gating and session cookies.
- Deploy only after local checks pass.
- Confirm the production alias points to the intended deployment.

Deliverable:

- A release candidate with verified checks and no known release blockers.

Verify:

- All four local scripts pass.
- No moderate or higher audit findings.
- Home, settings, and legal return 200 in production.
- The served deployment matches the intended commit/deployment.

## Out of Scope for V1

- User accounts, passwords, password reset, and email verification.
- Email, SMS, or push notifications.
- Subscriptions, payments, and billing.
- File uploads and user-generated HTML.
- Native mobile apps.
- Custom domains.
- Advanced portfolio-style themes.
- Webhooks, GraphQL, WebSockets, and analytics/session replay.
- Medical diagnosis, treatment plans, or emergency guidance.
- Supabase service-role keys in client code.
