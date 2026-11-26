# App Flow — BreatheWise AI

## 1. Purpose

This document maps how a person moves through BreatheWise AI, what the app responds with, and where flows can fail or recover. It describes the current implementation, including its limitations.

## 2. Entry Points

- Direct visit to `/` — default daily dashboard.
- Direct visit to `/presentation` — competition/judge walkthrough.
- Deep link to any primary route: `/assistant`, `/map`, `/cleaner-day`, `/indoor`, `/calculator`, `/community`, `/learn`, `/settings`.
- `/legal` from the global footer.
- Shared demo flow from `DEMO_SCRIPT.md`.

Global shell applies to every page:

- Desktop sidebar with all ten primary destinations.
- Mobile drawer menu with the same destinations.
- Header with city selector/geolocation, live/demo badge, refresh, alerts bell, and theme toggle.
- Footer with non-medical disclaimer, legal link, and current data source label.

## 3. Primary Daily Decision Journey

Land on `/`
→ Provider hydrates session settings and fetches air quality
→ Review AQI, category, pollutants, weather, alerts, and hourly forecast
→ Change city via quick pills or header search/geolocation
→ Open `/cleaner-day`
→ Choose sensitivity, commute, budget, and activities
→ Generate today's schedule
→ Open `/assistant`
→ Ask a contextual question about today's air
→ Open `/indoor` for home actions if needed
→ Adjust `/settings` so future visits are personalized

## 4. Screen Details

### `/` — Home Dashboard

Purpose: Answer “What is the air like right now, and what should I do about it?”

Primary actions:

- Switch city with the six featured city pills or header search.
- Open `Plan My Cleaner Day`.
- Open `Ask AI About Today's Air`.
- Filter the hourly chart by pollutant and time horizon.
- Retry after a connection error.
- Open feature cards for map, indoor, calculator, and presentation.

System responses:

- Skeleton while first load is pending.
- Full error with retry if no air-quality data exists.
- Non-blocking error banner with retry if stale data remains.
- Amber degraded-feed banner when live data failed and labeled demo data is shown.
- `SAMPLE DEMO DATA` badge and sample pollutant heading in demo mode.
- `N/A` for missing pollutant values; weather condition may show `Weather data unavailable`.

### `/assistant` — AI Air Quality Assistant

Purpose: Give grounded, context-aware answers without pretending to be medical advice.

Inputs and actions:

- Choose one of five suggested questions.
- Type a custom question up to 1000 characters.
- Submit with `Ask AI`.
- Clear chat history.

System responses:

- Empty state with suggestions.
- Optimistic user message immediately after submit.
- Loading row: “Retrieving environmental readings…”.
- Assistant message with timestamp, city, AQI, data mode, grounding references, and uncertainty note when available.
- Inline error with retry wording, including special rate-limit messaging.
- Provider label: Gemini, OpenAI, or grounded fallback.

Failure/recovery:

- Network or provider failure removes the optimistic message and shows an inline error; the user must retype or retry.
- Failed history clear keeps history visible.

### `/map` — Live Air Quality Map

Purpose: Compare locations and station/model readings spatially.

Actions:

- Toggle `Active City` vs `Global Hubs`.
- Choose layer: AQI, PM2.5, PM10, NO₂, or O₃.
- Click map markers for popups.
- Review the `Visible Monitoring Nodes` table.

System responses:

- Dynamic map loading placeholder.
- `Fetching multi-city readings…` for global mode.
- Error/no-nodes banner when multi-city fetch fails or returns zero stations.
- `N/A` for null pollutant values.
- Source label on each marker: model grid, official station, or demo sample station.

### `/cleaner-day` — My Cleaner Day Planner

Purpose: Convert hourly forecasts into practical morning, afternoon, and evening actions.

Inputs and actions:

- Sensitivity profile: general, children, older adults, respiratory, outdoor athletes.
- Commute mode: transit, walk/bike, car, remote.
- Budget tier: free only, balanced, advanced/HEPA.
- Planned activities: outdoor exercise, commute, cooking, kids/family outdoor time.
- `Generate Today's Schedule`.

System responses:

- Empty dashed card before generation.
- Disabled/loading button while generating.
- Red inline error banner on failure.
- Generated `Daily Overview (LIVE/DEMO)`, best outdoor window, ventilation guidance, action cards, and safety disclaimer.

Known limitation:

- Only `outdoor_exercise` currently changes a generated morning action; `cooking` and `kids_outdoor` do not materially alter routine output.

### `/indoor` — Indoor Air Quality Advisor

Purpose: Provide budget-aware home actions with outdoor context.

Actions:

- Filter by budget: all, free, affordable, advanced.
- Filter by topic: filtration, ventilation, cleaner cooking, dust reduction, indoor smoke.
- Read HEPA/MERV-13 and source-control references.

System responses:

- Outdoor baseline shows `Loading...` until air quality is available.
- Baseline guidance changes at AQI `<= 75` versus higher.
- No explicit empty state if a filter combination returns no cards.

### `/calculator` — Impact Calculator & What-If Simulator

Purpose: Estimate personal and neighborhood-scale environmental benefit.

Actions:

- Adjust six weekly habit sliders.
- Save weekly plan.
- Expand formulas and citations.
- Pick one of four What-If scenarios and set adoption percentage.

System responses:

- Default values if saved data cannot load.
- `Saving...` during save.
- Temporary success/error notice that disappears after three seconds.

### `/community` — Community Clean-Air Network

Purpose: Share privacy-preserving neighborhood observations and join collective challenges.

Actions:

- Submit an observation with neighborhood/corridor, category, perceived level, and description.
- Confirm/upvote another observation.
- Join a challenge.
- Log an action on a challenge.

Categories:

- Visible smoke/haze, traffic idling, construction dust, waste burning, clear breeze, green commute.

System responses:

- Red load-error banner with retry instruction.
- `Submitting...` disabled state.
- Temporary status messages for success, already-voted, already-joined, and network errors.
- `Confirmed` after upvote and `Joined` after joining.
- Empty grids are possible when no observations or challenges exist.

Privacy rule:

- Community reports are not official measurements, and coordinate-like text is redacted before storage/display.

### `/learn` — Environmental Learning Center

Purpose: Educate without requiring interaction.

Content:

- Pollutant encyclopedia cards.
- WHO 2021 reference levels.
- AQI scale guide.
- Model uncertainty and medical boundary explanations.

States: static only.

### `/settings` — User Settings

Purpose: Personalize future visits.

Actions:

- Save display name.
- Change sensitivity profile, budget tier, default home city, and units.
- Toggle light/dark theme.
- Toggle demo mode vs live API.
- Adjust four alert thresholds.
- Enable/disable five alert categories.

System responses:

- Success/failure notice after writes.
- Alert sliders auto-save after 400 ms.
- Theme updates optimistically and reverts if the server write fails.
- Severe threshold stays above high; ventilation threshold stays below high.

### `/presentation` — Competition Deck

Purpose: Give judges a quick story and live CTAs.

Actions:

- Launch Live Dashboard.
- Demo My Cleaner Day.
- Try AI Assistant.
- Try What-If Simulator.

System response:

- Live-context badge appears only when air-quality data is available.

### `/legal` — Legal & Privacy

Purpose: Publish disclosures.

Content:

- Age/COPPA posture.
- Font delivery.
- No session replay or marketing email.
- No subscriptions.
- DMCA notice/counter-notice process.

State: static only. The DMCA agent contact is still a placeholder and must be replaced before commercial launch.

## 5. Secondary Journeys

### Personalization

`/settings`
→ Change sensitivity, budget, city, units, theme, demo mode, and alerts
→ Return to `/`
→ Dashboard, alerts, planner, assistant, and charts use the updated preferences

### Demo/competition walkthrough

`/presentation` or `/`
→ Show dashboard telemetry, city switch, theme, live/demo badge, and `N/A` behavior
→ `/cleaner-day` with free/budget-aware options
→ `/assistant` suggested exercise question
→ `/indoor` tier filters
→ `/calculator` transit slider and 20% car-trip scenario
→ `/community` report or `+ Log Action`

### Sustainability and community

`/calculator`
→ Adjust habits
→ Save weekly plan
→ Try What-If scenario
→ `/community`
→ Submit observation or log challenge action

### Recovery

- Air-quality fetch fails with no cached data: retry from full error screen.
- Air-quality fetch fails with cached data: retry from banner while stale data remains visible.
- Live feed unusable: app continues with clearly labeled demo fallback and explains `liveError`.
- AI request fails: retype or retry; prior history is preserved.
- Settings write fails: notice appears and optimistic theme changes revert.
- Geolocation denied: temporary status explains permission was declined; manual city search still works.
- Preview deployment with `PREVIEW_ACCESS_TOKEN` configured: URL without valid token returns 404 until a valid token is supplied.

## 6. Important States

- Loading: first air-quality fetch, map import, multi-city fetch, routine generation, assistant send, settings save, community submit.
- Empty: no routine yet, no active advisories, no chat history, no map nodes, empty community grids.
- Validation: bad city query, invalid settings values, overlong assistant question, malformed community report.
- Error: network failure, provider failure, rate limit, API validation failure.
- Degraded/demo: live fetch failed or demo mode forced; all values must be labeled.
- Saved: settings, weekly plan, community action, chat history.
- Unavailable: `N/A` for missing pollutant or weather values.

## 7. Cross-Cutting Rules

- Every data-driven screen must show source/data-mode context.
- Never present sample values as live measurements.
- User text is inert; no HTML rendering from submissions or AI output.
- Preferences are session-scoped; there are no user accounts or password flows.
- Alerts are in-app only: bell popover and home strip. There is no email, SMS, or push channel.
- Navigation should prefetch routes and related API reads where implemented.
- Medical claims and emergency instructions are out of scope; advise qualified clinical help where appropriate.
