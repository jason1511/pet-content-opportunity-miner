const DEFAULT_LIMITS = {
  autocomplete: { minute: 40, day: 400 },
  questions: { minute: 12, day: 80 },
  mine: { minute: 8, day: 40 },
  estimate: { minute: 30, day: 250 },
  events: { minute: 60, day: 600 },
  share: { minute: 10, day: 60 }
};

export async function enforceRequestLimits(request, env, route) {
  if (!env.VET_ESTIMATES) return null;

  const limits = DEFAULT_LIMITS[route] || { minute: 20, day: 200 };
  const clientId = await createClientId(request);
  const now = new Date();
  const minuteBucket = now.toISOString().slice(0, 16);
  const dayBucket = now.toISOString().slice(0, 10);

  const minuteResult = await incrementCounter(
    env.VET_ESTIMATES,
    `limit:${route}:minute:${minuteBucket}:${clientId}`,
    120
  );
  if (minuteResult > limits.minute) {
    return rateLimitResponse("Too many requests. Please wait a minute and try again.", 60);
  }

  const dayResult = await incrementCounter(
    env.VET_ESTIMATES,
    `limit:${route}:day:${dayBucket}:${clientId}`,
    172800
  );
  if (dayResult > limits.day) {
    return rateLimitResponse("Daily usage limit reached. Please try again tomorrow.", secondsUntilTomorrow(now));
  }

  return null;
}

export async function verifyTurnstile(request, env, token) {
  if (!env.TURNSTILE_SECRET_KEY) return { success: true, configured: false };
  if (!token || typeof token !== "string") {
    return { success: false, error: "Please complete the security check and try again." };
  }

  const form = new FormData();
  form.append("secret", env.TURNSTILE_SECRET_KEY);
  form.append("response", token);
  const remoteIp = request.headers.get("CF-Connecting-IP");
  if (remoteIp) form.append("remoteip", remoteIp);

  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: form
    });
    const result = await response.json();
    return result.success
      ? { success: true, configured: true }
      : { success: false, error: "Security check expired or failed. Please try again." };
  } catch {
    return { success: false, error: "Security verification is temporarily unavailable." };
  }
}

export function getPublicSecurityConfig(env) {
  return {
    turnstileEnabled: Boolean(env.TURNSTILE_SITE_KEY && env.TURNSTILE_SECRET_KEY),
    turnstileSiteKey: env.TURNSTILE_SITE_KEY || null
  };
}

async function createClientId(request) {
  const source = [
    request.headers.get("CF-Connecting-IP") || "unknown",
    request.headers.get("User-Agent") || "unknown"
  ].join("|");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(source));
  return [...new Uint8Array(digest)]
    .slice(0, 12)
    .map(value => value.toString(16).padStart(2, "0"))
    .join("");
}

async function incrementCounter(kv, key, ttl) {
  const current = Number(await kv.get(key)) || 0;
  const next = current + 1;
  await kv.put(key, String(next), { expirationTtl: ttl });
  return next;
}

function secondsUntilTomorrow(now) {
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  return Math.max(60, Math.ceil((tomorrow - now) / 1000));
}

function rateLimitResponse(message, retryAfter) {
  return new Response(JSON.stringify({ error: message, code: "rate_limited" }), {
    status: 429,
    headers: {
      "Content-Type": "application/json",
      "Retry-After": String(retryAfter)
    }
  });
}
