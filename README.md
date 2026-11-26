# BreatheWise AI — Your Intelligent Urban Air Quality Companion

BreatheWise AI is a full-stack, GenAI-powered urban air quality platform built with **Next.js (App Router), React, TypeScript, Tailwind CSS, Recharts, Leaflet, and Supabase/PostgreSQL**. It transforms environmental readings and hourly forecasts into clear, affordable, and scientifically honest daily actions for families and communities.

---

## Core Features

1. **Home Dashboard (`/`)**
   - Real-time **US EPA AQI**, **PM2.5, PM10, NO₂, SO₂, CO, Ozone (O₃)** with WHO 2021 reference levels.
   - Weather dispersion metrics (Temperature, Humidity, Wind Speed, Sky Condition).
   - Interactive 24-hour trend & forecast charts (**Recharts**) with metric and horizon filters.
   - City search (**Open-Meteo Geocoding**) + optional browser geolocation.
   - Automatic **Live Mode** (Open-Meteo CAMS Air Quality & Weather APIs — no key required) and clearly labeled **Demo Mode** fallback.
2. **AI Air Quality Assistant (`/assistant`)**
   - Grounded natural-language chatbot supporting **Google Gemini** (`GEMINI_API_KEY`) or **OpenAI** (`OPENAI_API_KEY`), plus an out-of-the-box grounded AI engine when no LLM key is provided.
   - Explains *why* recommendations matter, includes free/low-cost alternatives, states model uncertainty, and avoids medical diagnoses.
3. **Live Air Quality Map (`/map`)**
   - Interactive **Leaflet** map with active-city monitoring nodes and multi-city global hub comparison.
   - Layer switcher (`AQI`, `PM2.5`, `PM10`, `NO₂`, `O₃`) and clear distinction between Official Ground Stations, Atmospheric Grid Models, and Demo Stations.
4. **My Cleaner Day (`/cleaner-day`) — Signature Feature**
   - Generates personalized Morning, Afternoon, and Evening schedules from hourly forecasts, sensitivity group, commute mode, and budget tier.
   - Every item includes **Action**, **Explanation**, **Expected Benefit**, **Estimated Cost**, **Environmental Impact**, and **Important Limitations**.
5. **Indoor Air Quality Advisor (`/indoor`)**
   - Categorized into **Free ($0)**, **Affordable**, and **Advanced** strategies covering smart cross-ventilation timing, HEPA/MERV-13 filtration, cleaner cooking, dust reduction, and smoke elimination—with explicit limitations of each.
6. **Sustainability Impact Calculator & What-If Simulator (`/calculator`)**
   - Interactive sliders estimating weekly/monthly/annual **CO₂e avoided**, **fuel saved (L)**, and **electricity saved (kWh)** with documented EPA & IEA formulas.
   - Interactive **What-If Urban Scenario Simulator** (20% car trip replacement, electricity conservation, shared commuting, clean cooking) clearly labeled as simulated estimates.
7. **Community Clean-Air Network (`/community`)**
   - Privacy-preserving neighborhood observations (strips coordinates; neighborhood name only) clearly badged as `User-Submitted Report` vs. official sensor telemetry.
   - Interactive neighborhood clean-air challenges with join & action-logging progress trackers.
8. **Environmental Learning Center (`/learn`)**
   - Pollutant encyclopedia, US EPA AQI scale guide, uncertainty education, and health guidance boundaries.
9. **User Settings (`/settings`)**
   - Sensitivity groups, budget tiers, default city, metric/imperial units, Light/Dark theme, Demo Mode toggle, and customizable Intelligent Alert thresholds.
10. **Competition Presentation (`/presentation`)**
     - Interactive deck covering Problem, Solution, Innovation, Technology, Social Impact, and a 2-minute judge walkthrough.

**Data honesty:** live readings are used only when a real response contains usable AQI/PM2.5; missing pollutant values stay `null` and display as `N/A` with an uncertainty note. Demo values are always labeled `Demo Mode` and are never presented as measurements. Personal settings, chat, challenge joins, and impact logs are isolated per browser session and never mixed with the public community feed.

---

## Architecture & Directory Structure

```text
├── supabase/schema.sql                  # PostgreSQL / Supabase schema with RLS
├── src/
│   ├── types/breathewise.ts             # Shared TypeScript domain interfaces
│   ├── lib/
│   │   ├── aqi.ts                       # EPA AQI breakpoints, dominant pollutant, alert engine
│   │   ├── air-quality-service.ts       # Open-Meteo live AQI/Weather/Geocoding + WAQI + Demo fallback
│   │   ├── ai-assistant.ts              # Gemini / OpenAI / grounded environmental fallback engine
│   │   ├── calculations.ts              # EPA/IEA sustainability formulas & What-If simulator
│   │   ├── demo-data.ts                 # Sample reference profiles, cities, challenges
│   │   ├── indoor-and-learn-data.ts     # Budget-tiered indoor guidance & pollutant guides
│   │   ├── routine-engine.ts            # "My Cleaner Day" forecast-aware scheduler
│   │   ├── request-context.ts           # Trusted proxy session extraction (legacy header fallback)
│   │   ├── client-api.ts                # Typed apiFetch helper
│   │   ├── security.ts                  # Constant-time token comparison, origin/admin checks
│   │   ├── session-cookie.ts            # HMAC-signed HttpOnly session cookie helpers
│   │   ├── api-security.ts              # Shared CSRF/CORS/rate-limit/content-type policy
│   │   ├── spend-cap.ts                 # Per-session daily AI request cap
│   │   ├── rate-limit.ts                # Per-session in-memory request limit (12/min)
│   │   ├── validation.ts                # Allowlisted, bounded API input parsers
│   │   ├── store.ts                     # Session-scoped Supabase or local JSON persistence
│   │   └── __tests__/breathewise.test.ts# Automated Vitest suite
│   ├── proxy.ts                         # CORS, CSRF, admin auth, signed session cookie
│   ├── components/
│   │   ├── BreatheWiseProvider.tsx      # Global state, city, alerts, theme, Demo Mode context
│   │   ├── AppShell.tsx                 # Responsive mobile-first sidebar & header
│   │   ├── LocationSelector.tsx         # Live city autocomplete + optional geolocation
│   │   ├── AlertsPanel.tsx              # Intelligent Alert notifications & banners
│   │   ├── AirQualityCharts.tsx         # Recharts interactive trend/forecast visualizations
│   │   └── AirMapLeaflet.tsx            # SSR-safe Leaflet spatial map
│   └── app/
│       ├── api/                         # REST routes: air-quality, geocode, chat, routine, community, calculator, settings
│       ├── page.tsx                     # 1. Home Dashboard
│       ├── assistant/page.tsx           # 2. AI Air Quality Assistant
│       ├── map/page.tsx                 # 3. Live Air Quality Map
│       ├── cleaner-day/page.tsx         # 4. My Cleaner Day
│       ├── indoor/page.tsx              # 5. Indoor Air Quality Advisor
│       ├── calculator/page.tsx          # 6. Sustainability Impact & What-If Simulator
│       ├── community/page.tsx           # 7. Community Clean-Air Challenges
│       ├── learn/page.tsx               # 8. Environmental Learning Center
│       ├── settings/page.tsx            # 9. User Settings
│       └── presentation/page.tsx        # 10. Competition Presentation
├── .env.example                         # Environment variable template
└── DEMO_SCRIPT.md                       # 3-minute live competition demo script
```

---

## Local Installation & Setup

### Prerequisites
- **Node.js 20+** and **npm 10+**

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment variables (Optional)
BreatheWise AI works **immediately out-of-the-box** without API keys (live environmental telemetry comes from Open-Meteo's open API, and local JSON persistence + grounded AI work automatically). To enable Gemini, OpenAI, WAQI stations, or Supabase PostgreSQL:

```bash
cp .env.example .env.local
```
Edit `.env.local` and optionally provide:
- `GEMINI_API_KEY` or `OPENAI_API_KEY`
- `WAQI_API_TOKEN`
- `SUPABASE_URL`, `SUPABASE_ANON_KEY` (server-only; the service-role key is intentionally unused)
- `SESSION_COOKIE_SECRET` (required in production), `PREVIEW_ACCESS_TOKEN`, `ADMIN_TOKEN`, `ALLOWED_ORIGINS`, `AI_DAILY_REQUEST_CAP`

If using Supabase, run `supabase/schema.sql` in the Supabase SQL Editor to create all tables and Row Level Security policies.

### 3. Run in development
```bash
npm run dev
```
Open `http://localhost:3000`.

### 4. Run tests, typecheck, and production build
```bash
npm run typecheck
npm run lint
npm test
npm run build
npm start
```

All four checks (`typecheck`, `lint`, 27 tests, production build) pass out of the box.

---

## Privacy & API Behavior

- Each browser receives an HMAC-signed, time-stamped session cookie (`HttpOnly`, `Secure` in production, `SameSite=Lax`, 1 year) on the first page response, so parallel mount-time API calls share one session. The proxy verifies the signature and age, then overwrites `x-session-id` plus a trusted marker; route handlers reject unmarked IDs. No session state is stored in `localStorage` (only the UI theme is).
- All API routes are session-scoped and rate-limited to 12 requests per minute per session/IP namespace, returning `429` with `Retry-After`. Client IP preference is `x-vercel-forwarded-for`, then `x-real-ip`, then `x-forwarded-for` (local/dev fallback). Admin path attempts share the limiter.
- State-changing requests require `Origin` or `Sec-Fetch-Site`, enforce same-origin CSRF checks, and require `application/json`; `multipart/form-data` uploads are rejected. CORS is same-origin by default (page responses explicitly echo only their own origin, never `*`); `ALLOWED_ORIGINS` can add explicit trusted origins. Production fails closed when `SESSION_COOKIE_SECRET` is missing. In-memory rate limits and AI caps are per-serverless-instance; use a shared store for strict multi-instance enforcement.
- Admin paths (`/admin/*`, `/api/admin/*`) require `ADMIN_TOKEN` as a bearer token and return `404` when admin access is not configured. No admin routes ship by default.
- AI calls are capped by `AI_DAILY_REQUEST_CAP` (default 200/day) after input validation and before any provider request. Chat history is not sent to providers, sensitivity labels are replaced by coarse planning thresholds, model output is length/format checked, and answers remain inert rendered text. Set provider billing caps in Google AI Studio/OpenAI as the authoritative spend limit.
- API bodies are read through a 16 KB stream cap and parsed through `src/lib/validation.ts` (types, ranges, city coordinates, alert thresholds, frequencies, categories, IANA timezones). Unrecognized values are rejected or ignored, never trusted verbatim.
- Failed live environmental feeds are never presented as live: the API returns a clearly labeled demo payload with `degraded: true` and `liveError`, surfaced as a banner in the UI. Demo preference precedence is explicit request flag → session setting → environment default.
- Forecast labels are formatted in each city's IANA timezone while upstream Open-Meteo requests are pinned to UTC; cleaner-day windows only use future forecast hours.
- Local persistence uses `data/local-store.json` (gitignored). `BREATHEWISE_STORE_PATH` accepts only a filename inside that directory; tests use an in-memory store.
- Supabase access uses only the anon key with RLS. Idempotent policies allow anonymous reads of community observations/challenges and anonymous submission of `user_submitted` reports whose text contains no coordinate-like strings; an additional table constraint rejects coordinate-like text.
- Security headers include CSP, `nosniff`, frame denial, referrer policy, permissions policy, COOP/CORP, and HSTS. CSP `connect-src` is limited to same-origin and configured AI/Supabase hosts. Source maps and the `X-Powered-By` header are disabled in production. No secrets, debug endpoints, upload handlers, GraphQL/WebSocket endpoints, webhooks, payment flows, or raw SQL are present.
- Vercel Preview deployments can be locked with `PREVIEW_ACCESS_TOKEN`; visitors add `?preview=<token>` once, are redirected to a clean URL, and receive an HttpOnly cookie holding only a SHA-256 fingerprint of the token. Production deployments are unaffected. Dependencies are pinned exactly and audited clean; React/React DOM are on `19.3.1`, while TypeScript remains on `6.0.3` because `typescript-eslint` does not support TS 7 yet. Any future CI action must be pinned to a commit SHA and secrets supplied via Vercel/OIDC.

---

## Deployment Instructions (Vercel + Supabase)

1. Push the repository to GitHub.
2. Create a free Supabase project and execute `supabase/schema.sql` in the SQL Editor.
3. Import the repository in **Vercel**:
   - Framework Preset: `Next.js`
   - Build Command: `npm run build`
   - Add environment variables (`SESSION_COOKIE_SECRET` required in Production; optional `GEMINI_API_KEY`, `OPENAI_API_KEY`, `WAQI_API_TOKEN`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `PREVIEW_ACCESS_TOKEN`, `ADMIN_TOKEN`, `ALLOWED_ORIGINS`, `AI_DAILY_REQUEST_CAP`).
4. Deploy — Vercel serves all React pages and `/api/*` backend routes globally with zero extra server setup.
