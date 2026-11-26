'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Calculator,
  FileText,
  FlaskConical,
  Fuel,
  Leaf,
  Save,
  Sliders,
  Zap,
} from 'lucide-react';
import {
  calculateSustainabilityImpact,
  evaluateSimulatorScenario,
  SIMULATOR_SCENARIOS,
  SUSTAINABILITY_ACTIONS,
} from '@/lib/calculations';
import { apiFetch } from '@/lib/client-api';

const CHART_MARGIN = { top: 10, right: 10, left: -12, bottom: 20 };
const X_AXIS_TICK = { fontSize: 10, fill: '#64748b' };
const Y_AXIS_TICK = { fontSize: 11, fill: '#64748b' };
const TOOLTIP_STYLE = {
  borderRadius: '12px',
  backgroundColor: 'rgba(15, 23, 42, 0.94)',
  border: 'none',
  color: '#fff',
  fontSize: '12px',
};
const BAR_RADIUS: [number, number, number, number] = [6, 6, 0, 0];

export default function CalculatorAndSimulatorPage() {
  const [frequencies, setFrequencies] = useState<Record<string, number>>({
    public_transit: 3,
    carpooling: 2,
    skip_short_car_trips: 4,
    save_electricity: 5,
    efficient_household_heating_cooling: 4,
    waste_compost_no_burn: 2,
  });
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState<{ message: string; ok: boolean } | null>(null);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    };
  }, []);

  // What-If Pollution Simulator state
  const [selectedScenarioId, setSelectedScenarioId] = useState(SIMULATOR_SCENARIOS[0].id);
  const [adoptionPct, setAdoptionPct] = useState(SIMULATOR_SCENARIOS[0].defaultPct);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch('/api/calculator', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data.frequencies) setFrequencies(data.frequencies);
        }
      } catch {
        // Use default frequencies
      }
    })();
  }, []);

  const impact = useMemo(() => calculateSustainabilityImpact({ frequencies }), [frequencies]);
  const simResult = useMemo(
    () => evaluateSimulatorScenario(selectedScenarioId, adoptionPct),
    [selectedScenarioId, adoptionPct]
  );

  async function handleSaveProgress() {
    setSaving(true);
    setSavedNotice(null);
    try {
      const res = await apiFetch('/api/calculator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frequencies }),
      });
      const data = await res.json().catch(() => null);
      const message = res.ok ? 'Weekly action plan saved!' : data?.error ?? 'Could not save your plan.';
      setSavedNotice({ message, ok: res.ok });
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
      noticeTimerRef.current = setTimeout(() => setSavedNotice(null), 3000);
    } catch {
      setSavedNotice({ message: 'Network error. Your plan was not saved.', ok: false });
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
      noticeTimerRef.current = setTimeout(() => setSavedNotice(null), 3000);
    } finally {
      setSaving(false);
    }
  }

  const chartData = useMemo(
    () =>
      impact.breakdown.map((b) => ({
        name: b.id.replace(/_/g, ' ').slice(0, 8),
        weeklyCo2: b.co2KgWeek,
        monthlyCo2: Number((b.co2KgWeek * 4.33).toFixed(1)),
      })),
    [impact]
  );

  return (
    <div className="space-y-8">
      {/* Section 1: Sustainability Impact Calculator */}
      <section className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-h1 text-slate-900 dark:text-white flex items-center gap-2">
              <Calculator className="h-6 w-6 text-emerald-600" />
              Sustainability Impact Calculator
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Adjust your weekly sustainable habits to estimate avoided CO₂e, fuel savings, and electricity reductions using documented EPA &amp; IEA factors.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void handleSaveProgress()}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-xs transition hover:bg-emerald-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Weekly Plan'}
          </button>
        </div>

        {savedNotice && (
          <div
            className={`rounded-xl px-4 py-2 text-xs font-semibold ${
              savedNotice.ok
                ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300'
                : 'bg-rose-500/15 text-rose-800 dark:text-rose-300'
            }`}
          >
            {savedNotice.message}
          </div>
        )}

        {/* Summary KPIs */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-emerald-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              <Leaf className="h-4 w-4" />
              CO₂e Avoided
            </div>
            <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
              {impact.weeklyCo2Kg} kg/wk
            </div>
            <div className="text-xs text-slate-500">
              {impact.monthlyCo2Kg} kg/mo · {impact.annualCo2Kg} kg/yr
            </div>
          </div>

          <div className="rounded-2xl border border-sky-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-700 dark:text-sky-400">
              <Fuel className="h-4 w-4" />
              Fuel Saved
            </div>
            <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
              {impact.weeklyFuelLiters} L/wk
            </div>
            <div className="text-xs text-slate-500">{impact.monthlyFuelLiters} L/month</div>
          </div>

          <div className="rounded-2xl border border-teal-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-teal-700 dark:text-teal-400">
              <Zap className="h-4 w-4" />
              Electricity Saved
            </div>
            <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
              {impact.weeklyEnergyKwh} kWh/wk
            </div>
            <div className="text-xs text-slate-500">{impact.monthlyEnergyKwh} kWh/month</div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <Sliders className="h-4 w-4" />
              Actions Completed
            </div>
            <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
              {impact.actionsCompletedPerWeek} / wk
            </div>
            <div className="text-xs text-slate-500">
              ~{Math.round(impact.actionsCompletedPerWeek * 4.33)} actions/month
            </div>
          </div>
        </div>

        {/* Sliders + Chart Grid */}
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-3 rounded-3xl border border-emerald-200/70 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-h2 text-slate-900 dark:text-white">
              Select Your Weekly Actions
            </h2>
            {SUSTAINABILITY_ACTIONS.map((action) => {
              const val = frequencies[action.id] ?? 0;
              return (
                <div
                  key={action.id}
                  className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor={`slider-${action.id}`}
                      className="text-xs font-bold text-slate-800 dark:text-slate-100"
                    >
                      {action.label}
                    </label>
                    <span className="shrink-0 rounded-lg bg-emerald-500/15 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                      {val} {action.unitLabel}
                    </span>
                  </div>
                  <input
                    id={`slider-${action.id}`}
                    type="range"
                    min={0}
                    max={action.maxFrequency}
                    value={val}
                    onChange={(e) =>
                      setFrequencies((prev) => ({
                        ...prev,
                        [action.id]: Number(e.target.value),
                      }))
                    }
                    className="mt-2 w-full accent-emerald-600"
                  />
                  <p className="mt-1 text-micro text-slate-500 dark:text-slate-400">
                    <strong>Local Air Effect:</strong> {action.localPollutantNote}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="flex min-w-0 flex-col justify-between rounded-3xl border border-emerald-200/70 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div>
              <h2 className="text-h2 text-slate-900 dark:text-white">
                Weekly &amp; Monthly CO₂e Avoided (kg)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Breakdown by habit category
              </p>
              <div className="h-72 w-full min-w-0 max-w-full overflow-hidden">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={100}>
                  <BarChart data={chartData} margin={CHART_MARGIN}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                    <XAxis dataKey="name" tick={X_AXIS_TICK} angle={-15} textAnchor="end" />
                    <YAxis tick={Y_AXIS_TICK} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Bar
                      dataKey="weeklyCo2"
                      name="Weekly kg CO₂e"
                      fill="#10b981"
                      radius={BAR_RADIUS}
                      isAnimationActive={false}
                    />
                    <Bar
                      dataKey="monthlyCo2"
                      name="Monthly kg CO₂e"
                      fill="#0284c7"
                      radius={BAR_RADIUS}
                      isAnimationActive={false}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50/70 p-3.5 text-xs text-sky-950 dark:border-sky-800/50 dark:bg-sky-950/30 dark:text-sky-100">
              <div className="flex items-center gap-1.5 font-bold">
                <FileText className="h-4 w-4 text-sky-600" />
                GHG vs. Local Air Pollutant Distinction
              </div>
              <p className="mt-1 leading-relaxed">{impact.methodologyNote}</p>
            </div>
          </div>
        </div>

        {/* Documented Formulas */}
        <details className="rounded-2xl border border-slate-200 bg-white p-4 text-xs dark:border-slate-800 dark:bg-slate-900">
          <summary className="cursor-pointer font-bold text-slate-800 dark:text-slate-100">
            View Documented Calculation Formulas &amp; Citations
          </summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {SUSTAINABILITY_ACTIONS.map((a) => (
              <div key={a.id} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                <div className="font-semibold text-slate-900 dark:text-white">{a.label}</div>
                <div className="mt-1 font-mono text-micro text-emerald-700 dark:text-emerald-300">
                  {a.formulaDescription}
                </div>
                <div className="mt-1 text-micro text-slate-500">Source: {a.sourceCitation}</div>
              </div>
            ))}
          </div>
        </details>
      </section>

      {/* Section 2: What-If Pollution Simulator */}
      <section className="rounded-3xl border border-sky-200/80 bg-gradient-to-br from-white to-sky-50/60 p-6 shadow-xs dark:border-slate-800 dark:from-slate-900 dark:to-sky-950/20 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1 text-micro font-bold text-amber-900 dark:text-amber-300">
              <FlaskConical className="h-3.5 w-3.5" />
              {simResult.simulationLabel}
            </span>
            <h2 className="mt-2 text-xl font-extrabold text-slate-900 dark:text-white">
              What-If Urban Scenario Simulator
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Model collective community adoption across a standardized 10,000-household urban district using transparent assumptions.
            </p>
          </div>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {SIMULATOR_SCENARIOS.map((sc) => (
            <button
              key={sc.id}
              type="button"
              onClick={() => {
                setSelectedScenarioId(sc.id);
                setAdoptionPct(sc.defaultPct);
              }}
              className={`rounded-2xl border p-3.5 text-left transition ${
                selectedScenarioId === sc.id
                  ? 'border-sky-500 bg-sky-500/10 ring-1 ring-sky-500/40'
                  : 'border-slate-200 bg-white hover:border-sky-300 dark:border-slate-700 dark:bg-slate-900'
              }`}
            >
              <div className="text-xs font-bold text-slate-900 dark:text-white">{sc.title}</div>
              <div className="mt-1 text-micro text-slate-500 dark:text-slate-400">
                {sc.description}
              </div>
            </button>
          ))}
        </div>

        <div className="grid gap-5 lg:grid-cols-3 items-center">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-200">
              <span>{simResult.scenario.parameterLabel}</span>
              <span className="text-sky-600 dark:text-sky-400">{simResult.adoptionPct}%</span>
            </div>
            <input
              type="range"
              aria-label={simResult.scenario.parameterLabel}
              min={simResult.scenario.minPct}
              max={simResult.scenario.maxPct}
              value={simResult.adoptionPct}
              onChange={(e) => setAdoptionPct(Number(e.target.value))}
              className="mt-3 w-full accent-sky-600"
            />
            <div className="mt-2 text-micro text-slate-500">
              Participating households: <strong>{simResult.participatingHouseholds.toLocaleString()}</strong> of{' '}
              {simResult.scenario.householdsScope.toLocaleString()}
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <div className="text-xs font-semibold text-slate-500">
              Simulated Annual CO₂e Avoided
            </div>
            <div className="mt-1 text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {simResult.annualCo2TonnesAvoided.toLocaleString()} tonnes/yr
            </div>
            <div className="text-xs text-slate-500">
              ~{simResult.monthlyCo2TonnesAvoided} tonnes/month (modeled)
            </div>
          </div>

          <div className="rounded-2xl border border-sky-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <div className="text-xs font-semibold text-slate-500">
              Sector-Activity Change Proxy (Upper Bound)
            </div>
            <div className="mt-1 text-3xl font-black text-sky-600 dark:text-sky-400">
              ~{simResult.localSectorEmissionDropPct}%
            </div>
            <div className="text-micro font-semibold text-sky-800 dark:text-sky-300">
              Sector-activity proxy (upper bound), not AQI
            </div>
            <div className="mt-1 text-micro text-slate-500">
              {simResult.proxyNote} {simResult.scenario.localPm25ProxyNote}
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white/80 p-4 text-xs text-slate-600 dark:bg-slate-900/70 dark:text-slate-300">
          <strong>Transparent Assumptions:</strong>
          <ul className="mt-1 list-disc pl-5 space-y-1">
            {simResult.scenario.assumptions.map((a, idx) => (
              <li key={idx}>{a}</li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
