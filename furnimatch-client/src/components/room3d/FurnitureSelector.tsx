import { useState } from 'react';
import {
  Plus,
  RotateCw,
  Copy,
  Trash2,
  RotateCcw,
  Save,
  Check,
  Armchair,
  Bed,
  Box,
  Sparkles,
} from 'lucide-react';
import type { FurnitureCategory, FurnitureModelDef, PlacedFurnitureItem, RoomType } from '../../types/furniture';
import { FURNITURE_CATALOG } from '../../data/furnitureCatalog';

interface FurnitureSelectorProps {
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
}

export const FurnitureSelector = ({
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
}: FurnitureSelectorProps) => {
  const [activeCategory, setActiveCategory] = useState<FurnitureCategory | 'all'>('all');

  const filteredCatalog = FURNITURE_CATALOG.filter((item) => {
    if (activeCategory === 'all') return true;
    return item.category === activeCategory;
  });

  return (
    <div className="space-y-6">
      {/* 1. Room Type Switcher */}
      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
          Không gian mẫu
        </span>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onRoomTypeChange('living_room')}
            className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
              roomType === 'living_room'
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
                : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300'
            }`}
          >
            <Armchair size={15} />
            <span>Phòng Khách</span>
          </button>

          <button
            type="button"
            onClick={() => onRoomTypeChange('bedroom')}
            className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
              roomType === 'bedroom'
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
                : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300'
            }`}
          >
            <Bed size={15} />
            <span>Phòng Ngủ</span>
          </button>
        </div>
      </div>

      {/* 2. Furniture Catalog Filters */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
            <Box size={14} className="text-emerald-600" />
            <span>Thêm nội thất vào phòng</span>
          </h4>
          <span className="text-[11px] text-gray-400">{filteredCatalog.length} mẫu</span>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-1.5 pb-2 border-b border-gray-100">
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'bed', label: 'Giường ngủ' },
            { id: 'wardrobe', label: 'Tủ các loại' },
            { id: 'sofa', label: 'Sofa & Bàn trà' },
            { id: 'desk', label: 'Bàn & Kệ' },
            { id: 'decor', label: 'Trang trí' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id as any)}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition cursor-pointer ${
                activeCategory === cat.id
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Catalog Items List */}
        <div className="mt-3 space-y-2.5 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
          {filteredCatalog.map((item) => (
            <div
              key={item.id}
              className="p-3 rounded-2xl border border-gray-200 hover:border-emerald-300 bg-white hover:bg-emerald-50/20 transition flex items-center justify-between gap-3 group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition-transform">
                  {item.thumbnailIcon}
                </div>
                <div className="min-w-0">
                  <h5 className="font-bold text-gray-900 text-xs truncate group-hover:text-emerald-700 transition">
                    {item.name}
                  </h5>
                  <p className="text-[11px] text-gray-500 font-medium mt-0.5">{item.sizeLabel}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onAddFurniture(item)}
                className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-600 text-emerald-800 hover:text-white text-xs font-bold transition flex items-center gap-1 shrink-0 cursor-pointer shadow-sm"
              >
                <Plus size={14} />
                <span>Thêm</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Placed Items in Room */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles size={14} className="text-emerald-600" />
            <span>Nội thất trong phòng ({placedItems.length})</span>
          </h4>
          <span className="text-[11px] text-gray-400">Nhấp để chọn & kéo</span>
        </div>

        {placedItems.length === 0 ? (
          <div className="p-6 text-center text-xs text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
            Chưa có nội thất nào trên sàn. Hãy nhấn "Thêm" từ danh mục ở trên.
          </div>
        ) : (
          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
            {placedItems.map((placed) => {
              const isSelected = selectedInstanceId === placed.instanceId;
              return (
                <div
                  key={placed.instanceId}
                  onClick={() => onSelectInstance(placed.instanceId)}
                  className={`p-2.5 rounded-xl border-2 transition cursor-pointer flex items-center justify-between gap-2 ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50/70 shadow-sm'
                      : 'border-gray-100 hover:border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-xs font-bold text-gray-800 truncate">{placed.name}</span>
                  </div>

                  {isSelected ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRotateInstance();
                        }}
                        title="Xoay 45°"
                        className="p-1 rounded-lg text-gray-600 hover:text-emerald-700 hover:bg-white transition"
                      >
                        <RotateCw size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDuplicateInstance();
                        }}
                        title="Sao chép"
                        className="p-1 rounded-lg text-gray-600 hover:text-emerald-700 hover:bg-white transition"
                      >
                        <Copy size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteInstance(placed.instanceId);
                        }}
                        title="Xóa món này"
                        className="p-1 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteInstance(placed.instanceId);
                      }}
                      title="Xóa món này"
                      className="p-1 rounded-lg text-gray-300 hover:text-red-500 transition"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Layout Actions */}
      <div className="pt-3 border-t border-gray-100 flex gap-2">
        <button
          type="button"
          onClick={onResetLayout}
          className="flex-1 py-2.5 px-3 rounded-xl border border-gray-200 hover:bg-gray-100 text-gray-700 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <RotateCcw size={14} />
          <span>Bố cục ban đầu</span>
        </button>

        <button
          type="button"
          onClick={onSaveDesign}
          className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-emerald-600/20"
        >
          {isSaved ? <Check size={14} /> : <Save size={14} />}
          <span>{isSaved ? 'Đã lưu thiết kế' : 'Lưu bố cục'}</span>
        </button>
      </div>
    </div>
  );
};
