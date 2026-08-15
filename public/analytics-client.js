const SESSION_KEY = "pet-growth-platform:analytics-session:v1";

export function getAnalyticsSessionId() {
  let sessionId = localStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = globalThis.crypto?.randomUUID?.() ||
      `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

export async function trackEvent(type, metadata = {}) {
  try {
    await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        sessionId: getAnalyticsSessionId(),
        metadata
      }),
      keepalive: true
    });
  } catch {
    // Analytics must never block the product workflow.
  }
}

export function bindTrackedLinks(root = document) {
  root.querySelectorAll("[data-analytics-event]").forEach(link => {
    link.addEventListener("click", () => {
      trackEvent(link.dataset.analyticsEvent, {
        project: link.dataset.analyticsProject || "unknown"
      });
    });
  });
}
