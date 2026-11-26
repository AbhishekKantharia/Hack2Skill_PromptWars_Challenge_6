# Technical Requirements Document — BreatheWise AI

## 1. Project Overview

Build a web application that turns urban air-quality readings and hourly forecasts into practical daily choices: whether to exercise outside, when to ventilate, what low-cost indoor steps to take, and how personal habits or neighborhood actions can help. The app must be honest about data source, uncertainty, and medical limits, and must work for different sensitivity profiles and budget tiers.

## 2. Technical Goals

- Provide a fast, responsive dashboard for current air quality, alerts, and hourly trends on mobile and desktop.
- Convert live or demo environmental data into personalized, budget-aware daily actions.
- Keep AI guidance grounded in the active city, current readings, and the user's sensitivity profile.
- Preserve data honesty: never present demo or degraded fallback values as live measurements, and show `N/A` for unavailable pollutants.
- Keep setup simple: no user accounts or passwords; preferences are session-scoped with an anonymous signed cookie.
- Make all external API calls server-side where secrets or rate limits matter.
- Keep the project understandable and verifiable for a beginner using an AI coding assistant.

## 3. Current Snapshot

- Workspace: `C:\Users\abhis\Downloads\Hack2Skill_PromptWars_Challenge_6`.
- Local git state at document creation: `bf720c5`, after reverting the two most recent feature commits.
- Current automated test suite: `src/lib/__tests__/breathewise.test.ts`, 27 tests, all passing.
- Current known blockers in the local snapshot:
  - `npm run typecheck` fails in `src/components/BreatheWiseProvider.tsx:226-227` because `theme` is inferred as `string` instead of `'light' | 'dark'`.
  - `npm run lint` fails in `src/components/LocationSelector.tsx:40:7` with `react-hooks/set-state-in-effect`.
  - `npm run build` must be re-run after those fixes; a deployment attempt from this exact commit failed type checking.
- Production alias currently serves the last ready deployment; the failed deploy did not replace it. Do not assume the alias reflects the current local commit.

## 4. Proposed Tech Stack

| Area | Choice |
| --- | --- |
| Framework | Next.js `16.4.6`, App Router |
| UI runtime | React / React DOM `19.3.1` |
| Language | TypeScript `6.0.3`, strict mode |
| Styling | Tailwind CSS `4.3.5` with `@tailwindcss/postcss` |
| Charts | Recharts `3.11.1` |
| Map | Leaflet `1.9.4` with `@types/leaflet` `1.9.23` |
| Icons | `lucide-react` `1.81.0` |
| Utilities | `clsx` `2.1.1`, `tailwind-merge` `3.7.1` |
| Database client | `@supabase/supabase-js` `2.119.2` |
| Testing | Vitest `5.1.2`, `@vitejs/plugin-react` `6.3.0` |
| Linting | ESLint `9.39.5`, `eslint-config-next` `16.4.6` |
| Hosting | Vercel, production alias `https://breathewise-ai-coral.vercel.app` |
| Database | Supabase Postgres with RLS; local JSON fallback at `data/local-store.json` |

Scripts in `package.json`: `dev`, `build`, `start`, `lint`, `typecheck`, `test`.

## 5. Functional Requirements

### Global shell and data flow

- The root layout must wrap pages in `BreatheWiseProvider` and `AppShell` (`src/app/layout.tsx`).
- The shell must provide navigation to all ten primary pages plus the `/legal` disclosure page.
- Desktop uses a sidebar; mobile uses a drawer menu. Both expose the same destinations.
- The header must expose city search, geolocation, a live/demo badge, refresh, alerts bell, and theme toggle.
- Selecting a city must update the active city and refresh air-quality data.
- `PrefetchLink` should warm route navigation and, where useful, related API GET requests on hover, focus, or touch.

### Dashboard (`/`)

- Show current US EPA AQI, category, dominant pollutant, guidance, and weather/dispersion context.
- Show six pollutant metric cards with standard units and WHO 2021 reference guidance.
- Show an hourly chart with pollutant and horizon filters supported by the available data (`aqi`, `pm25`, `pm10`, `no2`, `o3`).
- Show alerts from the server-evaluated alert engine.
- Provide quick city switching, `Plan My Cleaner Day`, `Ask AI About Today's Air`, and feature links to `/map`, `/indoor`, `/calculator`, and `/presentation`.
- In demo or degraded mode, label values clearly and explain the live-feed failure.

### AI Air Quality Assistant (`/assistant`)

- Accept suggested questions and custom questions up to 1000 characters.
- Send only the current question and minimal grounding context to the approved AI provider.
- Show optimistic user messages, a loading state, grounded answers with source/data-mode context, and recoverable errors.
- Persist the last 40 chat messages per session and allow clearing history.
- Show provider label: Gemini, OpenAI, or grounded fallback.
- Render AI output as inert text, never HTML.

### Live Air Map (`/map`)

- Support `Active City` and `Global Hubs` modes.
- Support layers `aqi`, `pm25`, `pm10`, `no2`, and `o3`.
- Render Leaflet markers with popups that include value, pollutants, source label, and timestamp.
- Show a `Visible Monitoring Nodes` table.
- Show loading, multi-city fetch, and error/no-nodes states.
- Official ground-station points appear only when `WAQI_API_TOKEN` is configured; otherwise the default source is the Open-Meteo CAMS model grid.

### My Cleaner Day (`/cleaner-day`)

- Let the user select sensitivity profile, commute mode, budget tier, and planned activities.
- Generate Morning, Afternoon, and Evening actions with explanation, expected benefit, cost, environmental impact, caveat, and forecast AQI.
- Use only future forecast hours and show `Daily Overview (LIVE/DEMO)` based on the actual data mode.
- Show an empty state before generation, a disabled/loading state during generation, and an inline error state on failure.

### Indoor Advisor (`/indoor`)

- Provide static, tiered guidance filterable by budget and topic.
- Show active-city outdoor context and adapt the baseline message at AQI `<= 75` versus higher.
- Explain HEPA/MERV-13 and source-control basics without medical claims.

### Impact Calculator (`/calculator`)

- Let the user adjust six weekly habit sliders and save a weekly plan.
- Estimate avoided CO₂e, fuel, and electricity with visible formulas and citations.
- Provide four What-If scenarios with adoption percentage.
- Show transient save success/error feedback and tolerate initial load failure by using defaults.

### Community Network (`/community`)

- Let the user submit a neighborhood observation with category, perceived level, and description.
- Let the user confirm/upvote observations, join challenges, and log challenge actions.
- Redact coordinate-like text from user submissions and remote rows before display.
- Clearly separate community observations from official/model telemetry.
- Cap local observations at 50 and challenge action logs at 10 per challenge per session.

### Learning Center (`/learn`)

- Provide static education on pollutants, WHO 2021 references, AQI bands, uncertainty, and medical boundaries.

### Settings (`/settings`)

- Let the user edit display name, sensitivity profile, budget tier, default city, units, theme, demo mode, alert thresholds, and alert toggles.
- Auto-save alert sliders after 400 ms while preserving ordering constraints.
- Persist theme in both local storage and server settings; optimistic changes must revert on failure.

### Presentation and Legal

- `/presentation` must provide judge-facing CTAs into the live dashboard, planner, assistant, and calculator.
- `/legal` must disclose age/COPPA posture, font delivery, no session replay or marketing email, no subscriptions, and the DMCA process.

## 6. Non-Functional Requirements

- Responsive from 320 px width upward with no horizontal overflow.
- Visible loading, empty, validation, degraded, and error states for every data-driven flow.
- Keyboard-reachable controls, labeled inputs, visible focus, logical headings, and errors not communicated by color alone.
- No API keys, service-role keys, or secrets in client-side source or browser bundles.
- Server-side validation with a 16 KB JSON body cap and allowlisted values.
- Security headers configured in `next.config.ts`, including CSP, HSTS, `nosniff`, frame denial, and permissions policy.
- In-memory rate limiting and AI daily spend caps are acceptable for the demo, but provider billing caps are the authoritative spend control.
- Data labels must distinguish live model data, official station data, and demo/sample data.
- Content must remain informational and non-medical; severe symptoms require qualified clinical advice.
- Keep the README, `DEMO_SCRIPT.md`, and the four project docs aligned with actual behavior.

## 7. Integrations

- Open-Meteo Geocoding API for city search (`src/lib/air-quality-service.ts`).
- Open-Meteo CAMS Air Quality API and Weather API for live readings and hourly series.
- WAQI API for optional ground-station enrichment; requires `WAQI_API_TOKEN`.
- Google Gemini or OpenAI for grounded assistant answers; never expose keys to the browser.
- Supabase Postgres for optional shared community observations; anon key only, RLS enabled.
- OpenStreetMap raster tiles through Leaflet for the map.
- Google Fonts through `next/font/google`; fonts are fetched at build time.
- No email, SMS, push notification, webhook, WebSocket, upload, payment, or analytics service in V1.

## 8. Data Requirements

- Domain types live in `src/types/breathewise.ts`.
- Session-scoped state includes settings, chat history, joined challenge IDs, upvoted observation IDs, challenge action counts, and saved calculator frequencies.
- Local persistence uses `data/local-store.json`, gitignored, with serialized writes and a read-only-filesystem fallback.
- Supabase schema lives in `supabase/schema.sql` with RLS on all seven tables.
- Personal tables are service-role-only; no anon client policy grants access to private profiles, routines, or chats.
- Community observations and challenges allow anon/authenticated SELECT; constrained anon INSERT of `user_submitted` observations is allowed.
- Chat history is capped at 40 messages; community observations at 50 locally; challenge action logs at 10 per challenge per session.
- GPS coordinates are used for a temporary `My Current Area` city and must not be saved as a default city or published in community reports.

## 9. Security and Privacy Requirements

- Production requires `SESSION_COOKIE_SECRET` with at least 32 characters; the proxy fails closed when missing or too short.
- Signed cookie `breathewise-session` is `HttpOnly`, `Secure` in production, `SameSite=Lax`, and carries `{sid, iat}` with clock-skew and age validation.
- Route handlers trust session IDs only via the proxy-set `x-breathewise-trusted` marker; forged headers must not select another session.
- Admin paths use `ADMIN_TOKEN`, return 404 when unconfigured, and are rate-limited. No admin routes ship by default.
- Mutation APIs require same-site headers, allowlisted origins, and `application/json`.
- CORS must echo only allowed origins, never `*`.
- Preview gating uses `?preview=<token>` or `x-preview-token` and stores only a SHA-256 fingerprint in the preview cookie.
- AI requests send only the current question, no chat history, and replace raw sensitivity labels with coarse planning thresholds.
- User-submitted text must be rendered inertly and validated/redacted before storage or display.
- The DMCA agent placeholder in `src/app/legal/page.tsx` must be replaced before any public commercial launch.

## 10. Constraints

- Do not add user accounts, passwords, password reset, email verification, or subscriptions in V1.
- Do not add email/SMS/push alerts; the implemented alert channels are in-app bell and dashboard strip only.
- Do not use a Supabase service-role key in client-side code or commit any secret to git.
- Do not present demo, degraded, or sample values as live measurements.
- Do not overwrite user edits without clear confirmation; this applies especially to AI output and saved preferences.
- Do not introduce medical diagnosis, treatment claims, or emergency guidance beyond seeking qualified help.
- Do not choose new major architecture silently; update this TRD first when a major decision changes.
- TypeScript 7 is not compatible with the installed `typescript-eslint` stack; keep TypeScript on `6.0.3` until the lint toolchain supports 7.

## 11. Environment Variables

Names only; never commit or print values.

- Required in production: `SESSION_COOKIE_SECRET`.
- Optional: `NEXT_PUBLIC_DEMO_MODE`, `DEMO_MODE`, `GEMINI_API_KEY`, `OPENAI_API_KEY`, `LLM_MODEL`, `AI_DAILY_REQUEST_CAP`, `WAQI_API_TOKEN`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `BREATHEWISE_STORE_PATH`, `PREVIEW_ACCESS_TOKEN`, `ADMIN_TOKEN`, `ALLOWED_ORIGINS`.
- Platform-provided: `NODE_ENV`, `VERCEL_ENV`.
- Canonical template: `.env.example`.

## 12. Definition of Done

- `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` all pass locally.
- `npm audit --audit-level=moderate` reports no known moderate or higher dependency vulnerabilities.
- Critical journey works end to end: dashboard → city selection → cleaner-day plan → assistant question → settings persistence.
- Live, demo, and degraded data states are visibly distinguishable.
- Mobile, tablet, and desktop layouts pass the checks in `TESTING.md`.
- No secrets are present in client code, git history, or committed files.
- Production deployment succeeds and the alias serves the intended deployment.
- Documentation reflects actual behavior, including known limitations and unverified items.
