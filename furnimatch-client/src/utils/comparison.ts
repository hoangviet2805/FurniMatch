const COMPARE_KEY = 'comparisonProductIds';
const RECENT_KEY = 'recentProductIds';

const sanitizeIds = (raw: any): number[] => {
  if (!Array.isArray(raw)) return [];
  const unique = Array.from(
    new Set(raw.map((x: any) => Number(x)).filter((n: number) => Number.isInteger(n) && n > 0))
  );
  return unique.slice(0, 3);
};

const readIds = (key: string): number[] => {
  try {
    const raw = JSON.parse(localStorage.getItem(key) ?? '[]');
    const sanitized = sanitizeIds(raw);
    if (JSON.stringify(raw) !== JSON.stringify(sanitized)) {
      localStorage.setItem(key, JSON.stringify(sanitized));
      window.dispatchEvent(new Event('comparison-changed'));
    }
    return sanitized;
  } catch {
    return [];
  }
};

export const getComparisonIds = (): number[] => readIds(COMPARE_KEY);

export const setComparisonProductIds = (ids: number[]) => {
  const sanitized = sanitizeIds(ids);
  localStorage.setItem(COMPARE_KEY, JSON.stringify(sanitized));
  window.dispatchEvent(new Event('comparison-changed'));
};

export const clearComparison = () => {
  localStorage.removeItem(COMPARE_KEY);
  window.dispatchEvent(new Event('comparison-changed'));
};

export const isCompared = (id: number | string): boolean => {
  const numId = Number(id);
  return getComparisonIds().includes(numId);
};

export const toggleComparison = (id: number | string) => {
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) {
    return { added: false, limitReached: false };
  }

  const current = getComparisonIds();
  if (current.includes(numId)) {
    const next = current.filter(item => item !== numId);
    setComparisonProductIds(next);
    return { added: false, limitReached: false };
  }

  if (current.length >= 3) {
    return { added: false, limitReached: true };
  }

  const next = [...current, numId];
  setComparisonProductIds(next);
  return { added: true, limitReached: false };
};

export const addRecentlyViewed = (id: number | string) => {
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) return;
  const raw = readIds(RECENT_KEY);
  const next = [numId, ...raw.filter(item => item !== numId)].slice(0, 8);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
};

export const getRecentlyViewedIds = (): number[] => readIds(RECENT_KEY);
