const STORAGE_KEY = "pet-growth-platform:analyses:v1";
const MAX_ANALYSES = 25;

export function getSavedAnalyses() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveAnalysis(record) {
  const item = {
    ...record,
    id: record.id || createId(),
    savedAt: record.savedAt || new Date().toISOString()
  };
  const next = [item, ...getSavedAnalyses().filter(existing => existing.id !== item.id)]
    .slice(0, MAX_ANALYSES);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return item;
}

export function clearSavedAnalyses() {
  localStorage.removeItem(STORAGE_KEY);
}

export function downloadJson(filename, value) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function createId() {
  return globalThis.crypto?.randomUUID?.() ||
    `analysis-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
