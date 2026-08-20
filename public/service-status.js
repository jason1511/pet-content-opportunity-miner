export async function initServiceStatus() {
  let status;
  try {
    const response = await fetch("/api/status", { headers: { Accept: "application/json" } });
    status = response.ok ? await response.json() : { status: "degraded" };
  } catch {
    status = { status: "offline" };
  }

  const badge = document.createElement("div");
  badge.className = `service-status service-status-${status.status}`;
  badge.setAttribute("role", "status");
  badge.textContent = status.status === "operational"
    ? "AI service ready"
    : "AI service may be temporarily unavailable";

  const main = document.querySelector("main");
  if (main) main.prepend(badge);
}
