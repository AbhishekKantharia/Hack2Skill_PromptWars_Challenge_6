'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Bot, Loader2, Send, ShieldCheck, Sparkles, Trash2, User } from 'lucide-react';
import { useBreatheWise } from '@/components/BreatheWiseProvider';
import { apiFetch } from '@/lib/client-api';
import type { ChatMessage } from '@/types/breathewise';

const SUGGESTED_QUESTIONS = [
  'Is it safe to exercise outdoors today?',
  'How can I protect my family during winter smog?',
  'How can I improve indoor air quality?',
  'What is the best commuting option today?',
  "How can I reduce my household's pollution contribution?",
];

export default function AssistantPage() {
  const { activeCity, airQuality, settings } = useBreatheWise();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [providerLabel, setProviderLabel] = useState<string>('Grounded Environmental AI');
  const endRef = useRef<HTMLDivElement>(null);
  const localIdRef = useRef(0);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch('/api/chat', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setMessages(data.history ?? []);
        }
      } catch {
        // Empty initial state
      }
    })();
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  async function handleSend(questionText: string) {
    const trimmed = questionText.trim();
    if (!trimmed || sending) return;

    const optimisticUser: ChatMessage = {
      id: `local-${++localIdRef.current}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
      cityContext: activeCity.name,
      aqiContext: airQuality?.aqi,
      dataMode: airQuality?.dataMode,
    };

    setMessages((prev) => [...prev, optimisticUser]);
    setInput('');
    setSending(true);

    try {
      const res = await apiFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: trimmed,
          location: activeCity,
          sensitivityGroup: settings.sensitivityGroup,
          forceDemoMode: settings.forceDemoMode,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? 'Chat request failed');
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== optimisticUser.id),
        data.userMessage,
        data.assistantMessage,
      ]);
      if (data.provider === 'gemini') setProviderLabel('Google Gemini + Live Context');
      else if (data.provider === 'openai') setProviderLabel('OpenAI + Live Context');
      else setProviderLabel('Grounded Environmental AI Engine');
    } catch (err) {
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== `local-${localIdRef.current}`),
        {
          id: `err-${++localIdRef.current}`,
          role: 'assistant',
          content: err instanceof Error && err.message.includes('Too many')
            ? 'Too many requests right now. Please wait a minute and try again.'
            : `Sorry, the AI service could not complete that request: ${err instanceof Error ? err.message : 'Unknown error'}`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  async function handleClear() {
    try {
      const res = await apiFetch('/api/chat', { method: 'DELETE' });
      if (res.ok) setMessages([]);
    } catch {
      // Keep history visible if the server is unreachable.
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-h1 text-slate-900 dark:text-white flex items-center gap-2">
            <Bot className="h-6 w-6 text-emerald-600" />
            AI Air Quality Assistant
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Context-aware guidance grounded in{' '}
            <span className="font-semibold text-emerald-700 dark:text-emerald-400">
              {activeCity.name}
            </span>{' '}
            ({airQuality ? `${airQuality.aqi} US AQI · ${airQuality.dataMode.toUpperCase()}` : 'Loading...'}) · Engine:{' '}
            <span className="font-medium">{providerLabel}</span>
          </p>
        </div>

        {messages.length > 0 && (
          <button
            type="button"
            onClick={() => void handleClear()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-rose-300 hover:text-rose-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear History
          </button>
        )}
      </div>

      {/* Safety & Reliability Banner */}
      <div className="flex items-start gap-2.5 rounded-2xl border border-sky-200 bg-sky-50/80 p-3.5 text-xs text-sky-950 dark:border-sky-800/60 dark:bg-sky-950/40 dark:text-sky-100">
        <ShieldCheck className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400 mt-0.5" />
        <div>
          <strong>AI Safety &amp; Transparency:</strong> Responses explain <em>why</em> each step matters, include low-cost/free alternatives, state model uncertainty, and avoid medical diagnoses. If a provider key is configured, your question and current air-quality context are sent to that AI provider; do not share sensitive personal details. For respiratory symptoms or health decisions, consult a qualified healthcare professional.
        </div>
      </div>

      {/* Suggested Questions */}
      <div className="flex flex-wrap gap-2">
        {SUGGESTED_QUESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => void handleSend(q)}
            disabled={sending}
            className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white px-3.5 py-1.5 text-xs font-medium text-emerald-800 shadow-2xs transition hover:border-emerald-400 hover:bg-emerald-50 disabled:opacity-50 dark:border-emerald-800/60 dark:bg-slate-900 dark:text-emerald-300 dark:hover:bg-emerald-950/50"
          >
            <Sparkles className="h-3 w-3 text-emerald-500" />
            {q}
          </button>
        ))}
      </div>

      {/* Chat Stream */}
      <div className="flex h-[520px] flex-col rounded-3xl border border-emerald-200/70 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900/90 overflow-hidden">
        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center max-w-md mx-auto">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-sky-600 text-white shadow-md">
                <Bot className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-h2 text-slate-900 dark:text-white">
                Ask anything about urban air quality &amp; daily safety
              </h2>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                Try one of the suggested questions above or ask about outdoor workouts, kids’ school commutes, indoor cooking smoke, or budget filtration for{' '}
                <strong>{activeCity.name}</strong>.
              </p>
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.role === 'assistant' && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-sky-600 text-white">
                    <Bot className="h-4 w-4" />
                  </div>
                )}

                <div
                  className={`min-w-0 max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-emerald-600 text-white'
                      : 'border border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-100'
                  }`}
                >
                  <div className="whitespace-pre-wrap break-words">{m.content}</div>
                  <div
                    className={`mt-2 flex flex-wrap items-center gap-2 text-micro ${
                      m.role === 'user'
                        ? 'text-emerald-100'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    <span>{new Date(m.timestamp).toLocaleTimeString()}</span>
                    {m.cityContext && <span>· {m.cityContext}</span>}
                    {typeof m.aqiContext === 'number' && <span>· {m.aqiContext} AQI</span>}
                    {m.dataMode && <span>· {m.dataMode.toUpperCase()}</span>}
                  </div>
                  {m.role === 'assistant' && m.sources && m.sources.length > 0 && (
                    <div className="mt-2 border-t border-slate-200 pt-2 text-micro text-slate-500 dark:border-slate-700 dark:text-slate-400">
                      <strong>Grounding references:</strong> {m.sources.join(' · ')}
                      {m.uncertaintyNote && (
                        <span className="mt-1 block">
                          <strong>Uncertainty:</strong> {m.uncertaintyNote}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {m.role === 'user' && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))
          )}

          {sending && (
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-sky-600 text-white">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                Retrieving environmental readings for {activeCity.name} &amp; preparing personalized guidance...
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Input Composer */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSend(input);
          }}
          className="border-t border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/60"
        >
          <div className="flex items-center gap-2">
            <input
              type="text"
              maxLength={1000}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask BreatheWise AI about ${activeCity.name} air quality...`}
              aria-label="Ask a question about air quality"
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">Ask AI</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
