interface BudgetState {
  day: string;
  count: number;
}

const budgets = new Map<string, BudgetState>();

function dailyCap(): number {
  const parsed = Number(process.env.AI_DAILY_REQUEST_CAP ?? '200');
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 200;
}

export function checkAiBudget(sessionId: string): {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
} {
  const day = new Date().toISOString().slice(0, 10);
  const cap = dailyCap();
  const state = budgets.get(sessionId);
  if (!state || state.day !== day) {
    budgets.set(sessionId, { day, count: 1 });
    return { allowed: true, remaining: cap - 1, retryAfterSeconds: 0 };
  }
  if (state.count >= cap) {
    const secondsUntilMidnight =
      86_400 - Math.floor(Date.now() / 1000) % 86_400;
    return { allowed: false, remaining: 0, retryAfterSeconds: secondsUntilMidnight };
  }
  state.count += 1;
  return { allowed: true, remaining: cap - state.count, retryAfterSeconds: 0 };
}
