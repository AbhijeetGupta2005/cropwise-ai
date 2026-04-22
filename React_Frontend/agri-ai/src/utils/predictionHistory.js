const STORAGE_KEY = "prediction-history-v1";
const MAX_ENTRIES = 24;

function safeRead() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeWrite(entries) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {}
}

export function getPredictionHistory() {
  return safeRead();
}

export function savePredictionHistory(entry) {
  if (!entry || typeof entry !== "object") return;

  const current = safeRead();
  const normalized = {
    id: `${entry.type || "prediction"}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    ...entry,
  };

  safeWrite([normalized, ...current].slice(0, MAX_ENTRIES));
}

export function clearPredictionHistory() {
  safeWrite([]);
}
