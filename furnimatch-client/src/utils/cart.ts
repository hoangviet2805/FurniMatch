import { repairVietnameseText } from './text';

export type CartItem = {
  productId: number;
  variantId?: number;
  name: string;
  sizeLabel: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  sellerName?: string;
};

const CART_KEY = 'furnimatchCart';

export const getCart = (): CartItem[] => {
  try {
    const items = JSON.parse(localStorage.getItem(CART_KEY) ?? '[]') as CartItem[];
    const repaired = items.map(item => ({ ...item, name: repairVietnameseText(item.name), sizeLabel: repairVietnameseText(item.sizeLabel), sellerName: item.sellerName ? repairVietnameseText(item.sellerName) : undefined }));
    if (JSON.stringify(items) !== JSON.stringify(repaired)) localStorage.setItem(CART_KEY, JSON.stringify(repaired));
    return repaired;
  } catch { return []; }
};

export const saveCart = (items: CartItem[]) => {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event('cart-changed'));
};

export const addToCart = (item: CartItem) => {
  const items = getCart();
  const existing = items.find(x => x.productId === item.productId && x.variantId === item.variantId);
  if (existing) existing.quantity += item.quantity;
  else items.push(item);
  saveCart(items);
};

export const cartCount = () => getCart().reduce((sum, item) => sum + item.quantity, 0);
