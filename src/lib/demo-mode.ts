export function resolveDemoMode(
  explicit: boolean | undefined,
  sessionPreference: boolean | undefined
): boolean {
  if (typeof explicit === 'boolean') return explicit;
  if (typeof sessionPreference === 'boolean') return sessionPreference;
  return process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || process.env.DEMO_MODE === 'true';
}
