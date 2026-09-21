const COMPARE_KEY = 'comparisonProductIds';
const RECENT_KEY = 'recentProductIds';

const readIds = (key: string) => {
  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? '[]');
    return Array.isArray(saved) ? saved.filter(Number.isInteger) : [];
  } catch { return []; }
};

export const getComparisonIds = () => readIds(COMPARE_KEY);
export const isCompared = (id: number) => getComparisonIds().includes(id);

export const toggleComparison = (id: number) => {
  const current = getComparisonIds();
  if (current.includes(id)) {
    localStorage.setItem(COMPARE_KEY, JSON.stringify(current.filter(item => item !== id)));
    window.dispatchEvent(new Event('comparison-changed'));
    return { added: false, limitReached: false };
  }
  if (current.length >= 3) return { added: false, limitReached: true };
  localStorage.setItem(COMPARE_KEY, JSON.stringify([...current, id]));
  window.dispatchEvent(new Event('comparison-changed'));
  return { added: true, limitReached: false };
};

export const addRecentlyViewed = (id: number) => {
  const next = [id, ...readIds(RECENT_KEY).filter(item => item !== id)].slice(0, 8);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
};

export const getRecentlyViewedIds = () => readIds(RECENT_KEY);
