const status = document.getElementById("analyticsStatus");
const metricGrid = document.getElementById("metricGrid");
const funnelGrid = document.getElementById("funnelGrid");
const dailyActivity = document.getElementById("dailyActivity");
const login = document.getElementById("analyticsLogin");
const loginForm = document.getElementById("analyticsLoginForm");
const tokenInput = document.getElementById("analyticsToken");
const loginStatus = document.getElementById("loginStatus");
const dashboard = document.getElementById("analyticsDashboard");
const logout = document.getElementById("analyticsLogout");
const TOKEN_KEY = "pet-growth-platform:analytics-token";

const existingToken = sessionStorage.getItem(TOKEN_KEY);
if (existingToken) loadAnalytics(existingToken);

loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  const token = tokenInput.value.trim();
  if (!token) return;
  loginStatus.textContent = "Checking access…";
  await loadAnalytics(token);
});

logout.addEventListener("click", () => {
  sessionStorage.removeItem(TOKEN_KEY);
  dashboard.classList.add("hidden");
  login.classList.remove("hidden");
  tokenInput.value = "";
  tokenInput.focus();
});

async function loadAnalytics(token) {
  try {
    const response = await fetch("/api/analytics", {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Analytics unavailable");

    sessionStorage.setItem(TOKEN_KEY, token);
    login.classList.add("hidden");
    dashboard.classList.remove("hidden");
    loginStatus.textContent = "";

    status.textContent = data.isPartial
      ? "Showing the latest 1,000 retained events."
      : `Updated ${new Date(data.generatedAt).toLocaleString()} · ${data.privacy}`;

    const metrics = [
      ["Research runs", data.totals.research_completed],
      ["Batch runs", data.totals.batch_completed],
      ["Vet estimates", data.totals.estimate_completed],
      ["Project opens", data.totals.homepage_project_opened],
      ["Unique sessions", data.uniqueSessions],
      ["Last 7 days", Object.values(data.last7Days).reduce((sum, value) => sum + value, 0)]
    ];
    metricGrid.replaceChildren(...metrics.map(([label, value]) => metricCard(label, value)));

    const funnel = [
      ["Used research", data.researchUsers],
      ["Used estimator", data.estimatorUsers],
      ["Used both projects", data.crossProjectUsers]
    ];
    funnelGrid.replaceChildren(...funnel.map(([label, value]) => metricCard(label, value)));

    dailyActivity.replaceChildren();
    if (!data.daily.length) {
      dailyActivity.textContent = "No analytics events recorded yet.";
    } else {
      const max = Math.max(...data.daily.map(item => item.total), 1);
      for (const item of data.daily) {
        const row = document.createElement("div");
        row.className = "daily-row";
        const label = document.createElement("span");
        label.textContent = item.day;
        const bar = document.createElement("div");
        bar.className = "daily-bar";
        bar.style.width = `${Math.max(4, item.total / max * 100)}%`;
        const value = document.createElement("strong");
        value.textContent = item.total;
        row.append(label, bar, value);
        dailyActivity.append(row);
      }
    }
  } catch (error) {
    sessionStorage.removeItem(TOKEN_KEY);
    dashboard.classList.add("hidden");
    login.classList.remove("hidden");
    loginStatus.textContent = error.message;
  }
}

function metricCard(label, value) {
  const card = document.createElement("article");
  card.className = "metric-card";
  const number = document.createElement("strong");
  number.textContent = Number(value || 0).toLocaleString();
  const text = document.createElement("span");
  text.textContent = label;
  card.append(number, text);
  return card;
}
