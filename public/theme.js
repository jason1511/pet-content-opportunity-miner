const STORAGE_KEY = "pet-growth-platform:theme";
const OPTIONS = new Set(["light", "dark", "system"]);
const systemPreference = matchMedia("(prefers-color-scheme: dark)");

export function createThemeControl(container) {
  if (!container) return;
  const label = document.createElement("label");
  label.className = "platform-theme-control";
  const text = document.createElement("span");
  text.className = "visually-hidden";
  text.textContent = "Colour theme";
  const select = document.createElement("select");
  select.setAttribute("aria-label", "Colour theme");

  for (const [value, name] of [["system", "System"], ["light", "Light"], ["dark", "Dark"]]) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = name;
    select.append(option);
  }
  select.value = getThemePreference();
  select.addEventListener("change", () => setThemePreference(select.value));
  label.append(text, select);
  container.replaceChildren(label);
}

export function setThemePreference(preference) {
  const next = OPTIONS.has(preference) ? preference : "system";
  try { localStorage.setItem(STORAGE_KEY, next); } catch { /* use session value only */ }
  applyTheme(next);
}

export function getThemePreference() {
  const current = document.documentElement.dataset.themePreference;
  return OPTIONS.has(current) ? current : "system";
}

function applyTheme(preference) {
  const resolved = preference === "system"
    ? (systemPreference.matches ? "dark" : "light")
    : preference;
  document.documentElement.dataset.themePreference = preference;
  document.documentElement.dataset.theme = resolved;
  window.dispatchEvent(new CustomEvent("platform-theme-change", { detail: { preference, resolved } }));
}

const handleSystemChange = () => {
  if (getThemePreference() === "system") applyTheme("system");
};
if (systemPreference.addEventListener) systemPreference.addEventListener("change", handleSystemChange);
else systemPreference.addListener(handleSystemChange);
