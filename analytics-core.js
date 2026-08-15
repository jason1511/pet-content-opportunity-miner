export const ANALYTICS_EVENT_TYPES = new Set([
  "homepage_project_opened",
  "research_completed",
  "batch_completed",
  "estimate_completed"
]);

export function sanitizeAnalyticsMetadata(metadata) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return {};
  return Object.fromEntries(
    Object.entries(metadata)
      .filter(([key, value]) =>
        /^[a-zA-Z][a-zA-Z0-9_]{0,39}$/.test(key) &&
        ["string", "number", "boolean"].includes(typeof value)
      )
      .slice(0, 10)
      .map(([key, value]) => [key, typeof value === "string" ? value.slice(0, 80) : value])
  );
}

export function aggregateAnalytics(events, now = new Date()) {
  const valid = events.filter(event =>
    ANALYTICS_EVENT_TYPES.has(event?.type) &&
    typeof event?.timestamp === "string"
  );
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);

  const totals = Object.fromEntries([...ANALYTICS_EVENT_TYPES].map(type => [type, 0]));
  const last7Days = Object.fromEntries([...ANALYTICS_EVENT_TYPES].map(type => [type, 0]));
  const sessions = new Map();
  const daily = new Map();

  for (const event of valid) {
    totals[event.type] += 1;
    const timestamp = new Date(event.timestamp);
    if (timestamp >= sevenDaysAgo && timestamp <= now) last7Days[event.type] += 1;

    const day = event.timestamp.slice(0, 10);
    if (!daily.has(day)) daily.set(day, { day, total: 0 });
    daily.get(day).total += 1;

    if (event.sessionId) {
      if (!sessions.has(event.sessionId)) sessions.set(event.sessionId, new Set());
      sessions.get(event.sessionId).add(event.type);
    }
  }

  let researchUsers = 0;
  let estimatorUsers = 0;
  let crossProjectUsers = 0;
  for (const types of sessions.values()) {
    const usedResearch = types.has("research_completed") || types.has("batch_completed");
    const usedEstimator = types.has("estimate_completed");
    if (usedResearch) researchUsers += 1;
    if (usedEstimator) estimatorUsers += 1;
    if (usedResearch && usedEstimator) crossProjectUsers += 1;
  }

  return {
    generatedAt: now.toISOString(),
    sampleSize: valid.length,
    totals,
    last7Days,
    uniqueSessions: sessions.size,
    researchUsers,
    estimatorUsers,
    crossProjectUsers,
    daily: [...daily.values()].sort((a, b) => a.day.localeCompare(b.day)).slice(-14)
  };
}
