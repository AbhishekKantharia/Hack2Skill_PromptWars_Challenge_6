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
│   │   ├── request-context.ts           # Validated x-session-id extraction
│   │   ├── client-api.ts                # Browser session header + typed apiFetch helper
│   │   ├── rate-limit.ts                # Per-session in-memory request limit (12/min)
│   │   ├── validation.ts                # Allowlisted, bounded API input parsers
│   │   ├── store.ts                     # Session-scoped Supabase or local JSON persistence
│   │   └── __tests__/breathewise.test.ts# Automated Vitest suite
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
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

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

All four checks (`typecheck`, `lint`, 22 tests, production build) pass out of the box.

---

## Privacy & API Behavior

- Every browser receives a random `breathewise-session-id` in `localStorage`; all client API calls (including city search) send it as `x-session-id` via `src/lib/client-api.ts`. Invalid, missing, or prototype-like IDs are rejected before reaching the store.
- `GET/PATCH /api/settings`, `GET/POST/DELETE /api/chat`, `POST /api/routine`, `POST /api/calculator`, and `POST /api/community` are session-scoped. Community reports are public; upvotes and challenge joins are deduplicated per session.
- API bodies are read through a 16 KB stream cap and parsed through `src/lib/validation.ts` (types, ranges, city coordinates, alert thresholds, frequencies, categories, IANA timezones). Unrecognized values are rejected or ignored, never trusted verbatim.
- Air-quality, settings-write, chat, routine, calculator, and community requests are rate-limited to 12 requests per minute per session (with client IP included in the key) and return `429` with `Retry-After`.
- Failed live environmental feeds are never presented as live: the API returns a clearly labeled demo payload with `degraded: true` and `liveError`, surfaced as a banner in the UI. Demo preference precedence is explicit request flag → session setting → environment default.
- Forecast labels are formatted in each city's IANA timezone while upstream Open-Meteo requests are pinned to UTC; cleaner-day windows only use future forecast hours.
- Local persistence uses `data/local-store.json` (gitignored). Override with `BREATHEWISE_STORE_PATH=/path/to/store.json`; tests use an in-memory store.
- Supabase personal tables remain service-role only; idempotent RLS policies allow anonymous reads of community observations/challenges and anonymous submission of `user_submitted` reports whose text contains no coordinate-like strings.

---

## Deployment Instructions (Vercel + Supabase)

1. Push the repository to GitHub.
2. Create a free Supabase project and execute `supabase/schema.sql` in the SQL Editor.
3. Import the repository in **Vercel**:
   - Framework Preset: `Next.js`
   - Build Command: `npm run build`
   - Add optional environment variables (`GEMINI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `WAQI_API_TOKEN`).
4. Deploy — Vercel serves all React pages and `/api/*` backend routes globally with zero extra server setup.
