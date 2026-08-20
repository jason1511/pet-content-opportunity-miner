let securityConfigPromise;
let turnstileScriptPromise;

export async function protectedJsonFetch(url, payload, options = {}) {
  const config = await getSecurityConfig();
  let turnstileToken = null;

  if (options.turnstile && config.turnstileEnabled) {
    turnstileToken = await requestTurnstileToken(config.turnstileSiteKey);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 45000);
  try {
    return await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, turnstileToken }),
    signal: controller.signal
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("The request took too long. Please try again.");
    }
    throw new Error("The service could not be reached. Please check your connection and try again.");
  } finally {
    clearTimeout(timeout);
  }
}

export async function readApiError(response, fallback = "Request failed") {
  let body = {};
  try { body = await response.json(); } catch { /* use fallback */ }
  const error = new Error(body.error || fallback);
  error.code = body.code || "request_failed";
  error.status = response.status;
  return error;
}

async function getSecurityConfig() {
  if (!securityConfigPromise) {
    securityConfigPromise = fetch("/api/config")
      .then(response => response.ok ? response.json() : {})
      .catch(() => ({}));
  }
  return securityConfigPromise;
}

async function requestTurnstileToken(siteKey) {
  await loadTurnstileScript();
  const container = ensureTurnstileContainer();

  return new Promise((resolve, reject) => {
    const widgetId = window.turnstile.render(container, {
      sitekey: siteKey,
      size: "invisible",
      execution: "execute",
      callback: token => {
        window.turnstile.remove(widgetId);
        resolve(token);
      },
      "error-callback": () => {
        window.turnstile.remove(widgetId);
        reject(new Error("Security check failed. Please try again."));
      },
      "expired-callback": () => {
        window.turnstile.remove(widgetId);
        reject(new Error("Security check expired. Please try again."));
      }
    });
    window.turnstile.execute(widgetId);
  });
}

function loadTurnstileScript() {
  if (window.turnstile) return Promise.resolve();
  if (turnstileScriptPromise) return turnstileScriptPromise;

  turnstileScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error("Could not load the security check."));
    document.head.append(script);
  });
  return turnstileScriptPromise;
}

function ensureTurnstileContainer() {
  let container = document.getElementById("turnstile-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "turnstile-container";
    container.setAttribute("aria-live", "polite");
    document.body.append(container);
  }
  return container;
}
