import { useEffect, useRef, useState } from 'react';
import {
  RotateCcw,
  Maximize2,
  Minimize2,
  Sun,
  Moon,
  Eye,
  Layers,
  Move,
  RotateCw,
  Copy,
  Trash2,
  X,
} from 'lucide-react';
import { RoomScene } from './RoomScene';
import type { TileProduct, TileLayoutOptions } from '../../types/tile';
import type { RoomType, PlacedFurnitureItem } from '../../types/furniture';
import { CAMERA_PRESETS } from '../../data/tileProducts';

interface Room3DViewerProps {
  selectedTile: TileProduct;
  options: TileLayoutOptions;
  roomType: RoomType;
  isEditMode: boolean;
  onToggleEditMode: (isEdit: boolean) => void;
  selectedFurnitureId: string | null;
  onRotateFurniture: () => void;
  onDuplicateFurniture: () => void;
  onDeleteFurniture: () => void;
  onDeselectFurniture: () => void;
  onSceneReady?: (scene: RoomScene) => void;
  onSelectionChange?: (instanceId: string | null) => void;
  onFurnitureChange?: (items: PlacedFurnitureItem[]) => void;
  className?: string;
}

export const Room3DViewer = ({
  selectedTile,
  options,
  roomType,
  isEditMode,
  onToggleEditMode,
  selectedFurnitureId,
  onRotateFurniture,
  onDuplicateFurniture,
  onDeleteFurniture,
  onDeselectFurniture,
  onSceneReady,
  onSelectionChange,
  onFurnitureChange,
  className = '',
}: Room3DViewerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const roomSceneRef = useRef<RoomScene | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDayLight, setIsDayLight] = useState(true);
  const [activePreset, setActivePreset] = useState<string>('default');

  // Initialize RoomScene
  useEffect(() => {
    if (!containerRef.current) return;

    try {
      setIsLoading(true);
      setError(null);

      if (roomSceneRef.current) {
        roomSceneRef.current.dispose();
      }

      const sceneInstance = new RoomScene(containerRef.current, selectedTile, options, roomType);
      roomSceneRef.current = sceneInstance;

      sceneInstance.onSelectionChange = (id) => {
        if (onSelectionChange) onSelectionChange(id);
      };

      sceneInstance.onFurnitureChange = (items) => {
        if (onFurnitureChange) onFurnitureChange(items);
      };

      if (onSceneReady) {
        onSceneReady(sceneInstance);
      }

      setIsLoading(false);
    } catch (err: any) {
      console.error('Failed to initialize 3D Room Viewer:', err);
      setError('Không thể khởi tạo cảnh 3D WebGL. Vui lòng kiểm tra hỗ trợ đồ họa trên trình duyệt.');
      setIsLoading(false);
    }

    return () => {
      if (roomSceneRef.current) {
        roomSceneRef.current.dispose();
        roomSceneRef.current = null;
      }
    };
  }, []);

  // Sync room type when prop changes
  useEffect(() => {
    if (roomSceneRef.current) {
      roomSceneRef.current.setRoomType(roomType);
    }
  }, [roomType]);

  // Sync edit mode when prop changes
  useEffect(() => {
    if (roomSceneRef.current) {
      roomSceneRef.current.setEditMode(isEditMode);
    }
  }, [isEditMode]);

  // Update floor tile texture whenever tile or options change
  useEffect(() => {
    if (roomSceneRef.current) {
      roomSceneRef.current.updateTile(selectedTile, options);
    }
  }, [selectedTile, options]);

  // Handle Fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current?.parentElement) return;

    const wrapper = containerRef.current.parentElement;
    if (!document.fullscreenElement) {
      wrapper.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const handleResetCamera = () => {
    if (roomSceneRef.current) {
      roomSceneRef.current.resetCamera();
      setActivePreset('default');
    }
  };

  const handleSelectPreset = (preset: typeof CAMERA_PRESETS[0]) => {
    if (roomSceneRef.current) {
      roomSceneRef.current.setCameraView(preset.position, preset.target);
      setActivePreset(preset.id);
    }
  };

  const handleToggleLighting = () => {
    if (roomSceneRef.current) {
      const isDay = roomSceneRef.current.toggleLightingMode();
      setIsDayLight(isDay);
    }
  };

  return (
    <div className={`relative rounded-3xl overflow-hidden bg-slate-900 border border-slate-700/50 shadow-2xl ${className}`}>
      {/* 3D WebGL Canvas Container */}
      <div
        ref={containerRef}
        className={`w-full h-full min-h-[460px] sm:min-h-[520px] lg:min-h-[620px] touch-none select-none ${
          isEditMode ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
        }`}
      />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-md text-white">
          <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mb-4" />
          <p className="text-sm font-semibold tracking-wide">Đang khởi tạo không gian 3D...</p>
          <p className="text-xs text-slate-400 mt-1">Đang thiết lập ánh sáng, vật liệu gạch PBR và nội thất</p>
        </div>
      )}

      {/* Error Fallback */}
      {error && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-900/90 p-6 text-center text-white">
          <div className="p-3 bg-red-500/20 text-red-400 rounded-2xl mb-3">⚠️</div>
          <h3 className="font-bold text-lg">Lỗi tải không gian 3D</h3>
          <p className="text-sm text-slate-300 mt-2 max-w-md">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold transition"
          >
            Tải lại trang
          </button>
        </div>
      )}

      {/* TOP OVERLAY: Active Tile Badge & Top Toolbar */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-10 gap-2">
        {/* Active Tile Pill */}
        <div className="pointer-events-auto flex items-center gap-2.5 bg-slate-900/85 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/10 shadow-lg text-white">
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold truncate max-w-[130px] sm:max-w-[200px]">{selectedTile.name}</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono px-1.5 py-0.5 rounded">
                {selectedTile.sku}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {selectedTile.sizeLabel} • {roomType === 'bedroom' ? 'Phòng Ngủ' : 'Phòng Khách'}
            </p>
          </div>
        </div>

        {/* Notice when product lacks 3D texture */}
        {selectedTile.has3DTexture === false && (
          <div className="pointer-events-auto hidden md:flex items-center gap-2 bg-amber-500/90 text-slate-950 font-bold px-3 py-1.5 rounded-2xl shadow-xl text-xs border border-amber-300">
            <span>⚠️ Chưa hỗ trợ xem trước 3D (Thiếu texture phẳng)</span>
          </div>
        )}

        {/* Action Controls & Mode Toggle */}
        <div className="pointer-events-auto flex items-center gap-1.5 bg-slate-900/85 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 shadow-lg">
          {/* Mode Toggle Button: View 360 vs Edit Furniture */}
          <button
            type="button"
            onClick={() => onToggleEditMode(!isEditMode)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              isEditMode
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                : 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
            }`}
          >
            {isEditMode ? <Move size={14} /> : <Eye size={14} />}
            <span>{isEditMode ? 'Chỉnh nội thất' : 'Xem 360°'}</span>
          </button>

          <button
            type="button"
            onClick={handleToggleLighting}
            title={isDayLight ? 'Đổi sang ánh sáng buổi tối' : 'Đổi sang ánh sáng ban ngày'}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            {isDayLight ? <Sun size={17} className="text-amber-400" /> : <Moon size={17} className="text-sky-300" />}
          </button>

          <button
            type="button"
            onClick={handleResetCamera}
            title="Khôi phục góc nhìn ban đầu"
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer flex items-center gap-1 text-xs"
          >
            <RotateCcw size={17} />
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            {isFullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
          </button>
        </div>
      </div>

      {/* FLOATING ACTION BAR FOR SELECTED FURNITURE */}
      {selectedFurnitureId && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
          <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-emerald-500/50 shadow-2xl text-white">
            <span className="text-xs font-bold text-emerald-400 mr-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Đang chọn nội thất:
            </span>

            <button
              type="button"
              onClick={onRotateFurniture}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-emerald-600 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
              title="Xoay 45°"
            >
              <RotateCw size={13} />
              <span>Xoay 45°</span>
            </button>

            <button
              type="button"
              onClick={onDuplicateFurniture}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-emerald-600 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
              title="Nhân bản"
            >
              <Copy size={13} />
              <span>Sao chép</span>
            </button>

            <button
              type="button"
              onClick={onDeleteFurniture}
              className="px-2.5 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-600 text-red-300 hover:text-white text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
              title="Xóa món này"
            >
              <Trash2 size={13} />
              <span>Xóa</span>
            </button>

            <button
              type="button"
              onClick={onDeselectFurniture}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white transition cursor-pointer"
              title="Bỏ chọn"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      {/* BOTTOM OVERLAY: Camera Presets & Mode Instruction Hint */}
      <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-end justify-between pointer-events-none z-10 gap-3">
        {/* Preset angles pill selector */}
        <div className="pointer-events-auto flex items-center gap-1 bg-slate-900/85 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 shadow-lg overflow-x-auto max-w-full">
          <div className="px-2 py-1 text-[11px] font-semibold text-slate-400 flex items-center gap-1">
            <Eye size={13} />
            <span>Góc nhìn:</span>
          </div>
          {CAMERA_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleSelectPreset(preset)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                activePreset === preset.id
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              {preset.name}
            </button>
          ))}
        </div>

        {/* Dynamic Help Pill */}
        <div className="hidden sm:flex items-center gap-2 bg-slate-900/75 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-[11px] text-slate-300 pointer-events-auto">
          {isEditMode ? (
            <>
              <Move size={13} className="text-amber-400" />
              <span>Kéo thả đồ nội thất trên sàn • Nhấp vào đồ để xoay / xóa</span>
            </>
          ) : (
            <>
              <Layers size={13} className="text-emerald-400" />
              <span>Kéo chuột để xoay phòng 360° • Cuộn để phóng to</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
