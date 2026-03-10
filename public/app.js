const generateBtn = document.getElementById("generateBtn");
const keywordInput = document.getElementById("keyword");
const results = document.getElementById("results");

generateBtn.addEventListener("click", async () => {
  const keyword = keywordInput.value.trim();

  if (!keyword) {
    results.textContent = "Please enter a pet-related keyword.";
    return;
  }

  generateBtn.disabled = true;
  generateBtn.textContent = "Mining...";

  results.innerHTML = "Analyzing keyword...";

  try {
    const response = await fetch("/api/mine", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyword })
    });

    const data = await response.json();

    renderResults(data);

  } catch (err) {
    results.innerHTML = "Error generating results.";
  }

  generateBtn.disabled = false;
  generateBtn.textContent = "Generate";
});

function renderResults(data) {

  const score = Math.floor(Math.random() * 3) + 7; // temporary score 7–9

  results.innerHTML = `
    <div class="score-card">
      <h2>Opportunity Score</h2>
      <div class="score">${score}/10</div>
      <p>Estimated potential for a content landing page.</p>
    </div>

    <div class="result-card">
      <h3>Search Intent</h3>
      <p>${data.intent}</p>
    </div>

    <div class="result-card">
      <h3>User Questions</h3>
      <ul>${data.user_questions.map(q => `<li>${q}</li>`).join("")}</ul>
    </div>

    <div class="result-card">
      <h3>Landing Page Ideas</h3>
      <ul>${data.landing_page_ideas.map(i => `<li>${i}</li>`).join("")}</ul>
    </div>

    <div class="result-card">
      <h3>FAQ Schema Ideas</h3>
      <ul>${data.faq_schema.map(f => `<li>${f}</li>`).join("")}</ul>
    </div>

    <div class="result-card">
      <h3>Landing Page Brief</h3>
      <p><strong>Headline:</strong> ${data.page_brief.headline}</p>

      <p><strong>Sections:</strong></p>
      <ul>${data.page_brief.sections.map(s => `<li>${s}</li>`).join("")}</ul>

      <p><strong>CTA:</strong> ${data.page_brief.cta}</p>
    </div>
  `;
}