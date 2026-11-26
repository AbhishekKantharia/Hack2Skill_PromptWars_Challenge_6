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
import { withApiPolicy } from '@/lib/api-route';
import { checkAiBudget } from '@/lib/spend-cap';
import { resolveDemoMode } from '@/lib/demo-mode';
import {
  asText,
  parseCityLocation,
  parseSensitivityGroup,
  readJsonObject,
} from '@/lib/validation';
import type { ChatMessage } from '@/types/breathewise';

export const GET = withApiPolicy('chat-read', 'Failed to load chat history', async (req: NextRequest) => {
  const history = await getChatHistory(getSessionId(req));
  return NextResponse.json({ history });
});

export const DELETE = withApiPolicy('chat-delete', 'Failed to clear chat history', async (req: NextRequest) => {
  await clearChatHistory(getSessionId(req));
  return NextResponse.json({ cleared: true });
});

export const POST = withApiPolicy('chat', 'AI assistant request failed', async (req: NextRequest) => {
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
  const location = parseCityLocation(body?.location) ?? settings.defaultCity;
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
});
