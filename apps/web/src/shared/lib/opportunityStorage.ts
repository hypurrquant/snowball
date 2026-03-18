// localStorage-based frequency/dismiss manager for opportunity toasts.
// All functions have SSR guards — safe to import in server-rendered modules.

const STORAGE_KEY = "snowball:opportunity-toast";
const MAX_DAILY = 3;
const DISMISS_TTL_MS = 86_400_000; // 24 hours

interface StorageData {
  dailyCount: number;
  dailyResetDate: string; // YYYY-MM-DD
  dismissed: Record<string, number>; // opportunityId → epoch ms
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function load(): StorageData {
  if (typeof window === "undefined") {
    return { dailyCount: 0, dailyResetDate: today(), dismissed: {} };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { dailyCount: 0, dailyResetDate: today(), dismissed: {} };
    return JSON.parse(raw) as StorageData;
  } catch {
    return { dailyCount: 0, dailyResetDate: today(), dismissed: {} };
  }
}

function save(data: StorageData): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // quota exceeded or private browsing — silently ignore
  }
}

/** Returns true if another toast can be shown today (< 3 shown so far). */
export function canShowToast(): boolean {
  if (typeof window === "undefined") return false;
  const data = load();
  if (data.dailyResetDate !== today()) return true; // new day — reset
  return data.dailyCount < MAX_DAILY;
}

/** Increments the daily shown counter. Resets count on a new calendar day. */
export function recordToastShown(): void {
  if (typeof window === "undefined") return;
  const data = load();
  if (data.dailyResetDate !== today()) {
    save({ dailyCount: 1, dailyResetDate: today(), dismissed: data.dismissed });
  } else {
    save({ ...data, dailyCount: data.dailyCount + 1 });
  }
}

/** Marks an opportunity as dismissed for 24 hours. */
export function dismissOpportunity(id: string): void {
  if (typeof window === "undefined") return;
  const data = load();
  save({ ...data, dismissed: { ...data.dismissed, [id]: Date.now() } });
}

/** Returns true if the opportunity was dismissed within the last 24 hours. */
export function isDismissed(id: string): boolean {
  if (typeof window === "undefined") return false;
  const data = load();
  const ts = data.dismissed[id];
  if (!ts) return false;
  return Date.now() - ts < DISMISS_TTL_MS;
}

/** Deterministic ID from trigger type + market/token key. */
export function generateOpportunityId(type: string, key: string): string {
  return `${type}:${key}`;
}
