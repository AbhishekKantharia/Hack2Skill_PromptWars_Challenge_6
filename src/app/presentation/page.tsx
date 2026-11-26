'use client';

import React from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Cpu,
  Globe,
  HeartHandshake,
  Lightbulb,
  Presentation,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useBreatheWise } from '@/components/BreatheWiseProvider';

export default function PresentationPage() {
  const { airQuality } = useBreatheWise();

  const pillars = [
    {
      badge: '01 · PROBLEM',
      title: 'Urban Air Pollution Disrupts Everyday Decisions',
      icon: AlertTriangle,
      accent: 'text-rose-600 bg-rose-500/10 border-rose-200 dark:border-rose-800/50',
      summary:
        'Millions of families check raw AQI numbers every morning but still struggle to answer practical questions: When is it safe for kids to play outside? Should I open my windows tonight? What can I actually afford if I cannot buy a $300 purifier?',
      points: [
        'Raw numbers lack context, timing windows, and indoor vs. outdoor tradeoffs.',
        'Low-income households are often overlooked by hardware-first air apps.',
        'False claims and ungrounded AI chatbots risk overstating protection.',
      ],
    },
    {
      badge: '02 · SOLUTION',
      title: 'BreatheWise AI Converts Data Into Daily Actions',
      icon: Sparkles,
      accent: 'text-emerald-600 bg-emerald-500/10 border-emerald-200 dark:border-emerald-800/50',
      summary:
        'BreatheWise AI pairs live atmospheric forecasts with explainable Generative AI to build a personalized Morning–Afternoon–Evening routine, budget-tiered indoor advice, and measurable climate/emission habits.',
      points: [
        'Signature "My Cleaner Day" planner tailored to sensitivity & commute mode.',
        'Indoor Air Advisor split into Free ($0), Affordable, and Advanced tiers.',
        'Transparent Sustainability Calculator & What-If Urban Scenario Simulator.',
      ],
    },
    {
      badge: '03 · INNOVATION',
      title: 'Explainable, Safety-First Environmental GenAI',
      icon: Lightbulb,
      accent: 'text-sky-600 bg-sky-500/10 border-sky-200 dark:border-sky-800/50',
      summary:
        'Instead of opaque answers, every recommendation includes WHY it matters, its estimated cost, expected benefit, and honest scientific limitations — grounded directly in live telemetry or clearly labeled Demo Mode.',
      points: [
        'Explicit uncertainty ranges and model-vs-roadside caveats.',
        'Never invents sensor measurements or makes medical diagnoses.',
        'Strict separation between GHG CO₂e savings and local air pollutant effects.',
      ],
    },
    {
      badge: '04 · TECHNOLOGY',
      title: 'Modern Full-Stack & Resilient Architecture',
      icon: Cpu,
      accent: 'text-indigo-600 bg-indigo-500/10 border-indigo-200 dark:border-indigo-800/50',
      summary:
        'Built with Next.js App Router, React, TypeScript, Tailwind CSS, Recharts, Leaflet spatial mapping, Supabase/PostgreSQL schema, Open-Meteo CAMS environmental APIs, and Gemini/OpenAI with zero-downtime Demo fallback.',
      points: [
        'Works out-of-the-box live via Open-Meteo or offline via Demo Mode.',
        'Multi-channel Intelligent Alerts (spikes, severe AQI, ventilation windows).',
        'Automated Vitest suite validating EPA AQI math, impact formulas, and safety.',
      ],
    },
    {
      badge: '05 · SOCIAL IMPACT',
      title: 'Healthier Families & Active Neighborhoods',
      icon: HeartHandshake,
      accent: 'text-teal-600 bg-teal-500/10 border-teal-200 dark:border-teal-800/50',
      summary:
        'Empowers families across budgets to reduce personal pollution exposure today while organizing privacy-preserving neighborhood clean-air challenges that build lasting low-emission habits.',
      points: [
        'Actionable $0 strategies (ventilation timing, smoke avoidance, route choice).',
        'Privacy-first community observations (never exposes home coordinates).',
        'Collective action tracking across transit, zero-idling, and clean kitchens.',
      ],
    },
  ];

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-600 via-teal-600 to-sky-700 p-8 text-white shadow-xl">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold backdrop-blur-xs">
          <Presentation className="h-3.5 w-3.5" />
          COMPETITION PRESENTATION DECK
        </div>
        <h1 className="mt-4 text-3xl sm:text-4xl font-black tracking-tight">
          BreatheWise AI — Your Intelligent Urban Air Quality Companion
        </h1>
        <p className="mt-2 max-w-3xl text-sm sm:text-base text-emerald-50">
          Turning complex atmospheric telemetry into explainable, equitable, and privacy-safe daily actions for healthier families and cleaner cities.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-emerald-800 shadow-sm hover:bg-emerald-50"
          >
            Launch Live Dashboard
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/cleaner-day"
            className="inline-flex items-center gap-2 rounded-xl border border-white/40 bg-white/10 px-4 py-2.5 text-sm font-bold text-white hover:bg-white/20"
          >
            Demo &ldquo;My Cleaner Day&rdquo;
          </Link>
          {airQuality && (
            <span className="rounded-xl bg-slate-950/30 px-3 py-2 text-xs font-medium">
              Live Context: {airQuality.location.name} · {airQuality.aqi} US AQI ({airQuality.dataMode.toUpperCase()})
            </span>
          )}
        </div>
      </div>

      {/* 5 Pillars */}
      <div className="grid gap-5 md:grid-cols-2">
        {pillars.map((p) => {
          const Icon = p.icon;
          return (
            <div
              key={p.badge}
              className="rounded-3xl border border-emerald-200/70 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between gap-2">
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${p.accent}`}>
                  <Icon className="h-3.5 w-3.5" />
                  {p.badge}
                </span>
              </div>
              <h2 className="mt-3 text-lg font-extrabold text-slate-900 dark:text-white">
                {p.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {p.summary}
              </p>
              <ul className="mt-4 space-y-1.5 text-xs text-slate-700 dark:text-slate-200">
                {p.points.map((pt, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}

        {/* Quick Judge Tour Card */}
        <div className="rounded-3xl border border-sky-200 bg-gradient-to-br from-sky-50 to-emerald-50 p-6 dark:border-slate-800 dark:from-sky-950/30 dark:to-emerald-950/30 flex flex-col justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-sky-600 px-3 py-1 text-xs font-bold text-white">
              <Globe className="h-3.5 w-3.5" />
              2-MINUTE JUDGE WALKTHROUGH
            </div>
            <h2 className="mt-3 text-lg font-extrabold text-slate-900 dark:text-white">
              Interactive Capabilities to Try
            </h2>
            <ol className="mt-3 space-y-2 text-xs text-slate-700 dark:text-slate-200 list-decimal pl-4">
              <li>Switch cities in the top search bar (e.g., New Delhi vs. San Francisco) to see real-time AQI, alerts, and forecasts adapt.</li>
              <li>Open <strong>AI Quality Assistant</strong> and ask &ldquo;Is it safe to exercise outdoors today?&rdquo;</li>
              <li>Generate a personalized schedule in <strong>My Cleaner Day</strong> with $0 budget tier.</li>
              <li>Explore <strong>Impact &amp; Simulator</strong> to test the 20% car-trip replacement scenario.</li>
              <li>Log a neighborhood action in <strong>Community Network</strong>.</li>
            </ol>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/assistant"
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-700"
            >
              <Bot className="h-3.5 w-3.5" /> Try AI Assistant
            </Link>
            <Link
              href="/calculator"
              className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-sky-700"
            >
              Try What-If Simulator
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
