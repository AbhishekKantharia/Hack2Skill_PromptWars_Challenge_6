'use client';

import React, { useEffect, useState } from 'react';
import {
  Award,
  CheckCircle2,
  Lock,
  MessageSquarePlus,
  Radio,
  ThumbsUp,
  Trophy,
  Users,
} from 'lucide-react';
import { useBreatheWise } from '@/components/BreatheWiseProvider';
import { apiFetch } from '@/lib/client-api';
import type { CommunityChallenge, CommunityObservation } from '@/types/breathewise';

const CATEGORY_LABELS: Record<CommunityObservation['category'], string> = {
  smoke_haze: 'Visible Smoke / Haze',
  traffic_congestion: 'Heavy Traffic / Idling',
  construction_dust: 'Construction Dust',
  waste_burning: 'Open Waste / Leaf Burning',
  clear_breeze: 'Clear Breeze / Good Visibility',
  green_commute: 'Community Green Commute',
};

export default function CommunityPage() {
  const { activeCity, airQuality } = useBreatheWise();
  const [observations, setObservations] = useState<CommunityObservation[]>([]);
  const [challenges, setChallenges] = useState<CommunityChallenge[]>([]);
  const [neighborhood, setNeighborhood] = useState('');
  const [category, setCategory] = useState<CommunityObservation['category']>('smoke_haze');
  const [severity, setSeverity] = useState<CommunityObservation['severity']>('moderate');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [upvotedIds, setUpvotedIds] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await apiFetch('/api/community', { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!active) return;
        setObservations(data.observations ?? []);
        setChallenges(data.challenges ?? []);
        setUpvotedIds(data.upvotedObservationIds ?? []);
      } catch {
        if (active) setLoadError('Could not load community data. Please retry the page.');
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  function flash(message: string) {
    setStatusMsg(message);
    setTimeout(() => setStatusMsg(null), 4000);
  }

  async function handleSubmitObservation(e: React.FormEvent) {
    e.preventDefault();
    if (!neighborhood.trim() || !description.trim()) return;
    setSubmitting(true);
    try {
      const res = await apiFetch('/api/community', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_observation',
          neighborhood,
          city: activeCity.name,
          category,
          severity,
          description,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        flash(data?.error ?? 'Could not publish your report.');
        return;
      }
      const refresh = await apiFetch('/api/community', { cache: 'no-store' });
      if (refresh.ok) {
        const latest = await refresh.json().catch(() => null);
        if (latest?.observations) setObservations(latest.observations);
      }
      setNeighborhood('');
      setDescription('');
      flash('Observation published as a neighborhood-level user report.');
    } catch {
      flash('Network error. Your report was not published.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpvote(id: string) {
    try {
      const res = await apiFetch('/api/community', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'upvote_observation', id }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        flash(data?.error ?? 'Could not record your confirmation.');
        return;
      }
      setObservations(data.observations);
      if (data.alreadyVoted) flash('You already confirmed this report.');
      else setUpvotedIds((prev) => [...prev, id]);
    } catch {
      flash('Network error. Please try again.');
    }
  }

  async function handleChallengeAction(
    challengeId: string,
    action: 'join_challenge' | 'log_challenge_action'
  ) {
    try {
      const res = await apiFetch('/api/community', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, challengeId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        flash(data?.error ?? 'Could not update challenge progress.');
        return;
      }
      setChallenges(data.challenges);
      if (data.alreadyJoined && action === 'join_challenge') flash('You already joined this challenge.');
    } catch {
      flash('Network error. Please try again.');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <Users className="h-6 w-6 text-emerald-600" />
          Community Clean-Air Network
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Neighborhood pollution observations, collective clean-air challenges, and local achievements — strictly separating official measurements from citizen reports.
        </p>
      </div>

      {/* Privacy & Verification Guardrails */}
      <div className="grid gap-3 md:grid-cols-2">
        <div className="flex items-start gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-3.5 text-xs text-emerald-950 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-100">
          <Radio className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
          <div>
            <strong>Official vs. User-Submitted Distinction:</strong> Current {activeCity.name} telemetry ({airQuality?.aqi ?? '--'} US AQI) comes from <em>{airQuality?.dataMode === 'demo' ? 'clearly labeled Demo Reference Data' : 'the Open-Meteo CAMS atmospheric model grid'}</em>. Certified ground-station readings appear only when a WAQI station is available. Citizen reports below are labeled <strong>User-Submitted</strong> and reflect local perceptions, not calibrated instruments.
          </div>
        </div>

        <div className="flex items-start gap-2.5 rounded-2xl border border-sky-200 bg-sky-50/80 p-3.5 text-xs text-sky-950 dark:border-sky-800/50 dark:bg-sky-950/30 dark:text-sky-100">
          <Lock className="h-4 w-4 shrink-0 text-sky-600 mt-0.5" />
          <div>
            <strong>Privacy Protection:</strong> Never enter your street address or home GPS coordinates. Reports accept neighborhood/district names only and automatically redact coordinate strings.
          </div>
        </div>
      </div>

      {loadError && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs font-semibold text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
          {loadError}
        </div>
      )}

      {/* Neighborhood Challenges */}
      <section className="space-y-3">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-500" />
          Active Neighborhood Clean-Air Challenges
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {challenges.map((ch) => {
            const pct = Math.min(100, Math.round((ch.currentActions / ch.targetActions) * 100));
            return (
              <div
                key={ch.id}
                className="flex flex-col justify-between rounded-3xl border border-emerald-200/70 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 font-semibold text-emerald-700 dark:text-emerald-300">
                      {ch.neighborhood}
                    </span>
                    <span className="inline-flex items-center gap-1 text-amber-600 font-semibold">
                      <Award className="h-3.5 w-3.5" />
                      {ch.badgeName}
                    </span>
                  </div>
                  <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-white">
                    {ch.title}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    {ch.description}
                  </p>

                  <div className="mt-4">
                    <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                      <span>
                        {ch.currentActions} / {ch.targetActions} actions
                      </span>
                      <span>{pct}%</span>
                    </div>
                    <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-sky-500 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="mt-2 text-[11px] text-slate-500">
                      {ch.participantsCount} participants · Ends {ch.endsOn}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  {!ch.joined ? (
                    <button
                      type="button"
                      onClick={() => void handleChallengeAction(ch.id, 'join_challenge')}
                      className="flex-1 rounded-xl border border-emerald-500 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300"
                    >
                      Join Challenge
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-500/15 px-3 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Joined
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleChallengeAction(ch.id, 'log_challenge_action')}
                    className="flex-1 rounded-xl bg-gradient-to-r from-emerald-600 to-sky-600 px-3 py-2 text-xs font-bold text-white transition hover:brightness-110"
                  >
                    + Log Action
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Observations Form + Feed */}
      <div className="grid gap-6 lg:grid-cols-3">
        <form
          onSubmit={(e) => void handleSubmitObservation(e)}
          className="rounded-3xl border border-emerald-200/70 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3 h-fit"
        >
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <MessageSquarePlus className="h-4 w-4 text-sky-600" />
            Submit Local Observation
          </h2>
          <p className="text-xs text-slate-500">
            City: <strong>{activeCity.name}</strong> (use general neighborhood name only)
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Neighborhood / Corridor Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g., North Station Market"
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as CommunityObservation['category'])
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Perceived Level
              </label>
              <select
                value={severity}
                onChange={(e) =>
                  setSeverity(e.target.value as CommunityObservation['severity'])
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="low">Low / Positive</option>
                <option value="moderate">Moderate</option>
                <option value="high">High / Intense</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Observation Details
            </label>
            <textarea
              required
              rows={3}
              placeholder="Describe visible haze, traffic idling, or positive community action..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Share Community Report'}
          </button>

          {statusMsg && (
            <div className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
              {statusMsg}
            </div>
          )}
        </form>

        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Recent Neighborhood Observations ({observations.length})
          </h2>
          {observations.map((obs) => (
            <div
              key={obs.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-sm text-slate-900 dark:text-white">
                    {obs.neighborhood}
                  </span>
                  <span className="text-xs text-slate-500">· {obs.city}</span>
                  <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800 dark:text-amber-300">
                    User-Submitted Report
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-slate-500">
                  {CATEGORY_LABELS[obs.category]}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
                {obs.description}
              </p>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <span>{new Date(obs.createdAt).toLocaleString()}</span>
                <button
                  type="button"
                  onClick={() => void handleUpvote(obs.id)}
                  disabled={upvotedIds.includes(obs.id)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 font-semibold text-slate-700 hover:border-emerald-400 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200"
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                  {upvotedIds.includes(obs.id) ? 'Confirmed' : 'Confirm'} ({obs.upvotes})
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
