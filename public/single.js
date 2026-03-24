import { buildResearchSignals } from "./shared.js";

const generateBtn = document.getElementById("generateBtn");
const keywordInput = document.getElementById("keyword");
const loadDemoBtn = document.getElementById("loadDemoBtn");

const researchResults = document.getElementById("researchResults");
const generationResults = document.getElementById("generationResults");
const qaResults = document.getElementById("qaResults");

if (generateBtn && keywordInput) {
  generateBtn.addEventListener("click", async () => {
    const keyword = keywordInput.value.trim();

    if (!keyword) {
      researchResults.textContent = "Please enter a pet-related keyword.";
      generationResults.textContent = "No generated brief yet.";
      qaResults.textContent = "No QA checks yet.";
      return;
    }

    await runWorkflow(keyword);
  });
}

if (loadDemoBtn && keywordInput) {
  loadDemoBtn.addEventListener("click", async () => {
    const demoKeyword = "dog insurance";
    keywordInput.value = demoKeyword;
    await runWorkflow(demoKeyword);
  });
}

window.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const keywordFromUrl = params.get("keyword");

  const keyword = keywordFromUrl || "dog insurance";

  if (keywordInput) {
    keywordInput.value = keyword;
    await runWorkflow(keyword);
  }
});

async function runWorkflow(keyword) {
  generateBtn.disabled = true;
  if (loadDemoBtn) loadDemoBtn.disabled = true;

  generateBtn.textContent = "Running...";
researchResults.innerHTML = `<p class="loading-text">🔍 Collecting search signals...</p>`;
generationResults.innerHTML = `<p class="loading-text">🧠 Generating structured brief...</p>`;
qaResults.innerHTML = `<p class="loading-text">✅ Running QA checks...</p>`;

  try {
    const researchData = await buildResearchSignals(keyword);
    renderResearch(researchData);

    const response = await fetch("/api/mine", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        keyword,
        researchData
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Generation failed");
    }

    renderGeneration(data);

    const qaData = runQaChecks(keyword, data);
    renderQa(qaData);
  } catch (error) {
    generationResults.innerHTML = `
      <div class="result-card">
        <h3>Error</h3>
        <p>${error.message}</p>
      </div>
    `;
    qaResults.innerHTML = `
      <div class="result-card">
        <h3>QA</h3>
        <p>QA could not run because generation failed.</p>
      </div>
    `;
  } finally {
    generateBtn.disabled = false;
    if (loadDemoBtn) loadDemoBtn.disabled = false;
    generateBtn.textContent = "Run Workflow";
  }
}

function renderResearch(data) {
  researchResults.innerHTML = `
    <div class="result-card">
      <h3>Keyword Summary</h3>
      <p><strong>Normalized Keyword:</strong> ${data.keyword}</p>
      <p><strong>Keyword Type:</strong> ${data.keywordType}</p>
      <p><strong>Autocomplete Source:</strong> ${data.sourceMeta.autocompleteSource}</p>
      <p><strong>Question Source:</strong> ${data.sourceMeta.questionSource}</p>
    </div>

    <div class="result-card">
      <h3>Autocomplete Suggestions</h3>
      <ul>
        ${data.autocompleteSuggestions.map(item => `<li>${item}</li>`).join("")}
      </ul>
    </div>

    <div class="result-card">
      <h3>People Also Ask–Style Questions</h3>
      <ul>
        ${data.userQuestionSeeds.map(item => `<li>${item}</li>`).join("")}
      </ul>
    </div>

    <div class="result-card">
      <h3>Content Angles</h3>
      <ul>
        ${data.contentAngles.map(item => `<li>${item}</li>`).join("")}
      </ul>
    </div>
  `;
}

function renderGeneration(data) {
  const score = Number(data.opportunity_score || 0).toFixed(1);

  generationResults.innerHTML = `
    <div class="score-card">
      <h2>Opportunity Score</h2>
      <div class="score">${score}/10</div>
      <p>${data.score_reason}</p>
    </div>

    <div class="result-card">
      <h3>Insight Summary</h3>
      <p>${data.insight_summary}</p>
    </div>

    <div class="result-card">
      <h3>Recommendation</h3>
      <p>${data.recommendation}</p>
    </div>

    <div class="result-card">
      <h3>Risk Flags</h3>
      <ul>
        ${data.risk_flags.map(item => `<li>${item}</li>`).join("")}
      </ul>
    </div>

    <div class="result-card">
      <h3>Search Intent</h3>
      <p>${data.intent}</p>
    </div>

    <div class="result-card">
      <h3>User Questions</h3>
      <ul>
        ${data.user_questions.map(item => `<li>${item}</li>`).join("")}
      </ul>
    </div>

    <div class="result-card">
      <h3>Landing Page Ideas</h3>
      <ul>
        ${data.landing_page_ideas.map(item => `<li>${item}</li>`).join("")}
      </ul>
    </div>

    <div class="result-card">
      <h3>FAQ Schema</h3>
      <ul>
        ${data.faq_schema.map(item => `
          <li>
            <strong>${item.question}</strong><br>
            ${item.answer}
          </li>
        `).join("")}
      </ul>
    </div>

    <div class="result-card">
      <h3>Page Brief</h3>
      <p><strong>Headline:</strong> ${data.page_brief.headline}</p>
      <p><strong>Sections:</strong></p>
      <ul>
        ${data.page_brief.sections.map(item => `<li>${item}</li>`).join("")}
      </ul>
      <p><strong>CTA:</strong> ${data.page_brief.cta}</p>
    </div>
  `;
}

function runQaChecks(keyword, data) {
  const checks = [];

  checks.push({
    label: "Keyword appears in headline",
    status: includesKeyword(data.page_brief.headline, keyword),
    detail: data.page_brief.headline
  });

  checks.push({
    label: "Headline is specific enough",
    status: wordCount(data.page_brief.headline) >= 5,
    detail: data.page_brief.headline
  });

  checks.push({
    label: "Exactly 5 user questions generated",
    status: Array.isArray(data.user_questions) && data.user_questions.length === 5,
    detail: `${data.user_questions?.length || 0} questions found`
  });

  checks.push({
    label: "Exactly 5 FAQ items generated",
    status: Array.isArray(data.faq_schema) && data.faq_schema.length === 5,
    detail: `${data.faq_schema?.length || 0} FAQ items found`
  });

  checks.push({
    label: "Exactly 4 page sections generated",
    status: Array.isArray(data.page_brief.sections) && data.page_brief.sections.length === 4,
    detail: `${data.page_brief?.sections?.length || 0} sections found`
  });

  checks.push({
    label: "CTA looks action-oriented",
    status: hasActionVerb(data.page_brief.cta),
    detail: data.page_brief.cta
  });

  checks.push({
    label: "Opportunity score is valid",
    status: Number(data.opportunity_score) >= 1 && Number(data.opportunity_score) <= 10,
    detail: `${data.opportunity_score}/10`
  });

  checks.push({
    label: "FAQ answers are not empty",
    status: Array.isArray(data.faq_schema) && data.faq_schema.every(item => item.answer && item.answer.trim().length > 0),
    detail: "Each FAQ should include a useful answer"
  });

  checks.push({
    label: "Recommendation is present",
    status: !!data.recommendation && data.recommendation.trim().length > 20,
    detail: data.recommendation || "No recommendation found"
  });

  checks.push({
    label: "Exactly 3 risk flags generated",
    status: Array.isArray(data.risk_flags) && data.risk_flags.length === 3,
    detail: `${data.risk_flags?.length || 0} risk flags found`
  });

  const passedCount = checks.filter(check => check.status).length;

  const suggestions = [];

  if (!checks[0].status) {
    suggestions.push("Include the keyword more directly in the headline.");
  }

  if (!checks[1].status) {
    suggestions.push("Make the headline more specific and descriptive.");
  }

  if (!checks[5].status) {
    suggestions.push("Use a stronger CTA such as Compare Plans, Get a Quote, or Book Now.");
  }

  if (!checks[7].status) {
    suggestions.push("Expand FAQ answers so they feel more useful and complete.");
  }

  if (!checks[8].status) {
    suggestions.push("Add a clearer recommendation so the output feels more actionable.");
  }

  if (!checks[9].status) {
    suggestions.push("Add three concise risk flags to show decision quality and trade-offs.");
  }

  if (suggestions.length === 0) {
    suggestions.push("The generated brief looks solid for a first-pass landing page draft.");
  }

  return {
    score: `${passedCount}/${checks.length}`,
    checks,
    suggestions
  };
}

function renderQa(qaData) {
  qaResults.innerHTML = `
    <div class="result-card">
      <h3>QA Summary</h3>
      <p><strong>Checks Passed:</strong> ${qaData.score}</p>
    </div>

    <div class="result-card">
      <h3>QA Checks</h3>
      <ul class="qa-list">
        ${qaData.checks.map(check => `
          <li class="${check.status ? "qa-pass" : "qa-fail"}">
            <strong>${check.status ? "PASS" : "FAIL"}:</strong> ${check.label}
            <br>
            <span>${check.detail}</span>
          </li>
        `).join("")}
      </ul>
    </div>

    <div class="result-card">
      <h3>Suggestions</h3>
      <ul>
        ${qaData.suggestions.map(item => `<li>${item}</li>`).join("")}
      </ul>
    </div>
  `;
}

function includesKeyword(text, keyword) {
  if (!text || !keyword) return false;
  return text.toLowerCase().includes(keyword.toLowerCase());
}

function wordCount(text) {
  if (!text) return 0;
  return text.trim().split(/\s+/).length;
}

function hasActionVerb(text) {
  if (!text) return false;

  const actionWords = [
    "get",
    "compare",
    "book",
    "start",
    "find",
    "claim",
    "explore",
    "choose",
    "shop",
    "view"
  ];

  const lowerText = text.toLowerCase();
  return actionWords.some(word => lowerText.includes(word));
}