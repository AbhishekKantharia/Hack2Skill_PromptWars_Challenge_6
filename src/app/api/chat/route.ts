import { NextRequest, NextResponse } from 'next/server';
import { generateAssistantReply } from '@/lib/ai-assistant';
import { getAirQualityForLocation } from '@/lib/air-quality-service';
import {
  appendChatMessages,
  clearChatHistory,
  getChatHistory,
  getSettings,
} from '@/lib/store';
import type { ChatMessage, CityLocation } from '@/types/breathewise';

export async function GET() {
  const history = await getChatHistory();
  return NextResponse.json({ history });
}

export async function DELETE() {
  await clearChatHistory();
  return NextResponse.json({ cleared: true });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const question = String(body.question ?? '').trim();
    if (!question) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    const settings = await getSettings();
    const location: CityLocation = body.location ?? settings.defaultCity;
    const forceDemo =
      typeof body.forceDemoMode === 'boolean' ? body.forceDemoMode : settings.forceDemoMode;

    const airQuality = await getAirQualityForLocation(location, {
      forceDemoMode: forceDemo,
    });

    const existingHistory = await getChatHistory();
    const reply = await generateAssistantReply({
      question,
      airQuality,
      sensitivityGroup: body.sensitivityGroup ?? settings.sensitivityGroup,
      history: existingHistory.map((m) => ({ role: m.role, content: m.content })),
    });

    const now = new Date().toISOString();
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: question,
      timestamp: now,
      cityContext: airQuality.location.name,
      aqiContext: airQuality.aqi,
      dataMode: airQuality.dataMode,
    };

    const assistantMsg: ChatMessage = {
      id: `assistant-${Date.now() + 1}`,
      role: 'assistant',
      content: reply.answer,
      timestamp: new Date().toISOString(),
      cityContext: airQuality.location.name,
      aqiContext: airQuality.aqi,
      dataMode: airQuality.dataMode,
      sources: reply.sources,
      uncertaintyNote: reply.uncertaintyNote,
    };

    await appendChatMessages([userMsg, assistantMsg]);

    return NextResponse.json({
      userMessage: userMsg,
      assistantMessage: assistantMsg,
      provider: reply.usedProvider,
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'AI assistant request failed', detail: String(err) },
      { status: 500 }
    );
  }
}
