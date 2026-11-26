# Testing Guide — BreatheWise AI

## 1. Testing Goal

Confirm that the main daily-decision journey works correctly, fails safely, does not expose private session data, and never presents demo or degraded values as live measurements.

## 2. Critical User Journey

`/`
→ Complete city/plan setup
→ Review AQI meaning, pollutants, weather, alerts, and forecast
→ Read fixed daily recommendations and expand at least one formula
→ Change city
→ `/cleaner-day`
→ Generate a personalized schedule
→ `/assistant`
→ Ask a contextual question and confirm it uses fixed results
→ `/settings`
→ Change a preference and confirm it persists

The release should not ship if this journey is broken.

## 3. Current Automated Status

At document creation, local `HEAD` was `bf720c5` after two revert commits. The working tree now includes the setup flow and fixed impact engine.

| Check | Command | Current result |
| --- | --- | --- |
| Typecheck | `npm run typecheck` | Passes |
| Lint | `npm run lint` | Passes |
| Unit tests | `npm test` | Passes: 1 file, 29 tests |
| Build | `npm run build` | Passes |
| Dependency audit | `npm audit --audit-level=moderate` | Re-run before release; previous verified run was clean |

Do not mark a release ready until all four local scripts pass.

## 4. Dashboard and Data Honesty Tests

### Happy path

- [ ] Home loads with current AQI, category, dominant pollutant, and guidance.
- [ ] Six pollutant cards show values or `N/A` with WHO 2021 guidance.
- [ ] Weather card shows temperature, humidity, wind, and condition.
- [ ] Hourly chart renders and pollutant/horizon filters change the series.
- [ ] Feature links open the correct pages.

### Data mode

- [ ] Live mode shows `LIVE` badge and real source name.
- [ ] Demo mode shows `DEMO DATA` and `SAMPLE DEMO DATA` labels.
- [ ] Degraded live fetch shows amber banner with `liveError`.
- [ ] Demo/degraded values are never described as live readings.
- [ ] Missing pollutant values render `N/A`, not `0`.

### Error and retry

- [ ] Full error screen appears when no data can be loaded.
- [ ] Retry button recovers when the API becomes available.
- [ ] Stale data remains visible with a non-blocking banner when refresh fails.
- [ ] Refresh button disables while loading.

## 4A. Setup and Fixed Recommendation Tests

### First-time setup

- [ ] Setup form appears until `setupComplete` is true.
- [ ] Featured city name resolves without a geocode request.
- [ ] Typed city search resolves to a geocoded city and saves it as the default.
- [ ] An unknown city shows an inline message and keeps the current city.
- [ ] Plan type accepts household, school, neighborhood, and housing society.
- [ ] People count clamps to 1–100000 and updates impact scaling after save.
- [ ] Saved setup collapses to a readable summary and can be changed again.
- [ ] No account or password field is introduced.

### Six fixed recommendations

- [ ] Dashboard shows exactly six recommendation cards after air quality loads.
- [ ] Cards cover cleaner hour, worst-hour windows, indoor filtration, masked commute, cleaner travel, and lower-emission cooking.
- [ ] Each card shows an impact headline, plain-language action, reason, cost, best-for group, and data-mode label.
- [ ] `See formula and sources` opens formula, unit, assumptions, and official links.
- [ ] Changing sensitivity, budget, plan type, or people count changes the relevant fixed numbers after refresh.
- [ ] Demo input is labeled on every card; degraded input remains clearly labeled.
- [ ] AI-generated prose never replaces or edits a displayed impact number.

## 5. Location, Alerts, and Settings Tests

### City selection

- [ ] Featured city pills switch city and update readings.
- [ ] Header search shows featured cities when empty.
- [ ] Debounced search finds a city by name.
- [ ] No results state appears for an unknown query.
- [ ] Search failure still shows featured cities and an error message.
- [ ] Geolocation success creates `My Current Area`.
- [ ] Geolocation denial shows a clear temporary status.
- [ ] GPS city is not saved as default city.

### Alerts

- [ ] Severe AQI triggers severe alert at configured threshold.
- [ ] High AQI triggers advisory below severe threshold.
- [ ] Unusual change triggers warning/info based on direction.
- [ ] Forecast spike triggers when a future hour is high enough above current AQI.
- [ ] Favorable ventilation window appears when forecast allows it.
- [ ] Bell opens a fixed alert panel with count, color-coded urgency, `Customize` link, close button, Escape close, and outside-click close.
- [ ] Home always shows a labeled `Intelligent Alerts` section with a count badge.
- [ ] Home shows an empty state when there are no active advisories.
- [ ] Home shows the first two alerts by default and expands to the full list when requested.
- [ ] Disabling an alert category stops that advisory.

### Settings persistence

- [ ] Display name saves and survives refresh.
- [ ] Sensitivity, budget, city, plan type, people count, units, theme, and demo mode save.
- [ ] Alert sliders auto-save after 400 ms.
- [ ] Severe stays above high; ventilation stays below high.
- [ ] Theme updates immediately and reverts if the save fails.
- [ ] Preferences affect dashboard, planner, assistant, and alerts.

## 6. AI Assistant Tests

- [ ] Suggested questions populate and submit.
- [ ] Custom question up to 1000 characters submits.
- [ ] Overlong question is rejected with a useful message.
- [ ] Optimistic user message appears immediately.
- [ ] Loading row appears while waiting.
- [ ] Answer includes city, AQI, data mode, grounding references, and uncertainty when available.
- [ ] A question about impact includes the fixed impact headlines and states that numbers are not AI-generated.
- [ ] Asking for a new percentage or invented measurement is refused as unavailable from the fixed model.
- [ ] Provider label is Gemini, OpenAI, or grounded fallback.
- [ ] API failure shows a recoverable inline error.
- [ ] Rate-limit response shows specific wording.
- [ ] Retry works after failure.
- [ ] Chat history persists up to 40 messages.
- [ ] Clear history works.
- [ ] AI output is rendered as inert text, never HTML.
- [ ] No API key appears in browser source or network payloads from the client.

## 7. Cleaner Day and Indoor Tests

### Cleaner Day

- [ ] Empty state appears before generation.
- [ ] Sensitivity, commute, budget, and activity controls update state.
- [ ] Generate button disables and shows loading state.
- [ ] Generated schedule prefers future forecast hours and falls back safely when unavailable.
- [ ] Morning, Afternoon, and Evening sections include benefit, cost, impact, caveat, and forecast AQI.
- [ ] `Daily Overview (LIVE/DEMO)` matches current data mode.
- [ ] Free, balanced, and advanced budgets produce appropriate differences.
- [ ] API failure shows red inline error and allows retry.
- [ ] Safety disclaimer is visible.

### Indoor Advisor

- [ ] Budget filters change visible cards.
- [ ] Topic filters change visible cards.
- [ ] Outdoor baseline reflects active city AQI.
- [ ] HEPA/MERV-13 and source-control references are readable.
- [ ] Guidance stays non-medical.

## 8. Map Tests

- [ ] Map loads dynamically without blocking the page.
- [ ] Active City mode shows local stations with source labels.
- [ ] Global Hubs mode fetches multi-city data.
- [ ] Layer selector changes colors/values for AQI, PM2.5, PM10, NO₂, O₃.
- [ ] Marker popup shows value, pollutants, source, and timestamp.
- [ ] `Visible Monitoring Nodes` table matches map markers.
- [ ] `N/A` appears for null values.
- [ ] Global fetch failure shows error/no-nodes banner.
- [ ] Demo stations are labeled as not live sensors.
- [ ] Official stations appear only when `WAQI_API_TOKEN` is configured.

## 9. Calculator and Community Tests

### Calculator

- [ ] All six sliders load with saved or default frequencies.
- [ ] Save Weekly Plan shows `Saving...` then success/error notice.
- [ ] Saved plan survives refresh.
- [ ] Unknown action IDs are ignored and over-max values are clamped server-side.
- [ ] Formulas and citations are expandable and readable.
- [ ] What-If scenario selection changes adoption percentage and results.
- [ ] Initial load failure falls back to defaults without crashing.

### Community

- [ ] Feed and challenges load.
- [ ] Load failure shows red retry banner.
- [ ] Observation submission validates category, level, text, and place name.
- [ ] Coordinate-like text is redacted before storage and display.
- [ ] Upvote works once per session and shows `Confirmed`.
- [ ] Join challenge works once per session and shows `Joined`.
- [ ] `+ Log Action` works up to 10 times per challenge per session.
- [ ] Duplicate upvote/join shows a clear status message.
- [ ] Empty observation/challenge grids are handled acceptably.
- [ ] Community observations are labeled as neighborhood reports, not official telemetry.

## 10. Responsive Checks

Test at minimum:

- [ ] 320 px small mobile.
- [ ] Large mobile.
- [ ] Tablet.
- [ ] Laptop/desktop.

Check on every primary page:

- [ ] No horizontal overflow.
- [ ] Buttons remain tappable.
- [ ] Forms remain readable.
- [ ] Mobile drawer opens, closes, and reaches every destination.
- [ ] Desktop sidebar and header remain usable.
- [ ] Chart labels do not clip.
- [ ] Map popups fit the viewport.
- [ ] Modal/popover content fits the screen.
- [ ] Alerts bell and city search work on touch.

## 11. Accessibility Checks

- [ ] Inputs have labels.
- [ ] Keyboard can reach all interactive controls.
- [ ] Focus state is visible.
- [ ] Buttons have clear accessible names where icon-only.
- [ ] Images/icons have appropriate alt or aria treatment.
- [ ] Errors are not communicated by color alone.
- [ ] Heading order is logical.
- [ ] Loading and error messages are readable by assistive technology.
- [ ] Color contrast is readable in light and dark themes.

## 12. Security and Privacy Checks

- [ ] Secrets are not present in client-side source or browser bundles.
- [ ] `.env.local` is not committed.
- [ ] Production fails closed when `SESSION_COOKIE_SECRET` is missing or too short.
- [ ] Session cookie is `HttpOnly`, `Secure`, and `SameSite=Lax` in production.
- [ ] Forged `x-session-id` cannot select another session.
- [ ] Admin paths return 404 when `ADMIN_TOKEN` is unset.
- [ ] Admin attempts are rate-limited.
- [ ] API mutations reject disallowed origins and missing same-site headers.
- [ ] CORS never returns `*`.
- [ ] Mutation bodies over 16 KB are rejected.
- [ ] AI output is validated and rendered inertly.
- [ ] User A cannot access User B's private session data.
- [ ] Anon users cannot read private Supabase tables.
- [ ] Sensitive errors are not exposed to users.
- [ ] Preview gating accepts a valid token and rejects invalid tokens in preview deployments.
- [ ] Preview query token is stripped from the URL and only a fingerprint is stored.

## 13. Production Checks

- [ ] All four local scripts pass before deploy.
- [ ] `npm audit --audit-level=moderate` is clean.
- [ ] Deployment build succeeds.
- [ ] Home, settings, and legal return 200.
- [ ] Production alias points to the intended deployment.
- [ ] Security headers are present.
- [ ] Session cookie is set on first page response.
- [ ] CORS header echoes only allowed origins.
- [ ] Live API routes respond within expected limits.
- [ ] No debug/admin route is publicly reachable.
- [ ] DMCA agent placeholder is replaced before commercial launch.

## 14. Release Blockers

Do not release if:

- Typecheck, lint, tests, or build fail.
- The critical journey cannot complete.
- Live/demo/degraded states are mislabeled.
- AI creates, recomputes, or replaces a fixed impact number.
- Private session data or another user's data is accessible.
- AI keys or Supabase service-role keys are exposed.
- CORS is wildcard or mutations are accepted cross-site.
- A critical mobile flow is unusable.
- Community reports expose coordinate-like text.
- The intended deployment is not the one served by the production alias.

## 15. Test Result Format

For every failure, record:

- Test:
- Expected:
- Actual:
- Device/browser:
- Steps to reproduce:
- Screenshot/log:
- Severity:
- Status:

Use the product exactly like a first-time user, then deliberately do the wrong thing: leave fields empty, enter bad data, go back, refresh, disconnect, double-click, and retry. Do not mark anything as passed unless it was actually verified.
