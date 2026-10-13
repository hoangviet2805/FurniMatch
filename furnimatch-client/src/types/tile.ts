export type TileCategory = 'marble' | 'stone' | 'concrete' | 'wood' | 'all';

export type SurfaceFinish = 'Polished' | 'Matte' | 'Satin' | 'Textured';

export type LayingPattern = 'grid' | 'staggered_50' | 'staggered_33';

export type RectangularDirection = 'horizontal' | 'vertical';

export interface TileMaterialProperties {
  roughness: number;         // 0.0 - 1.0
  metalness: number;         // 0.0 - 1.0
  clearcoat: number;         // 0.0 - 1.0 (Lớp men bóng kính cho gạch bóng)
  clearcoatRoughness: number;// 0.0 - 1.0 (Độ tán xạ lớp men)
  reflectivity?: number;     // 0.0 - 1.0
}

export interface TileProduct {
  id: string;
  sku: string;               // Mã SKU chuẩn (e.g. "FMT-8001")
  code: string;              // Alias for sku
  name: string;
  category: 'marble' | 'stone' | 'concrete' | 'wood';
  finish: SurfaceFinish;
  finishLabel: string;
  sizeLabel: string;         // e.g. "80 × 80 cm"
  width: number;             // Chiều rộng (cm)
  height: number;            // Chiều cao (cm)
  widthCm: number;           // Alias for width
  heightCm: number;          // Alias for height
  thicknessMm: number;       // Độ dày (mm)
  price: number;             // Đơn giá bán (VNĐ)
  pricePerM2: number;        // Alias for price
  unit: string;              // "m²"
  piecesPerBox: number;      // Số viên / hộp
  boxAreaM2: number;         // Diện tích / hộp (m²)
  origin: string;            // Xuất xứ
  description: string;
  features: string[];
  recommendedSpaces: string[];
  textureUrl: string;        // Đường dẫn texture bề mặt sản phẩm
  thumbnailUrl?: string;     // Đường dẫn ảnh thu nhỏ
  has3DTexture?: boolean;    // Cờ đánh dấu sản phẩm đã có texture 3D đạt chuẩn
  textureNote?: string;      // Ghi chú nếu chưa có texture 3D
  productId?: number;        // ID sản phẩm thực tế từ Database
  rawProduct?: any;          // Dữ liệu sản phẩm gốc từ API
  selectedVariant?: any;     // Biến thể kích thước/giá đang chọn
  variants?: Array<{
    variantId: number;
    sizeName?: string;
    width?: number;
    length?: number;
    price: number;
    stock?: number;
  }>;
  groutColor: string;        // Màu ron đề xuất
  defaultPattern: LayingPattern; // Kiểu lát mặc định
  materialProperties: TileMaterialProperties;
  visual: {
    baseColor: string;
    accentColor: string;
    veinColor?: string;
    style: 'calacatta' | 'travertine' | 'concrete' | 'sandstone' | 'wood_plank' | 'nero_marquina';
    roughness: number;
    metalness: number;
    groutColor: string;
    bevelStrength: number;
  };
}

export interface TileLayoutOptions {
  pattern: LayingPattern;            // Lát thẳng, Lát so le 50%, Lát so le 33%
  direction: RectangularDirection;   // Chiều dọc hay ngang đối với gạch chữ nhật
  orientation: 0 | 45 | 90;          // Góc xoay sàn (0°, 45°, 90°)
  groutColor: string;                // Mã màu đường ron
  groutWidthMm: number;              // Độ rộng ron (1.5 - 4.0 mm)
  finishEnhancement: 'normal' | 'glossy' | 'extra_matte';
}

export interface RoomPresetView {
  id: string;
  name: string;
  position: [number, number, number];
  target: [number, number, number];
}
