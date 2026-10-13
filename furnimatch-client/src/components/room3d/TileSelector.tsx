import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Check,
  Sparkles,
  Calculator,
  SlidersHorizontal,
  Info,
  ShieldCheck,
  Compass,
  DollarSign,
  Box,
  Layers,
  MoveHorizontal,
  Maximize2,
  Armchair,
  ShoppingCart,
  ExternalLink,
  AlertTriangle,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import type { TileProduct, TileLayoutOptions, TileCategory } from '../../types/tile';
import type { RoomType, FurnitureModelDef, PlacedFurnitureItem } from '../../types/furniture';
import { GROUT_COLOR_OPTIONS, GROUT_WIDTH_OPTIONS, LAYING_PATTERNS } from '../../data/tileProducts';
import { renderTileThumbnail } from '../../utils/tileTextureGenerator';
import { FurnitureSelector } from './FurnitureSelector';
import { addToCart } from '../../utils/cart';

interface TileSelectorProps {
  tiles: TileProduct[];
  selectedTile: TileProduct;
  onSelectTile: (tile: TileProduct) => void;
  options: TileLayoutOptions;
  onOptionsChange: (options: TileLayoutOptions) => void;
  // Furniture customization props
  roomType: RoomType;
  onRoomTypeChange: (roomType: RoomType) => void;
  onAddFurniture: (modelDef: FurnitureModelDef) => void;
  placedItems: PlacedFurnitureItem[];
  selectedInstanceId: string | null;
  onSelectInstance: (instanceId: string | null) => void;
  onRotateInstance: () => void;
  onDuplicateInstance: () => void;
  onDeleteInstance: (instanceId: string) => void;
  onResetLayout: () => void;
  onSaveDesign: () => void;
  isSaved?: boolean;
  // Live catalog synchronization props
  isLoading?: boolean;
  onRefreshCatalog?: () => void;
  onSelectVariant?: (variant: any) => void;
}

// Subcomponent to render product thumbnail (real catalog photo or procedural fallback)
const TileThumbnail = ({ tile, isSelected }: { tile: TileProduct; isSelected: boolean }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
    if (!tile.thumbnailUrl && canvasRef.current) {
      renderTileThumbnail(canvasRef.current, tile);
    }
  }, [tile]);

  const hasPhoto = Boolean(tile.thumbnailUrl && !imageError);

  return (
    <div
      className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden shrink-0 border-2 transition-all bg-gray-100 ${
        isSelected
          ? 'border-emerald-600 shadow-md ring-2 ring-emerald-500/30'
          : 'border-gray-200 group-hover:border-gray-300'
      }`}
    >
      {hasPhoto ? (
        <img
          src={tile.thumbnailUrl}
          alt={tile.name}
          onError={() => setImageError(true)}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <canvas
          ref={canvasRef}
          width={160}
          height={160}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      )}

      {/* Badges */}
      {tile.has3DTexture ? (
        <span className="absolute bottom-1 right-1 bg-emerald-600/95 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
          3D Ready
        </span>
      ) : (
        <span className="absolute bottom-1 right-1 bg-amber-500/95 text-slate-950 text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
          Ảnh chụp
        </span>
      )}

      {isSelected && (
        <div className="absolute top-1.5 right-1.5 bg-emerald-600 text-white rounded-full p-1 shadow-sm">
          <Check size={12} strokeWidth={3} />
        </div>
      )}
    </div>
  );
};

export const TileSelector = ({
  tiles,
  selectedTile,
  onSelectTile,
  options,
  onOptionsChange,
  roomType,
  onRoomTypeChange,
  onAddFurniture,
  placedItems,
  selectedInstanceId,
  onSelectInstance,
  onRotateInstance,
  onDuplicateInstance,
  onDeleteInstance,
  onResetLayout,
  onSaveDesign,
  isSaved,
  isLoading = false,
  onRefreshCatalog,
  onSelectVariant,
}: TileSelectorProps) => {
  const [activeTab, setActiveTab] = useState<'catalog' | 'furniture' | 'customize' | 'estimate'>('catalog');
  const [categoryFilter, setCategoryFilter] = useState<TileCategory>('all');
  const [roomArea, setRoomArea] = useState<number>(25); // Default 25 m²
  const [cartToast, setCartToast] = useState<string | null>(null);

  // Filtered tiles
  const filteredTiles =
    categoryFilter === 'all' ? tiles : tiles.filter((t) => t.category === categoryFilter);

  // Is current tile rectangular?
  const isRectangular = selectedTile.width !== selectedTile.height;

  // Calculation for estimating boxes and cost
  const safetyMargin = 1.05; // 5% cuts & wastage
  const areaWithWaste = roomArea * safetyMargin;
  const boxesNeeded = Math.ceil(areaWithWaste / (selectedTile.boxAreaM2 || 1.44));
  const totalTilesCount = boxesNeeded * (selectedTile.piecesPerBox || 4);
  const actualCoveredArea = (boxesNeeded * (selectedTile.boxAreaM2 || 1.44)).toFixed(2);
  const totalCost = boxesNeeded * (selectedTile.boxAreaM2 || 1.44) * selectedTile.price;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const handleAddToCart = (tile: TileProduct, quantity = 1) => {
    const pId = tile.productId || parseInt(tile.id) || 1;
    const res = addToCart({
      productId: pId,
      variantId: tile.selectedVariant?.variantId,
      name: tile.name,
      sizeLabel: tile.sizeLabel,
      price: tile.price,
      quantity,
      imageUrl: tile.thumbnailUrl,
      sellerName: tile.origin,
      sellerId: tile.rawProduct?.sellerId,
    });
    setCartToast(res.message);
    setTimeout(() => setCartToast(null), 3500);
  };

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden flex flex-col h-full relative">
      {/* Toast Notification */}
      {cartToast && (
        <div className="absolute top-3 left-4 right-4 z-50 bg-emerald-700 text-white p-3 rounded-2xl shadow-xl flex items-center justify-between gap-2 text-xs font-semibold animate-fadeIn">
          <div className="flex items-center gap-2">
            <ShoppingCart size={16} />
            <span>{cartToast}</span>
          </div>
          <Link to="/cart" className="underline font-bold text-emerald-100 hover:text-white shrink-0">
            Xem giỏ
          </Link>
        </div>
      )}

      {/* Top Navigation Tabs */}
      <div className="p-2.5 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between gap-1.5 overflow-x-auto scrollbar-none">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('catalog')}
            className={`py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'catalog'
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <Sparkles size={14} />
            <span>Mẫu gạch ({tiles.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('furniture')}
            className={`py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'furniture'
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <Armchair size={14} />
            <span>Nội thất ({placedItems.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('customize')}
            className={`py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'customize'
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <SlidersHorizontal size={14} />
            <span>Kiểu lát & Ron</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('estimate')}
            className={`py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'estimate'
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <Calculator size={14} />
            <span>Dự toán</span>
          </button>
        </div>

        {onRefreshCatalog && (
          <button
            type="button"
            onClick={onRefreshCatalog}
            title="Làm mới danh mục từ máy chủ"
            className="p-2 rounded-xl text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 transition cursor-pointer shrink-0"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
        )}
      </div>

      {/* Content Area */}
      <div className="p-5 flex-1 overflow-y-auto max-h-[620px] scrollbar-thin">
        {/* TAB 1: TILE CATALOG */}
        {activeTab === 'catalog' && (
          <div className="space-y-4">
            {/* Real Catalog Source Status Banner */}
            <div className="flex items-center justify-between text-xs bg-emerald-50/70 border border-emerald-100 p-2.5 rounded-2xl text-emerald-900">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>
                  Danh mục <strong>Gạch Lát Nền</strong> đồng bộ từ cơ sở dữ liệu FurniMatch
                </span>
              </div>
              <span className="text-[11px] font-bold text-emerald-700">{tiles.length} sản phẩm</span>
            </div>

            {/* Category filter pills */}
            <div className="flex flex-wrap gap-1.5 pb-2 border-b border-gray-100">
              {[
                { id: 'all', label: 'Tất cả' },
                { id: 'marble', label: 'Vân đá Marble' },
                { id: 'concrete', label: 'Xi măng & Bê tông' },
                { id: 'stone', label: 'Đá sa thạch nhám' },
                { id: 'wood', label: 'Vân gỗ tự nhiên' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryFilter(cat.id as TileCategory)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    categoryFilter === cat.id
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* List of Tile Cards */}
            {isLoading ? (
              <div className="py-12 text-center text-gray-500 space-y-3">
                <div className="w-8 h-8 border-3 border-emerald-500/30 border-t-emerald-600 rounded-full animate-spin mx-auto" />
                <p className="text-xs">Đang lấy danh mục gạch từ máy chủ...</p>
              </div>
            ) : filteredTiles.length === 0 ? (
              <div className="py-10 text-center text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200 p-6">
                <AlertCircle className="mx-auto mb-2 text-gray-400" size={24} />
                <p className="text-xs">Không tìm thấy sản phẩm gạch nào trong danh mục này.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTiles.map((tile) => {
                  const isSelected = selectedTile.id === tile.id;
                  return (
                    <div
                      key={tile.id}
                      onClick={() => onSelectTile(tile)}
                      className={`group p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex gap-3.5 items-center ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50/50 shadow-md ring-1 ring-emerald-500/20'
                          : 'border-gray-100 hover:border-emerald-200 bg-white hover:bg-gray-50/60 shadow-sm'
                      }`}
                    >
                      <TileThumbnail tile={tile} isSelected={isSelected} />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-700">
                            {tile.sku}
                          </span>
                          <span className="text-[11px] font-medium text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                            {tile.sizeLabel}
                          </span>
                        </div>

                        <h4 className="font-bold text-gray-900 text-sm mt-1 truncate group-hover:text-emerald-700 transition">
                          {tile.name}
                        </h4>

                        <p className="text-xs text-gray-500 mt-0.5 truncate">
                          {tile.finishLabel}
                        </p>

                        <div className="mt-2 flex items-baseline justify-between">
                          <span className="text-sm font-extrabold text-emerald-700">
                            {formatPrice(tile.price)}
                            <span className="text-[11px] font-normal text-gray-400">/{tile.unit}</span>
                          </span>

                          {tile.has3DTexture ? (
                            <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                              {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" />}
                              ✓ 3D Preview
                            </span>
                          ) : (
                            <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded font-medium">
                              Chưa có texture 3D
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: FURNITURE CUSTOMIZATION */}
        {activeTab === 'furniture' && (
          <FurnitureSelector
            roomType={roomType}
            onRoomTypeChange={onRoomTypeChange}
            onAddFurniture={onAddFurniture}
            placedItems={placedItems}
            selectedInstanceId={selectedInstanceId}
            onSelectInstance={onSelectInstance}
            onRotateInstance={onRotateInstance}
            onDuplicateInstance={onDuplicateInstance}
            onDeleteInstance={onDeleteInstance}
            onResetLayout={onResetLayout}
            onSaveDesign={onSaveDesign}
            isSaved={isSaved}
          />
        )}

        {/* TAB 3: CUSTOMIZE LAYOUT & GROUT */}
        {activeTab === 'customize' && (
          <div className="space-y-6">
            {/* Notice if selected tile has no 3D texture */}
            {selectedTile.has3DTexture === false && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start gap-2.5">
                <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Mẫu gạch chưa có texture 3D:</strong> Các tùy chọn kiểu lát và ron sẽ áp dụng khi nhà sản xuất cập nhật texture bề mặt phẳng.
                </div>
              </div>
            )}

            {/* Laying Pattern */}
            <div>
              <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Layers size={17} className="text-emerald-600" />
                Kiểu lát nền (Laying Pattern)
              </h4>
              <p className="text-xs text-gray-500 mt-1">
                Lựa chọn phương pháp xếp đặt mạch ron phù hợp với kích thước {selectedTile.sizeLabel}.
              </p>

              <div className="mt-3 space-y-2">
                {LAYING_PATTERNS.map((p) => {
                  const isActive = options.pattern === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => onOptionsChange({ ...options, pattern: p.id })}
                      className={`w-full p-3 rounded-2xl border-2 text-left transition cursor-pointer flex items-center justify-between ${
                        isActive
                          ? 'border-emerald-600 bg-emerald-50/60 shadow-sm'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div>
                        <span className="block text-xs font-bold text-gray-900">{p.name}</span>
                        <span className="block text-[11px] text-gray-500 mt-0.5">{p.desc}</span>
                      </div>
                      {isActive && (
                        <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                          <Check size={12} strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Rectangular Direction */}
            {isRectangular && (
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
                <h4 className="text-xs font-bold text-gray-900 flex items-center gap-2">
                  <MoveHorizontal size={15} className="text-emerald-600" />
                  Định hướng thanh gạch chữ nhật
                </h4>
                <div className="mt-2.5 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onOptionsChange({ ...options, direction: 'horizontal' })}
                    className={`py-2 px-3 rounded-xl border-2 text-center text-xs font-bold transition cursor-pointer ${
                      options.direction === 'horizontal'
                        ? 'border-emerald-600 bg-white text-emerald-800 shadow-sm'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Ngang theo sofa
                  </button>
                  <button
                    type="button"
                    onClick={() => onOptionsChange({ ...options, direction: 'vertical' })}
                    className={`py-2 px-3 rounded-xl border-2 text-center text-xs font-bold transition cursor-pointer ${
                      options.direction === 'vertical'
                        ? 'border-emerald-600 bg-white text-emerald-800 shadow-sm'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Dọc theo chiều sâu phòng
                  </button>
                </div>
              </div>
            )}

            {/* Orientation */}
            <div>
              <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Compass size={17} className="text-emerald-600" />
                Hướng xoay mạch gạch
              </h4>
              <div className="mt-2.5 grid grid-cols-3 gap-2">
                {[
                  { angle: 0, label: 'Thẳng (0°)' },
                  { angle: 45, label: 'Chéo quả trám (45°)' },
                  { angle: 90, label: 'Xoay ngang (90°)' },
                ].map((item) => (
                  <button
                    key={item.angle}
                    type="button"
                    onClick={() => onOptionsChange({ ...options, orientation: item.angle as any })}
                    className={`py-2 px-2 rounded-xl border text-center text-xs font-bold transition cursor-pointer ${
                      options.orientation === item.angle
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Grout Width */}
            <div>
              <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Maximize2 size={17} className="text-emerald-600" />
                Độ rộng đường ron (Grout width)
              </h4>
              <p className="text-xs text-gray-500 mt-1">
                Độ rộng khe chỉ giữa các viên gạch theo tiêu chuẩn kỹ thuật.
              </p>
              <div className="mt-2.5 grid grid-cols-2 gap-2">
                {GROUT_WIDTH_OPTIONS.map((gw) => (
                  <button
                    key={gw.value}
                    type="button"
                    onClick={() => onOptionsChange({ ...options, groutWidthMm: gw.value })}
                    className={`py-2 px-3 rounded-xl border-2 text-center text-xs font-semibold transition cursor-pointer ${
                      options.groutWidthMm === gw.value
                        ? 'border-emerald-600 bg-emerald-50/60 text-emerald-900 font-bold'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {gw.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Grout Color */}
            <div>
              <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <SlidersHorizontal size={17} className="text-emerald-600" />
                Màu đường ron gạch
              </h4>
              <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {GROUT_COLOR_OPTIONS.map((grout) => (
                  <button
                    key={grout.id}
                    type="button"
                    onClick={() => onOptionsChange({ ...options, groutColor: grout.color })}
                    className={`p-2.5 rounded-2xl border-2 flex items-center gap-3 transition cursor-pointer ${
                      options.groutColor.toLowerCase() === grout.color.toLowerCase()
                        ? 'border-emerald-600 bg-emerald-50/50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <span
                      className="w-6 h-6 rounded-full border border-gray-300 shadow-inner shrink-0"
                      style={{ backgroundColor: grout.color }}
                    />
                    <span className="text-xs font-semibold text-gray-800 truncate">{grout.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Finish Enhancement */}
            <div>
              <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Sparkles size={17} className="text-emerald-600" />
                Hiệu ứng độ bóng vật liệu (PBR)
              </h4>
              <div className="mt-2.5 grid grid-cols-3 gap-2">
                {[
                  { id: 'normal', label: 'Chuẩn nhà SX' },
                  { id: 'glossy', label: 'Bóng gương tăng cường' },
                  { id: 'extra_matte', label: 'Men mờ chống trơn' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onOptionsChange({ ...options, finishEnhancement: item.id as any })}
                    className={`py-2 px-2 rounded-xl border text-center text-xs font-semibold transition cursor-pointer ${
                      options.finishEnhancement === item.id
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: ESTIMATE BOXES & COST */}
        {activeTab === 'estimate' && (
          <div className="space-y-5">
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                <Calculator size={18} className="text-emerald-700" />
                <span>Dự toán diện tích & số hộp gạch</span>
              </div>
              <p className="text-xs text-emerald-800 mt-1">
                Tự động tính toán số hộp gạch cần mua và dự toán ngân sách dựa trên diện tích phòng thực tế.
              </p>
            </div>

            <div>
              <label className="block">
                <span className="text-xs font-bold text-gray-700">Diện tích phòng cần lát (m²):</span>
                <div className="mt-1.5 relative">
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={roomArea}
                    onChange={(e) => setRoomArea(Math.max(1, Number(e.target.value) || 1))}
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 pr-12 font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  />
                  <span className="absolute right-4 top-2.5 text-xs font-bold text-gray-400">m²</span>
                </div>
              </label>
              <p className="text-[11px] text-gray-400 mt-1">
                * Đã tự động tính thêm 5% định mức hao hụt khi cắt góc và chân tường theo tiêu chuẩn xây dựng.
              </p>
            </div>

            {/* Calculations Breakdown */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100">
                <span className="text-gray-500 flex items-center gap-1 font-medium">
                  <Box size={14} className="text-emerald-600" />
                  Số hộp gạch:
                </span>
                <p className="text-xl font-black text-gray-900 mt-1">{boxesNeeded} hộp</p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  ({selectedTile.boxAreaM2 || 1.44} m²/hộp • {selectedTile.piecesPerBox || 4} viên)
                </p>
              </div>

              <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100">
                <span className="text-gray-500 flex items-center gap-1 font-medium">
                  <Info size={14} className="text-sky-600" />
                  Tổng số viên:
                </span>
                <p className="text-xl font-black text-gray-900 mt-1">{totalTilesCount} viên</p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Độ phủ thực: {actualCoveredArea} m²
                </p>
              </div>
            </div>

            {/* Total Cost Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-lg shadow-emerald-700/20">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs uppercase tracking-wider font-semibold text-emerald-100">
                    Tổng chi phí gạch dự tính ({boxesNeeded} hộp)
                  </span>
                  <p className="text-2xl font-black mt-1">{formatPrice(totalCost)}</p>
                </div>
                <div className="p-3 bg-white/10 rounded-2xl">
                  <DollarSign size={24} />
                </div>
              </div>
              <p className="text-[11px] text-emerald-100/90 mt-2 border-t border-white/15 pt-2">
                Giá gạch niêm yết theo diện tích thực mua. Chưa bao gồm keo dán gạch và chi phí thi công.
              </p>

              <button
                type="button"
                onClick={() => handleAddToCart(selectedTile, boxesNeeded)}
                className="mt-3 w-full py-2.5 px-4 rounded-xl bg-white text-emerald-800 hover:bg-emerald-50 font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <ShoppingCart size={15} />
                <span>Thêm {boxesNeeded} hộp gạch vào giỏ hàng</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Selected Tile Details Footer */}
      <div className="p-4 bg-gray-50 border-t border-gray-100 mt-auto">
        {/* Notice if tile lacks 3D texture */}
        {!selectedTile.has3DTexture && (
          <div className="mb-3 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
            <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="leading-tight">
              <span className="font-bold">Chưa hỗ trợ xem trước 3D:</span>{' '}
              {selectedTile.textureNote || 'Mẫu này chưa có ảnh texture bề mặt phẳng. Không gian 3D giữ nguyên sàn trước đó.'}
            </div>
          </div>
        )}

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-extrabold text-gray-900 text-sm truncate">{selectedTile.name}</h3>
              <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                {selectedTile.sku}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{selectedTile.origin}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[11px] text-gray-400">Đơn giá</p>
            <p className="text-base font-black text-emerald-700">{formatPrice(selectedTile.price)}</p>
          </div>
        </div>

        {/* Variants pill switcher if product has variants */}
        {selectedTile.variants && selectedTile.variants.length > 1 && (
          <div className="mt-2.5 p-2 bg-white rounded-xl border border-gray-200">
            <span className="text-[10px] font-bold text-gray-500 block mb-1">Quy cách kích thước & Giá:</span>
            <div className="flex flex-wrap gap-1.5">
              {selectedTile.variants.map((v) => {
                const isVarActive = (selectedTile.selectedVariant?.variantId || selectedTile.variants![0].variantId) === v.variantId;
                return (
                  <button
                    key={v.variantId}
                    type="button"
                    onClick={() => onSelectVariant?.(v)}
                    className={`px-2 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      isVarActive
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-gray-50 border border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {v.sizeName} ({formatPrice(v.price)})
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions: View Product Detail & Add To Cart */}
        <div className="mt-3 flex items-center gap-2">
          {selectedTile.productId ? (
            <Link
              to={`/products/${selectedTile.productId}`}
              className="flex-1 py-2 px-3 rounded-xl border border-gray-300 hover:border-gray-400 bg-white text-gray-800 text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <ExternalLink size={13} />
              <span>Xem chi tiết</span>
            </Link>
          ) : (
            <Link
              to="/products"
              className="flex-1 py-2 px-3 rounded-xl border border-gray-300 hover:border-gray-400 bg-white text-gray-800 text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <ExternalLink size={13} />
              <span>Xem danh mục</span>
            </Link>
          )}

          <button
            type="button"
            onClick={() => handleAddToCart(selectedTile, 1)}
            className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-600/20 cursor-pointer"
          >
            <ShoppingCart size={14} />
            <span>Thêm giỏ hàng</span>
          </button>
        </div>

        {/* Feature Pills */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {selectedTile.features.slice(0, 3).map((feat, idx) => (
            <span
              key={idx}
              className="text-[10px] bg-white border border-gray-200 text-gray-600 px-2 py-0.5 rounded-md flex items-center gap-1"
            >
              <ShieldCheck size={11} className="text-emerald-600" />
              {feat}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
