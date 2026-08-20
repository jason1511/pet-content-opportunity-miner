import { calculateVetEstimate, validateVetEstimateInput } from "./vet-cost-data.js";
import {
  aggregateAnalytics,
  ANALYTICS_EVENT_TYPES,
  sanitizeAnalyticsMetadata
} from "./analytics-core.js";
import {
  enforceRequestLimits,
  getPublicSecurityConfig,
  verifyTurnstile
} from "./security.js";
import { fetchWithRetry, requireOpenAi, serviceStatus } from "./reliability.js";
import { checkAdminAuthorization } from "./admin-auth.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/api/config") {
      return jsonResponse(getPublicSecurityConfig(env));
    }
    if (request.method === "GET" && url.pathname === "/api/status") {
      return jsonResponse(serviceStatus(env));
    }
    if (request.method === "POST" && url.pathname === "/api/share") {
      const limited = await enforceRequestLimits(request, env, "share");
      if (limited) return limited;
      return handleCreateShare(request, env, url);
    }
    if (request.method === "GET" && url.pathname.startsWith("/api/share/")) {
      return handleGetShare(env, url.pathname.slice("/api/share/".length));
    }
if (request.method === "GET" && url.pathname === "/api/autocomplete") {
  try {
    const limited = await enforceRequestLimits(request, env, "autocomplete");
    if (limited) return limited;
    const keyword = url.searchParams.get("keyword")?.trim();

    if (!keyword) {
      return jsonResponse({ error: "Keyword required" }, 400);
    }

    const autocompleteUrl =
      `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(keyword)}`;

    const response = await fetchWithRetry(autocompleteUrl, {
      headers: {
        "Accept": "application/json"
      }
    }, { attempts: 2, timeoutMs: 7000, service: "Autocomplete" });

    if (!response.ok) {
      return jsonResponse({ error: "Autocomplete fetch failed" }, 500);
    }

    const data = await response.json();

    const suggestions = Array.isArray(data?.[1]) ? data[1] : [];

    return jsonResponse({ keyword, suggestions });
  } catch (error) {
    return jsonResponse(
      { error: "Autocomplete request failed", details: error.message },
      500
    );
  }
}
if (request.method === "POST" && url.pathname === "/api/questions") {
  try {
    const limited = await enforceRequestLimits(request, env, "questions");
    if (limited) return limited;
    const body = await request.json();
    const keyword = body?.keyword?.trim();
    const suggestions = Array.isArray(body?.suggestions) ? body.suggestions : [];

    if (!keyword) {
      return jsonResponse({ error: "Keyword required" }, 400);
    }
    if (!requireOpenAi(env)) {
      return jsonResponse({ error: "AI service is not configured.", code: "ai_unavailable" }, 503);
    }

    const prompt = `
You are helping build a search research workflow for a pet-care growth team.

Keyword: "${keyword}"

Autocomplete suggestions:
${JSON.stringify(suggestions, null, 2)}

Generate exactly 6 realistic "People Also Ask"-style user questions based on the keyword and suggestions.

Rules:
- Return ONLY valid JSON
- Use this structure:
{
  "questions": [
    "question 1",
    "question 2",
    "question 3",
    "question 4",
    "question 5",
    "question 6"
  ]
}
- Questions should sound like real search queries
- Questions should be specific and non-duplicative
- Do not include markdown
`;

    const openAiResponse = await fetchWithRetry("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content: "You generate realistic search research questions."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.5,
        response_format: { type: "json_object" }
      })
    }, { attempts: 2, timeoutMs: 25000, service: "OpenAI" });

    if (!openAiResponse.ok) {
      console.error("Question generation upstream failure", { status: openAiResponse.status });
      return jsonResponse(
        { error: "AI question generation is temporarily unavailable.", code: "ai_upstream_error" },
        502
      );
    }

    const completion = await openAiResponse.json();
    const content = completion.choices?.[0]?.message?.content;

    if (!content) {
      return jsonResponse({ error: "No question response content returned" }, 500);
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      return jsonResponse(
        { error: "Question endpoint returned invalid JSON", raw: content },
        500
      );
    }

    return jsonResponse(parsed);
  } catch (error) {
    return jsonResponse(
      { error: "Question request failed", details: error.message },
      500
    );
  }
}
    if (request.method === "POST" && url.pathname === "/api/events") {
      const limited = await enforceRequestLimits(request, env, "events");
      if (limited) return limited;
      return handleAnalyticsEvent(request, env);
    }

    if (request.method === "GET" && url.pathname === "/api/analytics") {
      const authorization = await checkAdminAuthorization(request, env);
      if (authorization === "unconfigured") {
        return jsonResponse({ error: "Analytics access has not been configured." }, 503);
      }
      if (authorization !== "authorized") {
        return jsonResponse({ error: "Admin token required." }, 401, {
          "WWW-Authenticate": "Bearer"
        });
      }
      return handleAnalyticsSummary(env);
    }

    if (request.method === "POST" && url.pathname === "/api/estimate") {
      const limited = await enforceRequestLimits(request, env, "estimate");
      if (limited) return limited;
      return handleVetEstimate(request, env);
    }
    if (request.method === "POST" && url.pathname === "/api/mine") {
      try {
        const limited = await enforceRequestLimits(request, env, "mine");
        if (limited) return limited;
        const body = await request.json();
const keyword = body?.keyword?.trim();
const researchData = body?.researchData;

        if (!keyword) {
          return jsonResponse({ error: "Keyword required" }, 400);
        }
        if (!requireOpenAi(env)) {
          return jsonResponse({ error: "AI service is not configured.", code: "ai_unavailable" }, 503);
        }

        const challenge = await verifyTurnstile(request, env, body?.turnstileToken);
        if (!challenge.success) {
          return jsonResponse({ error: challenge.error, code: "turnstile_failed" }, 403);
        }

const prompt = `
You are an SEO growth strategist building landing page opportunities for a pet care company.

Keyword: "${keyword}"

Research signals:
${JSON.stringify(researchData, null, 2)}

Use the keyword and research signals above to generate a structured landing page opportunity analysis.

Return ONLY valid JSON in this structure:

{
  "opportunity_score": 5.0,
  "score_reason": "Short explanation.",
  "score_breakdown": {
    "commercial_intent": 5.0,
    "intent_clarity": 5.0,
    "landing_page_fit": 5.0,
    "content_depth": 5.0
  },
  "insight_summary": "2-3 sentence summary of what makes this keyword promising or weak.",
  "recommendation": "A direct recommendation for what type of page or action should be taken.",
  "risk_flags": [
    "risk 1",
    "risk 2",
    "risk 3"
  ],
  "intent": "short explanation of the search intent",
  "user_questions": ["question1","question2","question3","question4","question5"],
  "landing_page_ideas": ["idea1","idea2","idea3","idea4","idea5"],
  "faq_schema": [
    { "question": "Question here", "answer": "Short answer here" }
  ],
  "page_brief": {
    "headline": "landing page headline",
    "sections": ["section1","section2","section3","section4"],
    "cta": "call to action"
  }
}

Scoring rubric:
- 1 to 3 = weak opportunity; vague, low commercial intent, poor landing page fit
- 4 to 6 = moderate opportunity; useful but limited conversion or monetization potential
- 7 to 8 = strong opportunity; clear intent, good content depth, good landing page fit
- 9 to 10 = exceptional opportunity; high commercial intent, strong conversion potential, highly actionable

Score based on:
1. commercial intent
2. clarity of search intent
3. landing page suitability
4. content depth potential

Rules:
- Be strict. Do not inflate scores.
- Use the research signals to shape the response.
- insight_summary must be specific and sound like a real analyst observation.
- score_breakdown values must each be numbers from 1 to 10 and must reflect the supplied signal metrics.
- recommendation must clearly say what page to build or what not to build.
- risk_flags must contain exactly 3 concise items.
- faq_schema must contain exactly 5 objects.
- user_questions must contain exactly 5 items.
- landing_page_ideas must contain exactly 5 items.
- page_brief.sections must contain exactly 4 items.
- Do not include markdown. Only return JSON.
`;

        const openAiResponse = await fetchWithRetry("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${env.OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: "gpt-4.1-mini",
            messages: [
              {
                role: "system",
                content: "You are a helpful SEO growth assistant."
              },
              {
                role: "user",
                content: prompt
              }
            ],
            temperature: 0.7,
            response_format: { type: "json_object" }
          })
        }, { attempts: 2, timeoutMs: 30000, service: "OpenAI" });

        if (!openAiResponse.ok) {
          console.error("Opportunity analysis upstream failure", { status: openAiResponse.status });
          return jsonResponse(
            { error: "AI analysis is temporarily unavailable. Please try again shortly.", code: "ai_upstream_error" },
            502
          );
        }

        const completion = await openAiResponse.json();
        const content = completion.choices?.[0]?.message?.content;

        if (!content) {
          return jsonResponse({ error: "No AI response content returned" }, 500);
        }

        let parsed;
        try {
          parsed = JSON.parse(content);
        } catch {
          return jsonResponse(
            { error: "AI returned invalid JSON", raw: content },
            500
          );
        }

        return jsonResponse(parsed);
      } catch (error) {
        return jsonResponse(
          { error: "The analysis could not be completed. Please try again.", code: "analysis_failed" },
          500
        );
      }
    }

    return env.ASSETS.fetch(request);
  }
};

async function handleVetEstimate(request, env) {
  try {
    const input = await request.json();
    const invalidField = validateVetEstimateInput(input);

    if (invalidField) {
      return jsonResponse({ error: `Invalid ${invalidField}` }, 400);
    }

    const cacheKey = [
      "source-backed-v1",
      input.petType,
      input.visitType,
      input.location,
      input.state,
      input.ageGroup,
      input.postcode || "no-postcode"
    ].join(":").toLowerCase();

    const cached = env.VET_ESTIMATES
      ? await env.VET_ESTIMATES.get(cacheKey)
      : null;

    if (cached) {
      return new Response(cached, {
        headers: { "Content-Type": "application/json", "X-Cache": "HIT" }
      });
    }

    const responseBody = JSON.stringify(calculateVetEstimate(input));

    if (env.VET_ESTIMATES) {
      await env.VET_ESTIMATES.put(cacheKey, responseBody, { expirationTtl: 604800 });
    }

    return new Response(responseBody, {
      headers: { "Content-Type": "application/json", "X-Cache": "MISS" }
    });
  } catch {
    return jsonResponse({ error: "Could not calculate estimate" }, 400);
  }
}

async function handleAnalyticsEvent(request, env) {
  try {
    if (!env.VET_ESTIMATES) return jsonResponse({ error: "Analytics storage unavailable" }, 503);
    const body = await request.json();

    if (!ANALYTICS_EVENT_TYPES.has(body?.type)) {
      return jsonResponse({ error: "Invalid event type" }, 400);
    }

    if (!/^[a-zA-Z0-9-]{8,80}$/.test(body?.sessionId || "")) {
      return jsonResponse({ error: "Invalid session" }, 400);
    }

    const event = {
      type: body.type,
      sessionId: body.sessionId,
      timestamp: new Date().toISOString(),
      metadata: sanitizeAnalyticsMetadata(body.metadata)
    };
    const key = `event:${Date.now()}:${crypto.randomUUID()}`;
    await env.VET_ESTIMATES.put(key, JSON.stringify(event), { expirationTtl: 7776000 });
    return jsonResponse({ accepted: true }, 202);
  } catch {
    return jsonResponse({ error: "Event not recorded" }, 400);
  }
}

async function handleAnalyticsSummary(env) {
  if (!env.VET_ESTIMATES) return jsonResponse({ error: "Analytics storage unavailable" }, 503);

  const listed = await env.VET_ESTIMATES.list({ prefix: "event:", limit: 1000 });
  const events = (await Promise.all(
    listed.keys.map(key => env.VET_ESTIMATES.get(key.name, "json"))
  )).filter(Boolean);

  return jsonResponse({
    ...aggregateAnalytics(events),
    isPartial: !listed.list_complete,
    privacy: "Aggregate product events only; raw keywords and personal information are not collected."
  });
}

async function handleCreateShare(request, env, url) {
  if (!env.VET_ESTIMATES) return jsonResponse({ error: "Sharing is unavailable." }, 503);

  try {
    const body = await request.json();
    const analysis = body?.analysis;
    const serialized = JSON.stringify(analysis);
    if (!analysis || typeof analysis !== "object" || serialized.length > 100000) {
      return jsonResponse({ error: "Invalid or oversized analysis." }, 400);
    }
    if (typeof analysis.keyword !== "string" || analysis.keyword.length > 160) {
      return jsonResponse({ error: "Invalid analysis keyword." }, 400);
    }

    const id = crypto.randomUUID().replaceAll("-", "");
    const record = {
      ...analysis,
      sharedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 2592000000).toISOString()
    };
    await env.VET_ESTIMATES.put(`share:${id}`, JSON.stringify(record), { expirationTtl: 2592000 });
    return jsonResponse({
      id,
      url: `${url.origin}/share.html?id=${id}`,
      expiresAt: record.expiresAt
    }, 201);
  } catch {
    return jsonResponse({ error: "The report could not be shared." }, 400);
  }
}

async function handleGetShare(env, id) {
  if (!env.VET_ESTIMATES || !/^[a-f0-9]{32}$/.test(id)) {
    return jsonResponse({ error: "Shared report not found." }, 404);
  }
  const report = await env.VET_ESTIMATES.get(`share:${id}`, "json");
  if (!report) return jsonResponse({ error: "Shared report not found or expired." }, 404);
  return new Response(JSON.stringify(report), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=300"
    }
  });
}

function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...extraHeaders
    }
  });
}
