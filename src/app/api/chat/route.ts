import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { generateAssistantReply } from '@/lib/ai-assistant';
import { getAirQualityForLocation } from '@/lib/air-quality-service';
import { buildDailyRecommendations } from '@/lib/impact-engine';
import {
  appendChatMessages,
  clearChatHistory,
  getChatHistory,
  getSettings,
} from '@/lib/store';
import { getClientIp, getSessionId } from '@/lib/request-context';
import { enforceApiPolicy } from '@/lib/api-security';
import { checkAiBudget } from '@/lib/spend-cap';
import { resolveDemoMode } from '@/lib/demo-mode';
import {
  asText,
  parseCityLocation,
  parseSensitivityGroup,
  readJsonObject,
} from '@/lib/validation';
import type { ChatMessage } from '@/types/breathewise';

export async function GET(req: NextRequest) {
  const denied = enforceApiPolicy(req, 'chat-read');
  if (denied) return denied;
  const history = await getChatHistory(getSessionId(req));
  return NextResponse.json({ history });
}

export async function DELETE(req: NextRequest) {
  const denied = enforceApiPolicy(req, 'chat-delete');
  if (denied) return denied;
  await clearChatHistory(getSessionId(req));
  return NextResponse.json({ cleared: true });
}

export async function POST(req: NextRequest) {
  try {
    const denied = enforceApiPolicy(req, 'chat');
    if (denied) return denied;
    const sessionId = getSessionId(req);
    const body = await readJsonObject(req);
    const question = asText(body?.question, 1000);
    if (!question) {
      return NextResponse.json(
        { error: 'Question is required (maximum 1000 characters)' },
        { status: 400 }
      );
    }

    const budget = checkAiBudget(`${sessionId}:${getClientIp(req)}`);
    if (!budget.allowed) {
      return NextResponse.json(
        { error: 'AI daily request cap reached. Please try again tomorrow.' },
        { status: 429, headers: { 'Retry-After': String(budget.retryAfterSeconds) } }
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

    const reply = await generateAssistantReply({
      question,
      airQuality,
      sensitivityGroup,
      spaceType: settings.spaceType,
      groupSize: settings.groupSize,
      recommendations: buildDailyRecommendations(airQuality, settings),
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
