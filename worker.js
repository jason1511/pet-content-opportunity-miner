export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/api/mine") {
      try {
        const body = await request.json();
        const keyword = body?.keyword?.trim();

        if (!keyword) {
          return jsonResponse({ error: "Keyword required" }, 400);
        }

        const prompt = `
You are an SEO growth strategist for a pet care company.

Keyword: "${keyword}"

Return ONLY valid JSON in this structure:

{
  "intent": "short explanation of the search intent",
  "user_questions": ["question1","question2","question3","question4","question5"],
  "landing_page_ideas": ["idea1","idea2","idea3","idea4","idea5"],
  "faq_schema": ["faq1","faq2","faq3","faq4","faq5"],
  "page_brief": {
    "headline": "landing page headline",
    "sections": ["section1","section2","section3","section4"],
    "cta": "call to action"
  }
}

Do not include markdown. Only return JSON.
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

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}