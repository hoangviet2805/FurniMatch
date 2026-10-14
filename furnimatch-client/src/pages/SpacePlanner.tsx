import { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  MessageCircle,
  ArrowRight,
  Truck,
  RefreshCw,
  Scissors,
  Award,
  Home,
  ShoppingCart,
  ExternalLink,
  AlertTriangle,
  Camera,
} from 'lucide-react';
import { Room3DViewer } from '../components/room3d/Room3DViewer';
import { TileSelector } from '../components/room3d/TileSelector';
import { INITIAL_TILE_PRODUCTS } from '../data/tileProducts';
import { DEFAULT_LIVING_ROOM_LAYOUT } from '../data/furnitureCatalog';
import type { TileProduct, TileLayoutOptions } from '../types/tile';
import type { RoomType, FurnitureModelDef, PlacedFurnitureItem, RoomDesignConfig } from '../types/furniture';
import type { RoomScene } from '../components/room3d/RoomScene';
import { fetchRealCatalogTiles } from '../services/catalogService';
import { addToCart } from '../utils/cart';

const STORAGE_KEY = 'furnimatch_3d_room_design';

const SpacePlanner = () => {
  const roomSceneRef = useRef<RoomScene | null>(null);

  const [tiles, setTiles] = useState<TileProduct[]>(INITIAL_TILE_PRODUCTS);
  const [selectedTile, setSelectedTile] = useState<TileProduct>(INITIAL_TILE_PRODUCTS[0]);
  const [isLoadingTiles, setIsLoadingTiles] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [layoutOptions, setLayoutOptions] = useState<TileLayoutOptions>({
    pattern: 'grid',
    direction: 'horizontal',
    orientation: 0,
    groutColor: '#cfcfcf',
    groutWidthMm: 2.0,
    finishEnhancement: 'normal',
  });

  // Furniture & Room Type State
  const [roomType, setRoomType] = useState<RoomType>('living_room');
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedFurnitureId, setSelectedFurnitureId] = useState<string | null>(null);
  const [placedItems, setPlacedItems] = useState<PlacedFurnitureItem[]>(DEFAULT_LIVING_ROOM_LAYOUT);
  const [isSaved, setIsSaved] = useState(false);
  const [cartToast, setCartToast] = useState<string | null>(null);

  // Fetch real tile products from backend API
  const loadCatalog = useCallback(async () => {
    setIsLoadingTiles(true);
    setLoadError(null);
    try {
      const res = await fetchRealCatalogTiles();
      if (res.tiles.length > 0) {
        setTiles(res.tiles);
        // Find if user previously had a saved tile in localStorage
        const savedStr = localStorage.getItem(STORAGE_KEY);
        let restoredTile: TileProduct | undefined;
        if (savedStr) {
          try {
            const saved: RoomDesignConfig = JSON.parse(savedStr);
            if (saved.selectedTileId) {
              restoredTile = res.tiles.find((t) => t.id === saved.selectedTileId);
            }
          } catch {
            // Ignore parse errors
          }
        }

        // If restored tile found, use it; otherwise pick first tile with 3D texture ready, or first tile
        const nextTile = restoredTile || res.tiles.find((t) => t.has3DTexture) || res.tiles[0];
        setSelectedTile(nextTile);
      } else {
        // Fallback to initial tiles if backend category has no items
        setTiles(INITIAL_TILE_PRODUCTS);
      }
    } catch (err: any) {
      console.warn('Could not fetch live tile products from backend:', err);
      setLoadError('Không thể kết nối đến máy chủ để tải danh mục sản phẩm thời gian thực. Đang dùng danh mục đệm.');
      setTiles(INITIAL_TILE_PRODUCTS);
    } finally {
      setIsLoadingTiles(false);
    }
  }, []);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  // Restore saved design (room type, layout, furniture) from localStorage
  useEffect(() => {
    try {
      const savedStr = localStorage.getItem(STORAGE_KEY);
      if (savedStr) {
        const saved: RoomDesignConfig = JSON.parse(savedStr);
        if (saved.roomType) setRoomType(saved.roomType);
        if (saved.layoutOptions) setLayoutOptions(saved.layoutOptions);
        if (saved.furnitureItems && Array.isArray(saved.furnitureItems)) {
          setPlacedItems(saved.furnitureItems);
        }
      }
    } catch (e) {
      console.warn('Could not restore design from localStorage', e);
    }
  }, []);

  const handleSelectTile = (tile: TileProduct) => {
    setSelectedTile(tile);
    setLayoutOptions((prev) => ({
      ...prev,
      groutColor: tile.groutColor || prev.groutColor,
      pattern: tile.defaultPattern || prev.pattern,
    }));
  };

  const handleSelectVariant = (variant: any) => {
    setSelectedTile((prev) => {
      const w = variant.width || prev.width;
      const h = variant.length || prev.height;
      return {
        ...prev,
        width: w,
        height: h,
        widthCm: w,
        heightCm: h,
        sizeLabel: variant.sizeName || `${w} × ${h} cm`,
        price: variant.price || prev.price,
        selectedVariant: variant,
      };
    });
  };

  const handleRoomTypeChange = (newType: RoomType) => {
    setRoomType(newType);
    setSelectedFurnitureId(null);
    if (roomSceneRef.current) {
      roomSceneRef.current.setRoomType(newType);
    }
  };

  const handleAddFurniture = (modelDef: FurnitureModelDef) => {
    setIsEditMode(true); // Switch to edit mode automatically
    if (roomSceneRef.current) {
      const newId = roomSceneRef.current.addFurniture(modelDef);
      setSelectedFurnitureId(newId);
    }
  };

  const handleSelectInstance = (instanceId: string | null) => {
    setSelectedFurnitureId(instanceId);
    if (roomSceneRef.current) {
      roomSceneRef.current.selectFurniture(instanceId);
    }
  };

  const handleRotateInstance = () => {
    if (roomSceneRef.current) {
      roomSceneRef.current.rotateSelectedFurniture(Math.PI / 4); // 45 degrees
    }
  };

  const handleDuplicateInstance = () => {
    if (roomSceneRef.current) {
      const newId = roomSceneRef.current.duplicateSelectedFurniture();
      if (newId) setSelectedFurnitureId(newId);
    }
  };

  const handleDeleteInstance = (instanceId: string) => {
    if (roomSceneRef.current) {
      roomSceneRef.current.removeFurniture(instanceId);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedFurnitureId && roomSceneRef.current) {
      roomSceneRef.current.removeFurniture(selectedFurnitureId);
      setSelectedFurnitureId(null);
    }
  };

  const handleResetLayout = () => {
    setSelectedFurnitureId(null);
    if (roomSceneRef.current) {
      roomSceneRef.current.resetFurnitureLayout(roomType);
    }
  };

  const handleSaveDesign = () => {
    try {
      const config: RoomDesignConfig = {
        roomType,
        selectedTileId: selectedTile.id,
        layoutOptions,
        furnitureItems: placedItems,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (e) {
      console.error('Failed to save design:', e);
    }
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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      {/* Toast Notification */}
      {cartToast && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-700 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-semibold animate-bounce">
          <ShoppingCart size={18} />
          <span>{cartToast}</span>
          <Link to="/cart" className="ml-2 underline font-bold text-emerald-200 hover:text-white">
            Xem giỏ
          </Link>
        </div>
      )}

      {/* Hero Header */}
      <section className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white pt-10 pb-16 px-4 sm:px-6 lg:px-8 border-b border-emerald-500/30 relative overflow-hidden shadow-md">
        {/* Subtle architectural 3D grid background pattern */}
        <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none text-white" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="space-planner-grid" width="36" height="36" patternUnits="userSpaceOnUse">
              <path d="M 36 0 L 0 0 0 36" fill="none" stroke="currentColor" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#space-planner-grid)" />
        </svg>

        {/* Ambient decorative glowing orbs */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-emerald-400/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-teal-300/20 blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-emerald-100 mb-3 font-medium">
            <Link to="/" className="hover:text-white flex items-center gap-1 transition">
              <Home size={13} /> Trang chủ
            </Link>
            <span>/</span>
            <span className="text-white font-semibold">Phòng mẫu 3D Visualizer & Nội thất</span>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 text-emerald-100 border border-white/25 backdrop-blur-sm text-xs font-bold uppercase tracking-wider mb-4 shadow-sm">
                <Sparkles size={13} className="text-amber-300 animate-pulse" />
                <span>3D Room Visualizer & Customizer</span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
                Trải nghiệm gạch & nội thất trong không gian thực
              </h1>
              <p className="mt-3 text-emerald-50/90 text-sm sm:text-base leading-relaxed max-w-2xl font-normal">
                Tự do thay đổi mẫu gạch lát nền từ danh mục sản phẩm thực tế, di chuyển xoay đồ nội thất (giường, tủ, sofa, bàn) và quan sát phản chiếu ánh sáng 360° trước khi đặt mua.
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Link
                  to="/custom-room-designer"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white hover:bg-emerald-50 text-emerald-800 font-bold text-xs sm:text-sm shadow-xl shadow-black/10 transition transform hover:-translate-y-0.5"
                >
                  <Camera size={16} className="text-emerald-700" />
                  <span>Tải ảnh căn phòng thực tế của bạn ➔ Tái tạo 3D</span>
                </Link>
              </div>
            </div>

            {/* Quick stats / highlights */}
            <div className="flex items-center gap-3 sm:gap-6 bg-emerald-950/40 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-white/20 shadow-xl shrink-0">
              <div className="text-center px-2">
                <p className="text-xl sm:text-2xl font-black text-white">1:1</p>
                <p className="text-[11px] text-emerald-100/80 font-medium">Tỷ lệ thực tế</p>
              </div>
              <div className="h-8 w-[1px] bg-white/20" />
              <div className="text-center px-2">
                <p className="text-xl sm:text-2xl font-black text-white">360°</p>
                <p className="text-[11px] text-emerald-100/80 font-medium">Góc quan sát</p>
              </div>
              <div className="h-8 w-[1px] bg-white/20" />
              <div className="text-center px-2">
                <p className="text-xl sm:text-2xl font-black text-white">{tiles.length}</p>
                <p className="text-[11px] text-emerald-100/80 font-medium">Mẫu gạch DB</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main 3D Studio & Tile / Furniture Selector Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8">
        {loadError && (
          <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-900 text-xs flex items-center justify-between gap-2">
            <span>{loadError}</span>
            <button
              onClick={loadCatalog}
              className="px-2.5 py-1 bg-amber-600 text-white rounded-lg font-bold hover:bg-amber-700 transition"
            >
              Thử lại
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* 3D Room Viewer (Left on desktop: 7-8 columns) */}
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-4">
            <Room3DViewer
              selectedTile={selectedTile}
              options={layoutOptions}
              roomType={roomType}
              isEditMode={isEditMode}
              onToggleEditMode={setIsEditMode}
              selectedFurnitureId={selectedFurnitureId}
              onRotateFurniture={handleRotateInstance}
              onDuplicateFurniture={handleDuplicateInstance}
              onDeleteFurniture={handleDeleteSelected}
              onDeselectFurniture={() => handleSelectInstance(null)}
              onSceneReady={(scene) => {
                roomSceneRef.current = scene;
              }}
              onSelectionChange={(id) => setSelectedFurnitureId(id)}
              onFurnitureChange={(items) => setPlacedItems(items)}
              className="w-full shadow-2xl"
            />

            {/* Guidance bar below 3D canvas */}
            <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span>
                  <strong>Hướng dẫn:</strong> Bật <strong>"Chỉnh nội thất"</strong> để nhấp chuột và kéo thả giường, tủ, sofa trên sàn phòng. Bật <strong>"Xem 360°"</strong> để tự do xoay góc nhìn.
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  to="/products"
                  className="inline-flex items-center gap-1 font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
                >
                  <span>Xem tất cả sản phẩm</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>

          {/* Tile & Furniture Customizer Panel (Right on desktop: 4-5 columns) */}
          <div className="lg:col-span-5 xl:col-span-4 h-full">
            <TileSelector
              tiles={tiles}
              selectedTile={selectedTile}
              onSelectTile={handleSelectTile}
              options={layoutOptions}
              onOptionsChange={setLayoutOptions}
              roomType={roomType}
              onRoomTypeChange={handleRoomTypeChange}
              onAddFurniture={handleAddFurniture}
              placedItems={placedItems}
              selectedInstanceId={selectedFurnitureId}
              onSelectInstance={handleSelectInstance}
              onRotateInstance={handleRotateInstance}
              onDuplicateInstance={handleDuplicateInstance}
              onDeleteInstance={handleDeleteInstance}
              onResetLayout={handleResetLayout}
              onSaveDesign={handleSaveDesign}
              isSaved={isSaved}
              isLoading={isLoadingTiles}
              onRefreshCatalog={loadCatalog}
              onSelectVariant={handleSelectVariant}
            />
          </div>
        </div>
      </section>

      {/* Selected Tile Showcase & Purchasing Benefits */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        <div className="rounded-3xl bg-white border border-gray-200/80 shadow-md p-6 sm:p-8">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">
                  <span>Mẫu gạch đang xem thử</span>
                </div>
                {selectedTile.has3DTexture ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                    ✓ Hỗ trợ 3D Preview
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-semibold">
                    Chưa có texture 3D
                  </span>
                )}
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
                {selectedTile.name}
              </h2>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                {selectedTile.description}
              </p>

              {/* Notice if tile lacks 3D texture */}
              {!selectedTile.has3DTexture && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start gap-2.5">
                  <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Thông báo xem trước 3D:</strong> {selectedTile.textureNote || 'Mẫu gạch này chưa có dữ liệu texture 3D bề mặt phẳng từ nhà sản xuất. Bạn vẫn có thể xem thông số kỹ thuật, hình ảnh thực tế và đặt mua trực tiếp.'}
                  </div>
                </div>
              )}

              {/* Specs table */}
              <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-gray-50 rounded-xl">
                  <span className="text-gray-400 block font-medium">Mã sản phẩm</span>
                  <span className="font-mono font-bold text-gray-800 text-sm mt-0.5 block">{selectedTile.sku}</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <span className="text-gray-400 block font-medium">Kích thước</span>
                  <span className="font-bold text-gray-800 text-sm mt-0.5 block">{selectedTile.sizeLabel}</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <span className="text-gray-400 block font-medium">Bề mặt</span>
                  <span className="font-bold text-gray-800 text-sm mt-0.5 block truncate">{selectedTile.finishLabel}</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <span className="text-gray-400 block font-medium">Độ dày viên</span>
                  <span className="font-bold text-gray-800 text-sm mt-0.5 block">{selectedTile.thicknessMm} mm</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <span className="text-gray-400 block font-medium">Đơn giá</span>
                  <span className="font-bold text-emerald-700 text-sm mt-0.5 block">{formatPrice(selectedTile.price)}/{selectedTile.unit}</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <span className="text-gray-400 block font-medium">Xuất xứ / Shop</span>
                  <span className="font-bold text-gray-800 text-xs mt-0.5 block truncate" title={selectedTile.origin}>
                    {selectedTile.origin}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex flex-wrap gap-3">
                {selectedTile.productId && (
                  <Link
                    to={`/products/${selectedTile.productId}`}
                    className="px-6 py-3.5 rounded-xl bg-gray-900 hover:bg-black text-white font-bold text-sm shadow-md transition flex items-center gap-2"
                  >
                    <ExternalLink size={17} />
                    <span>Xem chi tiết sản phẩm</span>
                  </Link>
                )}

                <button
                  type="button"
                  onClick={() => handleAddToCart(selectedTile, 1)}
                  className="px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 transition flex items-center gap-2 cursor-pointer"
                >
                  <ShoppingCart size={17} />
                  <span>Thêm vào giỏ hàng</span>
                </button>

                <Link
                  to="/request-quotation"
                  className="px-6 py-3.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-sm transition flex items-center gap-2"
                >
                  <MessageCircle size={17} />
                  <span>Yêu cầu báo giá</span>
                </Link>
              </div>
            </div>

            {/* Commitments & Services Grid */}
            <div className="bg-slate-50 p-6 rounded-2xl border border-gray-100">
              <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                <Award size={18} className="text-emerald-600" />
                Dịch vụ đặc quyền tại FurniMatch
              </h3>
              <div className="space-y-4 text-xs">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                    <Truck size={16} />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">Giao hàng tận chân công trình</h4>
                    <p className="text-gray-500 mt-0.5">Xe tải chuyên dụng vận chuyển đảm bảo gạch không sứt mẻ góc, đúng tiến độ thi công.</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center shrink-0">
                    <Scissors size={16} />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">Hỗ trợ gia công cắt gạch vi tính</h4>
                    <p className="text-gray-500 mt-0.5">Cắt len chân tường, bo cạnh mũi bậc cầu thang, líp cạnh 45 độ theo yêu cầu bản vẽ.</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                    <RefreshCw size={16} />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">Đổi trả gạch nguyên hộp dư thừa</h4>
                    <p className="text-gray-500 mt-0.5">Thu hồi hoàn tiền các hộp gạch còn nguyên đai nguyên kiện sau khi hoàn thiện công trình.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SpacePlanner;
