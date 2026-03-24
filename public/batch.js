import { buildResearchSignals } from "./shared.js";

let batchDetailResults;
let batchKeywordsInput;
let runBatchBtn;
let batchResults;
let loadBatchDemoBtn;

window.addEventListener("DOMContentLoaded", () => {
  batchDetailResults = document.getElementById("batchDetailResults");
  batchKeywordsInput = document.getElementById("batchKeywords");
  runBatchBtn = document.getElementById("runBatchBtn");
  batchResults = document.getElementById("batchResults");
  loadBatchDemoBtn = document.getElementById("loadBatchDemoBtn");

  if (!batchDetailResults || !batchKeywordsInput || !runBatchBtn || !batchResults) {
    console.error("Batch page elements missing", {
      batchDetailResults,
      batchKeywordsInput,
      runBatchBtn,
      batchResults
    });
    return;
  }

  runBatchBtn.addEventListener("click", async () => {
    const raw = batchKeywordsInput.value.trim();

    if (!raw) {
      batchResults.textContent = "Please paste at least one keyword.";
      return;
    }

    const keywords = raw
      .split("\n")
      .map(item => item.trim())
      .filter(Boolean);

    if (keywords.length === 0) {
      batchResults.textContent = "Please paste valid keywords.";
      return;
    }

    await runBatchWorkflow(keywords);
  });

  if (loadBatchDemoBtn) {
    loadBatchDemoBtn.addEventListener("click", async () => {
      const demoKeywords = [
        "dog insurance",
        "cat insurance",
        "puppy anxiety",
        "pet dental cleaning",
        "cute cats"
      ];

      batchKeywordsInput.value = demoKeywords.join("\n");
      await runBatchWorkflow(demoKeywords);
    });
  }
});

async function runBatchWorkflow(keywords) {
  runBatchBtn.disabled = true;
  runBatchBtn.textContent = "Running batch...";

  batchResults.innerHTML = `<p class="loading-text">Processing ${keywords.length} keywords...</p>`;

  const results = [];

  for (let i = 0; i < keywords.length; i++) {
    const keyword = keywords[i];

    batchResults.innerHTML = `
      <p class="loading-text">
        Processing ${i + 1} of ${keywords.length}: <strong>${keyword}</strong>
      </p>
    `;

    try {
      const researchData = await buildResearchSignals(keyword);

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

      let data;

try {
  data = await response.json();
} catch (err) {
  throw new Error("Invalid JSON response from server");
}

      if (!response.ok) {
        throw new Error(data.error || "Generation failed");
      }

      results.push({
  keyword,
  score: Number(data.opportunity_score || 0),
  recommendation: data.recommendation || "No recommendation returned.",
  keywordType: researchData.keywordType,
  scoreReason: data.score_reason || "No score reason returned.",
  insightSummary: data.insight_summary || "No insight summary returned.",
  riskFlags: Array.isArray(data.risk_flags) ? data.risk_flags : [],
  headline: data.page_brief?.headline || "No headline returned.",
  sections: Array.isArray(data.page_brief?.sections) ? data.page_brief.sections : [],
  cta: data.page_brief?.cta || "No CTA returned."
});
    } catch (error) {
      results.push({
        keyword,
        score: 0,
        recommendation: `Batch analysis failed: ${error.message}`,
        keywordType: "Unknown",
        scoreReason: "No score available due to an error."
      });
    }
  }

  results.sort((a, b) => b.score - a.score);
  renderBatchResults(results);
if (results.length > 0) {
  renderBatchDetail(results[0]);
}
const firstCard = document.querySelector(".batch-item.clickable");
if (firstCard) {
  firstCard.classList.add("selected-batch-item");
}
  runBatchBtn.disabled = false;
  runBatchBtn.textContent = "Run Batch Analysis";
}

function renderBatchResults(items) {
  if (!items.length) {
    batchResults.textContent = "No batch results available.";
    return;
  }

  batchResults.innerHTML = `
    <div class="batch-list">
      ${items.map(item => `
        <div class="batch-item clickable" data-keyword="${item.keyword}">
          <h3>${item.keyword}</h3>
          <p class="batch-meta"><strong>Keyword Type:</strong> ${item.keywordType}</p>
          <p class="batch-meta"><strong>Why it scored this way:</strong> ${item.scoreReason}</p>
          <p class="batch-meta"><strong>Recommendation:</strong> ${item.recommendation}</p>
          <span class="batch-score">Opportunity Score: ${item.score.toFixed(1)}/10</span>
        </div>
      `).join("")}
    </div>
  `;

  attachBatchClickHandlers(items);
}
function renderBatchDetail(item) {
  batchDetailResults.innerHTML = `
    <div class="actions-row">
      <a class="secondary-btn action-link" href="index.html?keyword=${encodeURIComponent(item.keyword)}">
        Open Full Workflow
      </a>
    </div>

    <div class="result-card">
      <h3>Inspecting</h3>
      <p><strong>${item.keyword}</strong></p>
    </div>

    <div class="score-card">
      <h2>Opportunity Score</h2>
      <div class="score">${item.score.toFixed(1)}/10</div>
      <p>${item.scoreReason}</p>
    </div>

    <div class="result-card">
      <h3>Keyword Type</h3>
      <p>${item.keywordType}</p>
    </div>

    <div class="result-card">
      <h3>Insight Summary</h3>
      <p>${item.insightSummary}</p>
    </div>

    <div class="result-card">
      <h3>Recommendation</h3>
      <p>${item.recommendation}</p>
    </div>

    <div class="result-card">
      <h3>Risk Flags</h3>
      <ul>
        ${item.riskFlags.map(flag => `<li>${flag}</li>`).join("")}
      </ul>
    </div>

    <div class="result-card">
      <h3>Brief Preview</h3>
      <p><strong>Headline:</strong> ${item.headline}</p>
      <p><strong>Sections:</strong></p>
      <ul>
        ${item.sections.map(section => `<li>${section}</li>`).join("")}
      </ul>
      <p><strong>CTA:</strong> ${item.cta}</p>
    </div>
  `;
}
function attachBatchClickHandlers(items) {
  const cards = document.querySelectorAll(".batch-item.clickable");

  cards.forEach((card, index) => {
    card.addEventListener("click", () => {
      cards.forEach(item => item.classList.remove("selected-batch-item"));
      card.classList.add("selected-batch-item");

      const item = items[index];
      if (!item) return;

      renderBatchDetail(item);
    });
  });
}