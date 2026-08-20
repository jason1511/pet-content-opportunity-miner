(() => {
  const key = "pet-growth-platform:theme";
  const allowed = new Set(["light", "dark", "system"]);
  let preference = "system";
  try {
    const saved = localStorage.getItem(key);
    if (allowed.has(saved)) preference = saved;
  } catch { /* storage can be unavailable in privacy modes */ }
  const resolved = preference === "system"
    ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    : preference;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.dataset.themePreference = preference;
})();
