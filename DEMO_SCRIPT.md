# BreatheWise AI — Competition Demonstration Script (3 Minutes)

## Opening (0:00 – 0:30) — The Problem & Mission
- Open `/presentation` (or start directly on `/` Home Dashboard).
- **Say:** *"Every morning, millions of urban families check an AQI number—like 171 in New Delhi or 41 in San Francisco—and still don't know what to actually do next. Is a short walk safe? Should I open my bedroom window at 2 PM? What can I do if I can't afford a $300 air purifier? **BreatheWise AI** turns complex environmental telemetry into explainable, budget-inclusive daily action."*

## Act 1: Live Telemetry & Intelligent Alerts (0:30 – 1:05)
- On `/` (**Home Dashboard**), point out:
  - The calm setup card: city, **household vs. school/neighborhood/housing society**, and people covered.
  - Real-time US EPA AQI, dominant pollutant, and all 6 pollutants (`PM2.5`, `PM10`, `NO₂`, `O₃`, `SO₂`, `CO`) with WHO 2021 guidelines.
  - Six **Today’s cleaner-air plan** cards; expand one to show its fixed formula, assumptions, and official sources.
  - Weather dispersion card (wind speed & humidity).
  - **Intelligent Alerts** banner (elevated AQI advisory, forecasted spike, or favorable ventilation window).
  - Switch cities using the quick pills (**New Delhi** → **San Francisco**) or top search bar, and toggle **Dark/Light Mode**.
   - Point out the **Live vs. Demo Mode** badge and transparent uncertainty note. Toggle **Demo Mode** in `/settings` to show that sample values are always explicitly labeled and never presented as measurements; missing pollutant readings appear as `N/A`.

## Act 2: Signature Feature — "My Cleaner Day" (1:05 – 1:45)
- Navigate to `/cleaner-day`.
- Select sensitivity (`Families with Children`) and Budget (`Free Actions Only ($0)`), then click **Generate Today's Schedule**.
- **Show:** Morning, Afternoon, and Evening cards with **Action**, **Why it matters**, **Expected benefit**, **Estimated cost ($0)**, **Environmental impact**, and **Important Limitations** (e.g., noting that indoor air is not automatically cleaner than outdoors).

## Act 3: Grounded GenAI Assistant & Indoor Advisor (1:45 – 2:20)
- Navigate to `/assistant`.
- Click suggested question: *"Is it safe to exercise outdoors today?"*
- Highlight how the response cites the active city's real AQI/PM2.5, explains the fixed impact results without inventing new numbers, suggests affordable alternatives, states model uncertainty, and includes a non-medical disclaimer.
- Briefly click `/indoor` to show Free vs. Affordable (DIY Corsi-Rosenthal box-fan filter) vs. Advanced (True HEPA) tiers with honest limitations.

## Act 4: Sustainability Calculator, What-If Simulator & Community (2:20 – 3:00)
- Navigate to `/calculator`.
- Adjust the public transit slider and show real-time CO₂e, fuel, and kWh updates with documented EPA/IEA formulas—highlighting how GHG savings are clearly separated from local air pollutants.
- Scroll to the **What-If Urban Scenario Simulator** and adjust *"20% of unnecessary car trips replaced"* to show clearly labeled simulated neighborhood outcomes.
- End on `/community`: submit a quick neighborhood report or click **+ Log Action** on a clean-air challenge, emphasizing privacy protection (no home GPS exposed), per-session deduplication of upvotes/joins, and clear separation from official sensors.
