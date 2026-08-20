const id = new URLSearchParams(window.location.search).get("id");
const status = document.getElementById("reportStatus");
const content = document.getElementById("reportContent");

document.getElementById("printReport").addEventListener("click", () => window.print());

loadReport();

async function loadReport() {
  if (!/^[a-f0-9]{32}$/.test(id || "")) return showError("This report link is invalid.");
  try {
    const response = await fetch(`/api/share/${id}`);
    const report = await response.json();
    if (!response.ok) throw new Error(report.error || "Report unavailable");
    renderReport(report);
  } catch (error) {
    showError(error.message);
  }
}

function renderReport(report) {
  const analysis = report.analysis || {};
  const research = report.research || {};
  setText("reportTitle", report.projectName || report.keyword || "Pet opportunity analysis");
  setText("reportMeta", `${report.keyword || "Unknown keyword"} · Shared ${formatDate(report.sharedAt)} · Expires ${formatDate(report.expiresAt)}`);
  setText("reportScore", `${Number(analysis.opportunity_score || 0).toFixed(1)}/10`);
  setText("reportReason", analysis.score_reason);
  setText("reportRecommendation", analysis.recommendation);
  setText("reportInsight", analysis.insight_summary);
  setText("reportHeadline", analysis.page_brief?.headline);
  setText("reportCta", analysis.page_brief?.cta);
  fillList("reportRisks", analysis.risk_flags);
  fillList("reportSections", analysis.page_brief?.sections);

  const metrics = research.signalMetrics || {};
  const signals = [
    ["Demand proxy", metrics.demandProxy],
    ["Competition proxy", metrics.competitionProxy],
    ["Commercial intent", score(metrics.commercialIntent)],
    ["Intent clarity", score(metrics.intentClarity)],
    ["Landing-page fit", score(metrics.landingPageFit)],
    ["Content depth", score(metrics.contentDepth)]
  ];
  const grid = document.getElementById("reportSignals");
  for (const [label, value] of signals) {
    const box = document.createElement("div");
    const small = document.createElement("span");
    const strong = document.createElement("strong");
    small.textContent = label;
    strong.textContent = value || "Not available";
    box.append(small, strong);
    grid.append(box);
  }

  document.title = `${report.projectName || report.keyword} | Opportunity Report`;
  status.classList.add("hidden");
  content.classList.remove("hidden");
}

function showError(message) { status.textContent = message; }
function setText(id, value) { document.getElementById(id).textContent = value || "Not available"; }
function fillList(id, items = []) {
  const list = document.getElementById(id);
  for (const value of Array.isArray(items) ? items : []) {
    const item = document.createElement("li");
    item.textContent = value;
    list.append(item);
  }
}
function score(value) { return Number.isFinite(Number(value)) ? `${Number(value).toFixed(1)}/10` : null; }
function formatDate(value) { return value ? new Date(value).toLocaleDateString("en-AU") : "unknown date"; }
