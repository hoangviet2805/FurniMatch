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

export const addToCart = (item: CartItem): { success: boolean; isDuplicate?: boolean; needReplace?: boolean; message: string } => {
  const items = getCart();
  if (items.length > 0) {
    const current = items[0];
    if (current.productId === item.productId && current.variantId === item.variantId) {
      return {
        success: false,
        isDuplicate: true,
        message: 'Sản phẩm này đã có trong giỏ hàng (tối đa 1 sản phẩm).'
      };
    }
    return {
      success: false,
      needReplace: true,
      message: `Giỏ hàng hiện đã có sản phẩm "${current.name}". Giỏ hàng chỉ cho phép tối đa 1 sản phẩm.`
    };
  }
  saveCart([{ ...item, quantity: 1 }]);
  return {
    success: true,
    message: 'Đã thêm sản phẩm vào giỏ hàng thành công!'
  };
};

export const cartCount = () => getCart().reduce((sum, item) => sum + item.quantity, 0);
