import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Layers,
  Armchair,
  Sliders,
  Save,
  Check,
  RotateCw,
  Copy,
  Trash2,
  ExternalLink,
  ShoppingCart,
  Download,
  Search,
  Plus,
  Sparkles,
} from 'lucide-react';
import type { TileProduct, TileLayoutOptions, LayingPattern } from '../../types/tile';
import type { PlacedFurnitureItem, FurnitureModelDef } from '../../types/furniture';
import type { RoomCalibrationConfig, ReconstructedRoomDesign, DetectedOpening } from '../../types/roomReconstruction';
import { FURNITURE_CATALOG } from '../../data/furnitureCatalog';

interface RoomDesignToolbarProps {
  tiles: TileProduct[];
  selectedTile: TileProduct;
  onSelectTile: (tile: TileProduct) => void;
  options: TileLayoutOptions;
  onOptionsChange: (opts: TileLayoutOptions | ((prev: TileLayoutOptions) => TileLayoutOptions)) => void;
  calibration: RoomCalibrationConfig;
  onCalibrationChange: (calib: RoomCalibrationConfig) => void;
  placedItems: PlacedFurnitureItem[];
  selectedInstanceId: string | null;
  isSelectedDetected?: boolean;
  onSelectInstance: (id: string | null) => void;
  onAddFurniture: (model: FurnitureModelDef) => void;
  onRotateInstance: () => void;
  onDuplicateInstance: () => void;
  onDeleteInstance: (id: string) => void;
  onClearAllFurniture: () => void;
  onSaveDesign: () => void;
  isSaved: boolean;
  onExportScreenshot: () => void;
  onAddToCart: (tile: TileProduct, boxes: number) => void;
  savedDesigns?: ReconstructedRoomDesign[];
  onLoadSavedDesign?: (design: ReconstructedRoomDesign) => void;
  onDeleteSavedDesign?: (id: string) => void;
}

const GROUT_COLORS = [
  { name: 'Trắng sứ', hex: '#f8fafc' },
  { name: 'Xám bạc', hex: '#cfcfcf' },
  { name: 'Xám xi măng', hex: '#71717a' },
  { name: 'Vàng kem', hex: '#fef3c7' },
  { name: 'Nâu trầm', hex: '#573a27' },
];

export const RoomDesignToolbar = ({
  tiles,
  selectedTile,
  onSelectTile,
  options,
  onOptionsChange,
  calibration,
  onCalibrationChange,
  placedItems,
  selectedInstanceId,
  onSelectInstance,
  onAddFurniture,
  onRotateInstance,
  onDuplicateInstance,
  onDeleteInstance,
  onClearAllFurniture,
  onSaveDesign,
  isSaved,
  onExportScreenshot,
  onAddToCart,
  savedDesigns = [],
  onLoadSavedDesign,
  onDeleteSavedDesign,
}: RoomDesignToolbarProps) => {
  const [activeTab, setActiveTab] = useState<'tiles' | 'furniture' | 'room' | 'save'>('tiles');
  const [tileCategory, setTileCategory] = useState<string>('all');
  const [tileSearch, setTileSearch] = useState('');
  const [furnitureCategory, setFurnitureCategory] = useState<string>('all');

  // Filter tiles
  const filteredTiles = useMemo(() => {
    return tiles.filter((tile) => {
      const matchCat = tileCategory === 'all' || tile.category === tileCategory;
      const matchQuery =
        !tileSearch ||
        tile.name.toLowerCase().includes(tileSearch.toLowerCase()) ||
        tile.sku.toLowerCase().includes(tileSearch.toLowerCase());
      return matchCat && matchQuery;
    });
  }, [tiles, tileCategory, tileSearch]);

  // Filter furniture models
  const filteredFurniture = useMemo(() => {
    if (furnitureCategory === 'all') return FURNITURE_CATALOG;
    return FURNITURE_CATALOG.filter((f) => f.category === furnitureCategory);
  }, [furnitureCategory]);

  // Separate detected from photo items vs newly added items
  const detectedItems = useMemo(() => {
    return placedItems.filter(
      (item) => item.instanceId.startsWith('det_') || item.instanceId.startsWith('det-')
    );
  }, [placedItems]);

  const userAddedItems = useMemo(() => {
    return placedItems.filter(
      (item) => !item.instanceId.startsWith('det_') && !item.instanceId.startsWith('det-')
    );
  }, [placedItems]);

  const floorAreaM2 = Number(
    (calibration.dimensions.widthMeters * calibration.dimensions.lengthMeters).toFixed(1)
  );

  const boxArea = selectedTile.boxAreaM2 || 1.44;
  const recommendedBoxes = Math.ceil((floorAreaM2 * 1.1) / boxArea);
  const totalCost = recommendedBoxes * (selectedTile.price || 0) * boxArea;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  // Add a Window or Door dynamically
  const handleAddOpening = (type: 'window' | 'door') => {
    const newOpening: DetectedOpening = {
      id: `op_${type}_${Date.now()}`,
      type,
      wall: type === 'window' ? 'right' : 'left',
      positionOffsetRatio: 0,
      widthMeters: type === 'window' ? 2.4 : 1.0,
      heightMeters: type === 'window' ? 1.8 : 2.2,
      sillHeightMeters: type === 'window' ? 0.7 : 0,
      confidence: 100,
      bbox2D: { x: 50, y: 30, width: 20, height: 40 },
      label: type === 'window' ? 'Cửa sổ kính mới' : 'Cửa đi mới',
    };

    onCalibrationChange({
      ...calibration,
      openings: [...(calibration.openings || []), newOpening],
    });
  };

  const handleRemoveOpening = (id: string) => {
    onCalibrationChange({
      ...calibration,
      openings: (calibration.openings || []).filter((o) => o.id !== id),
    });
  };

  return (
    <div className="bg-white rounded-3xl border border-gray-200/90 shadow-xl overflow-hidden flex flex-col h-full max-h-[820px]">
      {/* NAVIGATION TABS HEADER */}
      <div className="flex items-center border-b border-gray-100 bg-slate-50/70 p-2 gap-1 shrink-0 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('tiles')}
          className={`flex-1 py-2.5 px-3 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === 'tiles'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <Layers size={15} />
          <span>Gạch lát sàn</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('furniture')}
          className={`flex-1 py-2.5 px-3 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === 'furniture'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <Armchair size={15} />
          <span>Nội thất 3D</span>
          {placedItems.length > 0 && (
            <span className="w-5 h-5 rounded-full bg-white/20 text-[10px] flex items-center justify-center">
              {placedItems.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('room')}
          className={`flex-1 py-2.5 px-3 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === 'room'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <Sliders size={15} />
          <span>Cấu trúc phòng</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('save')}
          className={`flex-1 py-2.5 px-3 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === 'save'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <Save size={15} />
          <span>Lưu &amp; Xuất</span>
        </button>
      </div>

      {/* TAB CONTENT BODY */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* ========================================================= */}
        {/* TAB 1: TILE CATALOG & LAYOUT OPTIONS */}
        {/* ========================================================= */}
        {activeTab === 'tiles' && (
          <div className="space-y-5 animate-fadeIn">
            {/* Search & Category Filter */}
            <div className="space-y-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm gạch theo tên hoặc mã SKU..."
                  value={tileSearch}
                  onChange={(e) => setTileSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                {[
                  { id: 'all', label: 'Tất cả' },
                  { id: 'marble', label: 'Marble' },
                  { id: 'wood', label: 'Gỗ' },
                  { id: 'stone', label: 'Đá' },
                  { id: 'concrete', label: 'Bê tông' },
                ].map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setTileCategory(c.id)}
                    className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer whitespace-nowrap ${
                      tileCategory === c.id
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tile List Grid */}
            <div className="grid grid-cols-2 gap-2.5 max-h-[260px] overflow-y-auto pr-1">
              {filteredTiles.map((tile) => {
                const isSelected = selectedTile.id === tile.id;
                return (
                  <div
                    key={tile.id}
                    onClick={() => onSelectTile(tile)}
                    className={`p-2 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50/50 shadow-md ring-2 ring-emerald-500/20'
                        : 'border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="relative rounded-xl overflow-hidden aspect-square bg-slate-100 mb-2">
                      <img
                        src={tile.textureUrl || tile.thumbnailUrl}
                        alt={tile.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-1 right-1 bg-slate-900/80 text-white text-[9px] font-mono font-bold px-1.5 py-0.5 rounded">
                        {tile.sku}
                      </div>
                      {tile.has3DTexture === false && (
                        <div className="absolute bottom-1 left-1 bg-amber-500 text-slate-950 font-bold text-[8px] px-1 py-0.5 rounded">
                          Chưa có 3D
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-gray-900 truncate" title={tile.name}>
                        {tile.name}
                      </h4>
                      <p className="text-[11px] text-gray-500">{tile.sizeLabel}</p>
                      <p className="text-xs font-black text-emerald-700 mt-1">
                        {formatPrice(tile.price)}/{tile.unit}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pattern & Tiling Options */}
            <div className="space-y-3 pt-3 border-t border-gray-100">
              <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                Kiểu lát &amp; Đường ron gạch
              </h4>

              {/* Laying Pattern */}
              <div className="space-y-1">
                <span className="text-[11px] text-gray-500 block">Kiểu xếp gạch:</span>
                <div className="grid grid-cols-3 gap-1.5 text-xs">
                  {[
                    { id: 'grid', label: 'Lát thẳng' },
                    { id: 'staggered_50', label: 'So le 50%' },
                    { id: 'staggered_33', label: 'So le 33%' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() =>
                        onOptionsChange((prev) => ({ ...prev, pattern: p.id as LayingPattern }))
                      }
                      className={`py-1.5 px-2 rounded-xl border text-center font-bold transition cursor-pointer text-xs ${
                        options.pattern === p.id
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                          : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grout Width Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Độ rộng đường ron:</span>
                  <span className="font-bold text-emerald-700">{options.groutWidthMm} mm</span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="4.0"
                  step="0.5"
                  value={options.groutWidthMm}
                  onChange={(e) =>
                    onOptionsChange((prev) => ({ ...prev, groutWidthMm: parseFloat(e.target.value) }))
                  }
                  className="w-full accent-emerald-600 cursor-pointer"
                />
              </div>

              {/* Grout Colors */}
              <div className="space-y-1">
                <span className="text-[11px] text-gray-500 block">Màu đường ron:</span>
                <div className="flex items-center gap-2">
                  {GROUT_COLORS.map((g) => (
                    <button
                      key={g.hex}
                      type="button"
                      onClick={() => onOptionsChange((prev) => ({ ...prev, groutColor: g.hex }))}
                      title={g.name}
                      className={`w-7 h-7 rounded-xl border transition cursor-pointer ${
                        options.groutColor.toLowerCase() === g.hex.toLowerCase()
                          ? 'ring-2 ring-emerald-500 scale-105'
                          : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: g.hex }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Add to Cart CTA */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Dự toán sàn ({floorAreaM2} m²):</span>
                <span className="font-bold text-gray-900">{recommendedBoxes} hộp</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Ước tính chi phí:</span>
                <span className="font-bold text-emerald-700 text-sm">{formatPrice(totalCost)}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                {selectedTile.productId && (
                  <Link
                    to={`/products/${selectedTile.productId}`}
                    target="_blank"
                    className="py-2.5 rounded-xl border border-gray-300 hover:bg-gray-100 text-gray-800 text-xs font-bold transition flex items-center justify-center gap-1.5"
                  >
                    <ExternalLink size={13} />
                    <span>Xem SP</span>
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => onAddToCart(selectedTile, recommendedBoxes)}
                  className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ShoppingCart size={13} />
                  <span>Thêm giỏ</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: 3D FURNITURE (DETECTED VS USER ADDED) */}
        {/* ========================================================= */}
        {activeTab === 'furniture' && (
          <div className="space-y-5 animate-fadeIn">
            {/* Category Filter */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              {[
                { id: 'all', label: 'Tất cả' },
                { id: 'bed', label: 'Giường ngủ' },
                { id: 'wardrobe', label: 'Tủ các loại' },
                { id: 'sofa', label: 'Sofa & Bàn' },
                { id: 'desk', label: 'Bàn & Kệ' },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setFurnitureCategory(c.id)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer whitespace-nowrap ${
                    furnitureCategory === c.id
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* SECTION 1: DETECTED FURNITURE FROM PHOTO */}
            {detectedItems.length > 0 && (
              <div className="space-y-2 p-3 bg-cyan-50/50 rounded-2xl border border-cyan-200/80">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-cyan-950 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-cyan-600" />
                    <span>Đồ nội thất nhận diện từ ảnh ({detectedItems.length})</span>
                  </h4>
                  <span className="text-[10px] bg-cyan-100 text-cyan-800 px-1.5 py-0.5 rounded font-bold">
                    Khôi phục từ ảnh
                  </span>
                </div>

                <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                  {detectedItems.map((item) => {
                    const isSelected = selectedInstanceId === item.instanceId;
                    return (
                      <div
                        key={item.instanceId}
                        onClick={() => onSelectInstance(item.instanceId)}
                        className={`p-2 rounded-xl border text-xs flex items-center justify-between gap-2 transition cursor-pointer ${
                          isSelected
                            ? 'border-cyan-500 bg-cyan-100/70 text-cyan-950 font-bold'
                            : 'border-cyan-200/60 bg-white hover:bg-cyan-50/50 text-gray-800'
                        }`}
                      >
                        <span className="truncate">{item.name}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectInstance(item.instanceId);
                              onRotateInstance();
                            }}
                            title="Xoay 45°"
                            className="p-1 hover:bg-white rounded text-gray-600"
                          >
                            <RotateCw size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteInstance(item.instanceId);
                            }}
                            title="Xóa"
                            className="p-1 hover:bg-red-50 rounded text-red-500"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SECTION 2: ADD NEW FURNITURE MODELS FROM CATALOG */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center justify-between">
                <span>Thêm đồ nội thất mới từ danh mục</span>
                <span className="text-[11px] text-gray-500 font-normal">Mô hình 3D chuẩn</span>
              </h4>

              <div className="grid grid-cols-1 gap-2 max-h-[220px] overflow-y-auto pr-1">
                {filteredFurniture.map((model) => (
                  <div
                    key={model.id}
                    className="p-2.5 rounded-2xl border border-gray-200 hover:border-emerald-500 bg-white hover:bg-emerald-50/20 transition flex items-center justify-between gap-3 shadow-sm"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className="text-2xl shrink-0">{model.thumbnailIcon}</span>
                      <div className="truncate">
                        <h5 className="text-xs font-bold text-gray-900 truncate">{model.name}</h5>
                        <p className="text-[10px] text-gray-400">{model.sizeLabel}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onAddFurniture(model)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Plus size={13} />
                      <span>Thêm</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* SECTION 3: USER-ADDED ITEMS */}
            {userAddedItems.length > 0 && (
              <div className="pt-2 border-t border-gray-100 space-y-1.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-800">
                    Đồ nội thất bạn đã thêm ({userAddedItems.length})
                  </h4>
                  <button
                    type="button"
                    onClick={onClearAllFurniture}
                    className="text-[10px] text-red-600 hover:underline font-bold cursor-pointer"
                  >
                    Xóa tất cả
                  </button>
                </div>

                <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                  {userAddedItems.map((item) => {
                    const isSelected = selectedInstanceId === item.instanceId;
                    return (
                      <div
                        key={item.instanceId}
                        onClick={() => onSelectInstance(item.instanceId)}
                        className={`p-2 rounded-xl border text-xs flex items-center justify-between gap-2 transition cursor-pointer ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-950 font-bold'
                            : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        <span className="truncate">{item.name}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectInstance(item.instanceId);
                              onRotateInstance();
                            }}
                            title="Xoay 45°"
                            className="p-1 hover:bg-white rounded text-gray-500"
                          >
                            <RotateCw size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectInstance(item.instanceId);
                              onDuplicateInstance();
                            }}
                            title="Nhân bản"
                            className="p-1 hover:bg-white rounded text-gray-500"
                          >
                            <Copy size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteInstance(item.instanceId);
                            }}
                            title="Xóa"
                            className="p-1 hover:bg-red-50 rounded text-red-500"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: ROOM STRUCTURE, DIMENSIONS, CEILING & OPENINGS */}
        {/* ========================================================= */}
        {activeTab === 'room' && (
          <div className="space-y-5 animate-fadeIn">
            {/* Dimensions Sliders */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                Kích thước phòng thực tế (3D Metric)
              </h4>

              {/* Width */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-gray-700">Chiều rộng:</span>
                  <span className="font-bold text-emerald-700 text-sm">
                    {calibration.dimensions.widthMeters} m
                  </span>
                </div>
                <input
                  type="range"
                  min="3.0"
                  max="10.0"
                  step="0.1"
                  value={calibration.dimensions.widthMeters}
                  onChange={(e) =>
                    onCalibrationChange({
                      ...calibration,
                      dimensions: {
                        ...calibration.dimensions,
                        widthMeters: parseFloat(e.target.value),
                      },
                    })
                  }
                  className="w-full accent-emerald-600 cursor-pointer"
                />
              </div>

              {/* Length */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-gray-700">Chiều dài:</span>
                  <span className="font-bold text-emerald-700 text-sm">
                    {calibration.dimensions.lengthMeters} m
                  </span>
                </div>
                <input
                  type="range"
                  min="3.0"
                  max="10.0"
                  step="0.1"
                  value={calibration.dimensions.lengthMeters}
                  onChange={(e) =>
                    onCalibrationChange({
                      ...calibration,
                      dimensions: {
                        ...calibration.dimensions,
                        lengthMeters: parseFloat(e.target.value),
                      },
                    })
                  }
                  className="w-full accent-emerald-600 cursor-pointer"
                />
              </div>

              {/* Ceiling Height */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-gray-700">Chiều cao trần:</span>
                  <span className="font-bold text-emerald-700 text-sm">
                    {calibration.dimensions.heightMeters} m
                  </span>
                </div>
                <input
                  type="range"
                  min="2.4"
                  max="4.5"
                  step="0.1"
                  value={calibration.dimensions.heightMeters}
                  onChange={(e) =>
                    onCalibrationChange({
                      ...calibration,
                      dimensions: {
                        ...calibration.dimensions,
                        heightMeters: parseFloat(e.target.value),
                      },
                    })
                  }
                  className="w-full accent-emerald-600 cursor-pointer"
                />
              </div>
            </div>

            {/* Ceiling Toggle */}
            <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
              <div>
                <h5 className="text-xs font-bold text-gray-800">Trần nhà 3D (Ceiling)</h5>
                <p className="text-[10px] text-gray-400">Ẩn trần khi quan sát từ góc cao</p>
              </div>
              <button
                type="button"
                onClick={() =>
                  onCalibrationChange({
                    ...calibration,
                    ceiling: {
                      ...calibration.ceiling,
                      enabled: !calibration.ceiling?.enabled,
                    },
                  })
                }
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  calibration.ceiling?.enabled
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {calibration.ceiling?.enabled ? '✓ Đang bật trần' : 'Đang ẩn trần'}
              </button>
            </div>

            {/* Windows & Doors Management */}
            <div className="pt-3 border-t border-gray-100 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                  Cửa sổ &amp; Cửa ra vào ({calibration.openings?.length || 0})
                </h4>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleAddOpening('window')}
                    className="px-2 py-1 rounded bg-sky-100 text-sky-800 text-[10px] font-bold hover:bg-sky-200 cursor-pointer"
                  >
                    + Cửa sổ
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddOpening('door')}
                    className="px-2 py-1 rounded bg-amber-100 text-amber-800 text-[10px] font-bold hover:bg-amber-200 cursor-pointer"
                  >
                    + Cửa đi
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                {(calibration.openings || []).map((op) => (
                  <div
                    key={op.id}
                    className="p-2 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span>{op.type === 'window' ? '🪟' : '🚪'}</span>
                      <span className="font-bold text-gray-800">{op.label}</span>
                      <span className="text-[10px] text-gray-400">
                        (Tường {op.wall === 'right' ? 'phải' : op.wall === 'left' ? 'trái' : 'sau'})
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveOpening(op.id)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                      title="Xóa"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Wall Paint Color */}
            <div className="pt-3 border-t border-gray-100 space-y-2">
              <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                Màu sơn các mặt tường
              </h4>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={calibration.wallColor}
                  onChange={(e) =>
                    onCalibrationChange({
                      ...calibration,
                      wallColor: e.target.value,
                    })
                  }
                  className="w-10 h-10 rounded-xl border border-gray-300 p-0.5 cursor-pointer shrink-0"
                />
                <span className="text-xs font-mono font-bold text-gray-800">
                  {calibration.wallColor.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: SAVE, EXPORT & HISTORY */}
        {/* ========================================================= */}
        {activeTab === 'save' && (
          <div className="space-y-5 animate-fadeIn">
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3">
              <div>
                <h4 className="font-bold text-emerald-950 text-sm">Lưu thiết kế phòng 3D hoàn chỉnh</h4>
                <p className="text-xs text-emerald-800 mt-0.5">
                  Lưu lại toàn bộ căn phòng: sàn gạch, các bức tường, trần, cửa sổ và vị trí đồ nội thất.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onSaveDesign}
                  className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isSaved ? <Check size={16} /> : <Save size={16} />}
                  <span>{isSaved ? 'Đã lưu thành công!' : 'Lưu thiết kế này'}</span>
                </button>

                <button
                  type="button"
                  onClick={onExportScreenshot}
                  title="Chụp ảnh phòng 3D tải về"
                  className="py-3 px-3.5 rounded-xl border border-emerald-300 bg-white hover:bg-emerald-50 text-emerald-800 text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Download size={16} />
                  <span>Xuất ảnh 3D</span>
                </button>
              </div>
            </div>

            {/* Saved Designs List */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                Các bản thiết kế đã lưu ({savedDesigns.length})
              </h4>

              {savedDesigns.length === 0 ? (
                <div className="p-4 rounded-2xl bg-gray-50 text-center text-xs text-gray-400">
                  Chưa có bản thiết kế nào được lưu trước đó.
                </div>
              ) : (
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {savedDesigns.map((d) => (
                    <div
                      key={d.id}
                      className="p-3 rounded-2xl border border-gray-200 hover:border-emerald-500 bg-white transition flex items-center justify-between gap-3 shadow-sm"
                    >
                      <div className="truncate">
                        <h5 className="font-bold text-xs text-gray-900 truncate">{d.name}</h5>
                        <p className="text-[10px] text-gray-400">
                          {new Date(d.createdAt).toLocaleDateString('vi-VN')} •{' '}
                          {d.calibration.dimensions.widthMeters}m ×{' '}
                          {d.calibration.dimensions.lengthMeters}m
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {onLoadSavedDesign && (
                          <button
                            type="button"
                            onClick={() => onLoadSavedDesign(d)}
                            className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-lg hover:bg-emerald-200 transition"
                          >
                            Mở
                          </button>
                        )}
                        {onDeleteSavedDesign && (
                          <button
                            type="button"
                            onClick={() => onDeleteSavedDesign(d.id)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
