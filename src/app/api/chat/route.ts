import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { generateAssistantReply } from '@/lib/ai-assistant';
import { getAirQualityForLocation } from '@/lib/air-quality-service';
import {
  appendChatMessages,
  clearChatHistory,
  getChatHistory,
  getSettings,
} from '@/lib/store';
import { getSessionId, rateLimitKey } from '@/lib/request-context';
import { checkRateLimit } from '@/lib/rate-limit';
import { resolveDemoMode } from '@/lib/demo-mode';
import {
  asText,
  parseCityLocation,
  parseSensitivityGroup,
  readJsonObject,
} from '@/lib/validation';
import type { ChatMessage } from '@/types/breathewise';

export async function GET(req: NextRequest) {
  const history = await getChatHistory(getSessionId(req));
  return NextResponse.json({ history });
}

export async function DELETE(req: NextRequest) {
  await clearChatHistory(getSessionId(req));
  return NextResponse.json({ cleared: true });
}

export async function POST(req: NextRequest) {
  try {
    const sessionId = getSessionId(req);
    const limit = checkRateLimit(rateLimitKey(sessionId, req, 'chat'));
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a minute and try again.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
      );
    }

    const body = await readJsonObject(req);
    const question = asText(body?.question, 1000);
    if (!question) {
      return NextResponse.json(
        { error: 'Question is required (maximum 1000 characters)' },
        { status: 400 }
      );
    }

    const settings = await getSettings(sessionId);
    const location =
      parseCityLocation(body?.location) ?? settings.defaultCity;
    const forceDemo = resolveDemoMode(
      typeof body?.forceDemoMode === 'boolean' ? body.forceDemoMode : undefined,
      settings.forceDemoMode
    );
    const sensitivityGroup =
      parseSensitivityGroup(body?.sensitivityGroup) ?? settings.sensitivityGroup;

    const airQuality = await getAirQualityForLocation(location, {
      forceDemoMode: forceDemo,
    });

    const existingHistory = await getChatHistory(sessionId);
    const reply = await generateAssistantReply({
      question,
      airQuality,
      sensitivityGroup,
      history: existingHistory.slice(-6).map((m) => ({
        role: m.role,
        content: m.content.slice(0, 1000),
      })),
    });

    const now = new Date().toISOString();
    const userMsg: ChatMessage = {
      id: `user-${randomUUID()}`,
      role: 'user',
      content: question,
      timestamp: now,
      cityContext: airQuality.location.name,
      aqiContext: airQuality.aqi,
      dataMode: airQuality.dataMode,
    };
    const assistantMsg: ChatMessage = {
      id: `assistant-${randomUUID()}`,
      role: 'assistant',
      content: reply.answer,
      timestamp: new Date().toISOString(),
      cityContext: airQuality.location.name,
      aqiContext: airQuality.aqi,
      dataMode: airQuality.dataMode,
      sources: reply.sources,
      uncertaintyNote: reply.uncertaintyNote,
    };

    await appendChatMessages([userMsg, assistantMsg], sessionId);
    return NextResponse.json({
      userMessage: userMsg,
      assistantMessage: assistantMsg,
      provider: reply.usedProvider,
    });
  } catch {
    return NextResponse.json({ error: 'AI assistant request failed' }, { status: 500 });
  }
}
