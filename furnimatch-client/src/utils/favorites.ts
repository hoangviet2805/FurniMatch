const FAVORITES_KEY = 'favoriteProductIds';

export const getFavoriteIds = (): number[] => {
  try {
    const saved = JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? '[]');
    return Array.isArray(saved) ? saved.filter(Number.isInteger) : [];
  } catch {
    return [];
  }
};

export const isFavorite = (id: number) => getFavoriteIds().includes(id);

export const toggleFavorite = (id: number) => {
  const ids = getFavoriteIds();
  const next = ids.includes(id) ? ids.filter(item => item !== id) : [...ids, id];
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event('favorites-changed'));
  return next.includes(id);
};
