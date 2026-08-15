import test from "node:test";
import assert from "node:assert/strict";
import { aggregateAnalytics, sanitizeAnalyticsMetadata } from "../analytics-core.js";

test("analytics aggregates totals and cross-project sessions", () => {
  const events = [
    { type: "research_completed", sessionId: "session-1", timestamp: "2026-08-15T01:00:00.000Z" },
    { type: "estimate_completed", sessionId: "session-1", timestamp: "2026-08-15T02:00:00.000Z" },
    { type: "estimate_completed", sessionId: "session-2", timestamp: "2026-08-14T02:00:00.000Z" }
  ];
  const result = aggregateAnalytics(events, new Date("2026-08-15T12:00:00.000Z"));
  assert.equal(result.totals.research_completed, 1);
  assert.equal(result.totals.estimate_completed, 2);
  assert.equal(result.uniqueSessions, 2);
  assert.equal(result.crossProjectUsers, 1);
});

test("analytics metadata removes nested and oversized values", () => {
  const value = sanitizeAnalyticsMetadata({
    petType: "dog",
    score: 8,
    nested: { secret: true },
    long: "x".repeat(200)
  });
  assert.deepEqual(value, { petType: "dog", score: 8, long: "x".repeat(80) });
});
