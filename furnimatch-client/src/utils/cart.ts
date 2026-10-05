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
  sellerId?: number;
};

const CART_KEY = 'furnimatchCart';

export const getCart = (): CartItem[] => {
  try {
    const items = JSON.parse(localStorage.getItem(CART_KEY) ?? '[]') as CartItem[];
    const repaired = items.map(item => ({
      ...item,
      name: repairVietnameseText(item.name),
      sizeLabel: repairVietnameseText(item.sizeLabel),
      sellerName: item.sellerName ? repairVietnameseText(item.sellerName) : undefined
    }));
    if (JSON.stringify(items) !== JSON.stringify(repaired)) {
      localStorage.setItem(CART_KEY, JSON.stringify(repaired));
    }
    return repaired;
  } catch {
    return [];
  }
};

export const saveCart = (items: CartItem[]) => {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event('cart-changed'));
};

export const addToCart = (item: CartItem): { success: boolean; message: string } => {
  const items = getCart();
  const existingIndex = items.findIndex(
    x => x.productId === item.productId && x.variantId === item.variantId
  );

  const addQty = item.quantity > 0 ? item.quantity : 1;

  if (existingIndex > -1) {
    items[existingIndex].quantity += addQty;
  } else {
    items.push({ ...item, quantity: addQty });
  }

  saveCart(items);
  return {
    success: true,
    message: `Đã thêm ${addQty} sản phẩm vào giỏ hàng thành công!`
  };
};

export const updateCartQuantity = (productId: number, variantId: number | undefined, quantity: number) => {
  let items = getCart();
  if (quantity <= 0) {
    items = items.filter(x => !(x.productId === productId && x.variantId === variantId));
  } else {
    const item = items.find(x => x.productId === productId && x.variantId === variantId);
    if (item) {
      item.quantity = quantity;
    }
  }
  saveCart(items);
};

export const removeFromCart = (productId: number, variantId: number | undefined) => {
  const items = getCart().filter(x => !(x.productId === productId && x.variantId === variantId));
  saveCart(items);
};

export const cartCount = () => getCart().reduce((sum, item) => sum + item.quantity, 0);
