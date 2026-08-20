export class UpstreamError extends Error {
  constructor(service, status, code = "upstream_error") {
    super(`${service} request failed`);
    this.name = "UpstreamError";
    this.service = service;
    this.status = status;
    this.code = code;
  }
}

export async function fetchWithRetry(url, options = {}, policy = {}) {
  const attempts = policy.attempts || 2;
  const timeoutMs = policy.timeoutMs || 20000;
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      if (!shouldRetry(response.status) || attempt === attempts) return response;
      lastError = new UpstreamError(policy.service || "Upstream", response.status);
    } catch (error) {
      lastError = error;
      if (attempt === attempts) throw error;
    } finally {
      clearTimeout(timeout);
    }

    await wait(300 * attempt);
  }

  throw lastError || new Error("Request failed");
}

export function serviceStatus(env) {
  return {
    status: env.OPENAI_API_KEY && env.VET_ESTIMATES ? "operational" : "degraded",
    services: {
      ai: Boolean(env.OPENAI_API_KEY),
      storage: Boolean(env.VET_ESTIMATES),
      turnstile: Boolean(env.TURNSTILE_SITE_KEY && env.TURNSTILE_SECRET_KEY)
    },
    checkedAt: new Date().toISOString()
  };
}

export function requireOpenAi(env) {
  return typeof env.OPENAI_API_KEY === "string" && env.OPENAI_API_KEY.startsWith("sk-");
}

function shouldRetry(status) {
  return status === 408 || status === 409 || status === 429 || status >= 500;
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
