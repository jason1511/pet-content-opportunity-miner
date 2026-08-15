export default {
  async fetch(request, env) {
    const url = new URL(request.url);
if (request.method === "GET" && url.pathname === "/api/autocomplete") {
  try {
    const keyword = url.searchParams.get("keyword")?.trim();

    if (!keyword) {
      return jsonResponse({ error: "Keyword required" }, 400);
    }

    const autocompleteUrl =
      `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(keyword)}`;

    const response = await fetch(autocompleteUrl, {
      headers: {
        "Accept": "application/json"
      }
    });

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
    const body = await request.json();
    const keyword = body?.keyword?.trim();
    const suggestions = Array.isArray(body?.suggestions) ? body.suggestions : [];

    if (!keyword) {
      return jsonResponse({ error: "Keyword required" }, 400);
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

    const openAiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
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
        temperature: 0.5
      })
    });

    if (!openAiResponse.ok) {
      const errorText = await openAiResponse.text();
      return jsonResponse(
        { error: "Question generation failed", details: errorText },
        500
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
    if (request.method === "POST" && url.pathname === "/api/estimate") {
      return handleVetEstimate(request, env);
    }
    if (request.method === "POST" && url.pathname === "/api/mine") {
      try {
        const body = await request.json();
const keyword = body?.keyword?.trim();
const researchData = body?.researchData;

        if (!keyword) {
          return jsonResponse({ error: "Keyword required" }, 400);
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
- recommendation must clearly say what page to build or what not to build.
- risk_flags must contain exactly 3 concise items.
- faq_schema must contain exactly 5 objects.
- user_questions must contain exactly 5 items.
- landing_page_ideas must contain exactly 5 items.
- page_brief.sections must contain exactly 4 items.
- Do not include markdown. Only return JSON.
`;

        const openAiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
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
            temperature: 0.7
          })
        });

        if (!openAiResponse.ok) {
          const errorText = await openAiResponse.text();
          return jsonResponse(
            { error: "OpenAI request failed", details: errorText },
            500
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
          { error: "Worker failed", details: error.message },
          500
        );
      }
    }

    return env.ASSETS.fetch(request);
  }
};

const VET_ESTIMATE_OPTIONS = {
  petType: new Set(["dog", "cat"]),
  visitType: new Set(["checkup", "vaccination", "dental", "emergency"]),
  location: new Set(["metro", "regional"]),
  state: new Set(["VIC", "NSW", "QLD", "WA", "SA", "TAS", "ACT", "NT"]),
  ageGroup: new Set(["young", "adult", "senior"])
};

async function handleVetEstimate(request, env) {
  try {
    const input = await request.json();
    const fields = ["petType", "visitType", "location", "state", "ageGroup"];

    for (const field of fields) {
      if (!VET_ESTIMATE_OPTIONS[field].has(input?.[field])) {
        return jsonResponse({ error: `Invalid ${field}` }, 400);
      }
    }

    const cacheKey = fields.map(field => input[field]).join(":").toLowerCase();
    const cached = env.VET_ESTIMATES
      ? await env.VET_ESTIMATES.get(cacheKey)
      : null;

    if (cached) {
      return new Response(cached, {
        headers: { "Content-Type": "application/json", "X-Cache": "HIT" }
      });
    }

    const prompt = `
Estimate a typical veterinary visit cost range in Australia.

Return JSON only:
{
  "min": number,
  "max": number,
  "note": "short planning disclaimer",
  "baseRange": "short description",
  "adjustments": ["factor"]
}

Pet: ${input.petType}
Visit type: ${input.visitType}
Area: ${input.location}
State: ${input.state}
Age group: ${input.ageGroup}

Use Australian-dollar expectations. Keep the explanation concise. This is a planning estimate, not medical or financial advice.
`;

    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!aiResponse.ok) {
      return jsonResponse({ error: "Estimate service unavailable" }, 502);
    }

    const completion = await aiResponse.json();
    const content = completion.choices?.[0]?.message?.content;
    if (!content) return jsonResponse({ error: "No estimate returned" }, 502);

    const estimate = JSON.parse(content);
    if (!Number.isFinite(estimate.min) || !Number.isFinite(estimate.max) || estimate.min < 0 || estimate.max < estimate.min) {
      return jsonResponse({ error: "Invalid estimate returned" }, 502);
    }

    const responseBody = JSON.stringify({
      min: Math.round(estimate.min),
      max: Math.round(estimate.max),
      note: String(estimate.note || "Planning estimate only. Actual clinic pricing may vary."),
      baseRange: String(estimate.baseRange || "AI-assisted Australian estimate"),
      adjustments: Array.isArray(estimate.adjustments) ? estimate.adjustments.slice(0, 5).map(String) : []
    });

    if (env.VET_ESTIMATES) {
      await env.VET_ESTIMATES.put(cacheKey, responseBody, { expirationTtl: 604800 });
    }

    return new Response(responseBody, {
      headers: { "Content-Type": "application/json", "X-Cache": "MISS" }
    });
  } catch (error) {
    return jsonResponse({ error: "Could not calculate estimate" }, 400);
  }
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}