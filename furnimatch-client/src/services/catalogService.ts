import api, { getImageUrl } from '../utils/api';
import type { TileProduct, LayingPattern, SurfaceFinish } from '../types/tile';

export interface BackendProductVariant {
  variantId: number;
  productId: number;
  sizeName?: string;
  materialName?: string;
  width?: number;   // In cm
  height?: number;  // In cm (thickness)
  length?: number;  // In cm
  productionDays?: number;
  color?: string;
  price: number;
  stock?: number;
}

export interface BackendProductImage {
  productImageId: number;
  productId: number;
  imageUrl: string;
  isThumbnail: boolean;
  displayOrder: number;
}

export interface BackendProduct {
  productId: number;
  sellerId: number;
  categoryId: number;
  category?: {
    categoryId: number;
    name: string;
    description?: string;
  };
  seller?: {
    userId: number;
    shopName?: string;
  };
  name: string;
  description?: string;
  price: number;
  material?: string;
  length?: number;
  width?: number;
  height?: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  productVariants: BackendProductVariant[];
  productImages: BackendProductImage[];
}

export interface BackendCategory {
  categoryId: number;
  name: string;
  description?: string;
}

/**
 * Known curated high-resolution 3D surface textures mapped strictly to products
 * that have dedicated, verified top-down PBR texture files in the system.
 */
const VERIFIED_3D_TEXTURE_MAP: Record<number, {
  textureUrl: string;
  category: 'marble' | 'stone' | 'concrete' | 'wood';
  finish: SurfaceFinish;
  finishLabel: string;
  roughness: number;
  clearcoat: number;
  groutColor: string;
  defaultPattern: LayingPattern;
}> = {
  // Product ID 9: Gạch Vân Đá Marble Bóng Kính (Calacatta Marble Glazed)
  9: {
    textureUrl: '/textures/tiles/calacatta-marble.png',
    category: 'marble',
    finish: 'Polished',
    finishLabel: 'Bóng kiếng toàn phần (Nano Polish)',
    roughness: 0.08,
    clearcoat: 0.95,
    groutColor: '#e2e8f0',
    defaultPattern: 'grid',
  },
  // Product ID 4: Gạch Giả Gỗ (Oak Wood Planks)
  4: {
    textureUrl: '/textures/tiles/oak-wood-planks.png',
    category: 'wood',
    finish: 'Textured',
    finishLabel: 'Vân gỗ nổi chống trượt R10',
    roughness: 0.55,
    clearcoat: 0.05,
    groutColor: '#8c6b4f',
    defaultPattern: 'staggered_33',
  },
};

/**
 * Converts a raw Backend Product from DB into a rich TileProduct model
 * preserving real IDs, SKU, dimensions, prices, images, and texture availability.
 */
export function mapBackendProductToTile(product: BackendProduct): TileProduct {
  const verified3D = VERIFIED_3D_TEXTURE_MAP[product.productId];
  const has3DTexture = Boolean(verified3D && verified3D.textureUrl);

  // Extract dimensions and price from first variant or root product
  const primaryVariant = product.productVariants?.[0];
  const widthCm = primaryVariant?.width || product.width || 60;
  const heightCm = primaryVariant?.length || product.length || widthCm; // Length is tile height
  const thicknessMm = primaryVariant?.height || product.height || 10;
  const price = primaryVariant?.price || product.price || 0;

  // Real thumbnail from Cloudinary / backend uploads
  const rawImgUrl = product.productImages?.[0]?.imageUrl;
  const thumbnailUrl = rawImgUrl ? getImageUrl(rawImgUrl) : '';

  // Calculate box area in m² realistically
  const singleTileM2 = (widthCm * heightCm) / 10000;
  const piecesPerBox = widthCm >= 80 ? 3 : widthCm >= 60 ? 4 : 8;
  const boxAreaM2 = Number((singleTileM2 * piecesPerBox).toFixed(2)) || 1.44;

  const sku = `FMT-G${product.productId.toString().padStart(4, '0')}`;

  const category: 'marble' | 'stone' | 'concrete' | 'wood' = verified3D?.category || (
    product.name.toLowerCase().includes('gỗ') ? 'wood' :
    product.name.toLowerCase().includes('marble') || product.name.toLowerCase().includes('đá') ? 'marble' :
    product.name.toLowerCase().includes('bê tông') || product.name.toLowerCase().includes('granite') ? 'concrete' :
    'stone'
  );

  return {
    id: String(product.productId),
    productId: product.productId,
    sku,
    code: sku,
    name: product.name,
    category,
    finish: verified3D?.finish || 'Polished',
    finishLabel: verified3D?.finishLabel || (product.material || 'Gạch men cao cấp'),
    sizeLabel: `${widthCm} × ${heightCm} cm`,
    width: widthCm,
    height: heightCm,
    widthCm,
    heightCm,
    thicknessMm,
    price,
    pricePerM2: price,
    unit: 'm²',
    piecesPerBox,
    boxAreaM2,
    origin: product.seller?.shopName ? `Nhà SX: ${product.seller.shopName}` : 'Việt Nam (Chính hãng)',
    description: product.description || 'Sản phẩm gạch lát nền chất lượng cao từ danh mục FurniMatch.',
    features: [
      'Xương gạch đặc chắc chống thấm',
      'Độ bền chịu lực cao',
      'Bề mặt chống mài mòn',
      ...(has3DTexture ? ['Đã hỗ trợ xem 3D PBR'] : ['Chưa có texture 3D']),
    ],
    recommendedSpaces: ['Phòng khách', 'Phòng ngủ', 'Hành lang'],
    textureUrl: verified3D?.textureUrl || '',
    thumbnailUrl,
    has3DTexture,
    textureNote: has3DTexture
      ? undefined
      : 'Sản phẩm chưa có file texture bề mặt phẳng đạt chuẩn 3D từ nhà sản xuất. Ảnh hiện tại là ảnh phối cảnh / chụp mẫu thực tế.',
    groutColor: verified3D?.groutColor || '#cfcfcf',
    defaultPattern: verified3D?.defaultPattern || 'grid',
    materialProperties: {
      roughness: verified3D?.roughness ?? 0.25,
      metalness: 0.02,
      clearcoat: verified3D?.clearcoat ?? 0.7,
      clearcoatRoughness: 0.15,
      reflectivity: 0.5,
    },
    visual: {
      baseColor: '#e2e8f0',
      accentColor: '#94a3b8',
      style: category === 'wood' ? 'wood_plank' : category === 'marble' ? 'calacatta' : 'concrete',
      roughness: verified3D?.roughness ?? 0.25,
      metalness: 0.02,
      groutColor: verified3D?.groutColor || '#cfcfcf',
      bevelStrength: 0.8,
    },
    rawProduct: product,
    selectedVariant: primaryVariant,
    variants: (product.productVariants || []).map((v) => ({
      variantId: v.variantId,
      sizeName: v.sizeName || `${v.width || widthCm}×${v.length || heightCm} cm`,
      width: v.width || widthCm,
      length: v.length || heightCm,
      price: v.price,
      stock: v.stock ?? 0,
    })),
  };
}

/**
 * Fetches real active tile products directly from backend /api/products
 * using the real /api/categories endpoint to identify the flooring tiles category.
 */
export async function fetchRealCatalogTiles(): Promise<{
  tiles: TileProduct[];
  categories: BackendCategory[];
  tileCategoryId?: number;
}> {
  // 1. Fetch categories
  const categoriesRes = await api.get<BackendCategory[]>('/categories');
  const categories = categoriesRes.data || [];

  // Find tile category (e.g. "Gạch Lát Nền" or containing "gạch")
  const tileCategory = categories.find((c) =>
    c.name.toLowerCase().includes('gạch lát nền') || c.name.toLowerCase().includes('gạch')
  );

  const categoryId = tileCategory ? tileCategory.categoryId : undefined;

  // 2. Fetch products with category filter if identified, or all products
  const params: Record<string, any> = { _t: Date.now() };
  if (categoryId) {
    params.categoryId = categoryId;
  }

  const productsRes = await api.get<BackendProduct[]>('/products', { params });
  let products = productsRes.data || [];

  // If category wasn't in params, filter products whose category or name mentions "gạch"
  if (!categoryId && products.length > 0) {
    products = products.filter(
      (p) =>
        (p.category && p.category.name.toLowerCase().includes('gạch')) ||
        p.name.toLowerCase().includes('gạch')
    );
  }

  if (products.length === 0) {
    return { tiles: [], categories, tileCategoryId: categoryId };
  }

  const mappedTiles = products.map(mapBackendProductToTile);

  return {
    tiles: mappedTiles,
    categories,
    tileCategoryId: categoryId,
  };
}

/**
 * Fetches furniture products from backend (categories like Sofa, Bàn Trà, Giường Ngủ, Tủ)
 */
export async function fetchRealCatalogFurniture(): Promise<BackendProduct[]> {
  try {
    const productsRes = await api.get<BackendProduct[]>('/products', {
      params: { _t: Date.now() },
    });
    const allProducts = productsRes.data || [];
    // Filter non-tile products (furniture categories)
    return allProducts.filter((p) => {
      const catName = (p.category?.name || '').toLowerCase();
      const prodName = p.name.toLowerCase();
      return (
        !catName.includes('gạch') &&
        !prodName.includes('gạch') &&
        (catName.includes('sofa') ||
          catName.includes('bàn') ||
          catName.includes('giường') ||
          catName.includes('tủ') ||
          prodName.includes('sofa') ||
          prodName.includes('bàn') ||
          prodName.includes('giường') ||
          prodName.includes('tủ'))
      );
    });
  } catch (err) {
    console.warn('Could not fetch real catalog furniture:', err);
    return [];
  }
}
