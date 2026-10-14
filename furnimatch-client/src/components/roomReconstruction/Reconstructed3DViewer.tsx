import { useEffect, useRef, useState } from 'react';
import {
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
  Camera,
  Compass,
} from 'lucide-react';
import { ReconstructedRoomScene } from './ReconstructedRoomScene';
import type { TileProduct, TileLayoutOptions } from '../../types/tile';
import type { PlacedFurnitureItem } from '../../types/furniture';
import type { RoomCalibrationConfig } from '../../types/roomReconstruction';

interface Reconstructed3DViewerProps {
  calibration: RoomCalibrationConfig;
  selectedTile: TileProduct;
  options: TileLayoutOptions;
  isEditMode: boolean;
  onToggleEditMode: (isEdit: boolean) => void;
  selectedFurnitureId: string | null;
  isSelectedDetected?: boolean;
  onRotateFurniture: () => void;
  onDuplicateFurniture: () => void;
  onDeleteFurniture: () => void;
  onDeselectFurniture: () => void;
  onSceneReady?: (scene: ReconstructedRoomScene) => void;
  onSelectionChange?: (instanceId: string | null, isDetected?: boolean) => void;
  onFurnitureChange?: (items: PlacedFurnitureItem[]) => void;
  onFloorClick?: () => void;
  className?: string;
}

export const Reconstructed3DViewer = ({
  calibration,
  selectedTile,
  options,
  isEditMode,
  onToggleEditMode,
  selectedFurnitureId,
  isSelectedDetected = false,
  onRotateFurniture,
  onDuplicateFurniture,
  onDeleteFurniture,
  onDeselectFurniture,
  onSceneReady,
  onSelectionChange,
  onFurnitureChange,
  onFloorClick,
  className = '',
}: Reconstructed3DViewerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<ReconstructedRoomScene | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDayLight, setIsDayLight] = useState(true);
  const [isPhotoOverlay, setIsPhotoOverlay] = useState(false);
  const [isCeilingVisible, setIsCeilingVisible] = useState(calibration.ceiling?.enabled ?? true);
  const [activePreset, setActivePreset] = useState<'perspective' | 'photo' | 'topDown' | 'eyeLevel'>('perspective');

  // Initialize scene
  useEffect(() => {
    if (!containerRef.current) return;

    try {
      setIsLoading(true);
      setError(null);

      if (sceneRef.current) {
        sceneRef.current.dispose();
      }

      const sceneInstance = new ReconstructedRoomScene(
        containerRef.current,
        selectedTile,
        options,
        calibration.dimensions,
        calibration.wallColor,
        calibration.openings || [],
        calibration.ceiling,
        calibration.photoUrl
      );

      sceneRef.current = sceneInstance;

      sceneInstance.onSelectionChange = (id, isDetected) => {
        if (onSelectionChange) onSelectionChange(id, isDetected);
      };

      sceneInstance.onFurnitureChange = (items) => {
        if (onFurnitureChange) onFurnitureChange(items);
      };

      sceneInstance.onFloorClick = () => {
        if (onFloorClick) onFloorClick();
      };

      if (onSceneReady) {
        onSceneReady(sceneInstance);
      }

      setIsLoading(false);
    } catch (err: any) {
      console.error('Failed to initialize Reconstructed 3D Scene:', err);
      setError('Không thể khởi tạo cảnh 3D WebGL. Vui lòng kiểm tra hỗ trợ đồ họa trên trình duyệt.');
      setIsLoading(false);
    }

    return () => {
      if (sceneRef.current) {
        sceneRef.current.dispose();
        sceneRef.current = null;
      }
    };
  }, []);

  // Update Edit Mode
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.setEditMode(isEditMode);
    }
  }, [isEditMode]);

  // Update Dimensions
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.updateRoomDimensions(
        calibration.dimensions.widthMeters,
        calibration.dimensions.lengthMeters,
        calibration.dimensions.heightMeters
      );
      sceneRef.current.setWallColor(calibration.wallColor);
      if (calibration.openings) {
        sceneRef.current.setOpenings(calibration.openings);
      }
      if (calibration.ceiling) {
        sceneRef.current.setCeilingVisible(calibration.ceiling.enabled);
        setIsCeilingVisible(calibration.ceiling.enabled);
      }
    }
  }, [calibration.dimensions, calibration.wallColor, calibration.openings, calibration.ceiling]);

  // Update Floor Tile
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.updateTile(selectedTile, options);
    }
  }, [selectedTile, options]);

  // Fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current?.parentElement) return;
    const wrapper = containerRef.current.parentElement;
    if (!document.fullscreenElement) {
      wrapper.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const handleToggleLighting = () => {
    if (sceneRef.current) {
      const isDay = sceneRef.current.toggleLightingMode();
      setIsDayLight(isDay);
    }
  };

  const handleToggleCeiling = () => {
    if (sceneRef.current) {
      const isVisible = sceneRef.current.toggleCeiling();
      setIsCeilingVisible(isVisible);
    }
  };

  const handleTogglePhotoOverlay = () => {
    if (sceneRef.current) {
      const next = !isPhotoOverlay;
      setIsPhotoOverlay(next);
      sceneRef.current.setPhotoOverlayMode(next);
    }
  };

  const handleResetCamera = () => {
    if (sceneRef.current) {
      sceneRef.current.resetCamera();
      setActivePreset('perspective');
    }
  };

  const handlePhotoPerspective = () => {
    if (sceneRef.current) {
      sceneRef.current.setPhotoPerspectiveView();
      setActivePreset('photo');
    }
  };

  const handleTopDownView = () => {
    if (sceneRef.current) {
      sceneRef.current.setTopDownView();
      setActivePreset('topDown');
    }
  };

  const handleEyeLevelView = () => {
    if (sceneRef.current) {
      sceneRef.current.setEyeLevelView();
      setActivePreset('eyeLevel');
    }
  };

  const areaM2 = (calibration.dimensions.widthMeters * calibration.dimensions.lengthMeters).toFixed(1);

  return (
    <div className={`relative rounded-3xl overflow-hidden bg-slate-950 border border-slate-700/60 shadow-2xl ${className}`}>
      {/* 3D WebGL Canvas */}
      <div
        ref={containerRef}
        className={`w-full h-full min-h-[480px] sm:min-h-[540px] lg:min-h-[640px] touch-none select-none ${
          isEditMode ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
        }`}
      />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md text-white">
          <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mb-4" />
          <p className="text-sm font-semibold tracking-wide">Đang tái tạo không gian 3D toàn bộ căn phòng...</p>
          <p className="text-xs text-slate-400 mt-1">Đang dựng sàn PBR, trần, tường, cửa sổ và đồ nội thất</p>
        </div>
      )}

      {/* Error Fallback */}
      {error && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/90 p-6 text-center text-white">
          <div className="p-3 bg-red-500/20 text-red-400 rounded-2xl mb-3">⚠️</div>
          <h3 className="font-bold text-lg">Lỗi tải không gian 3D</h3>
          <p className="text-sm text-slate-300 mt-2 max-w-md">{error}</p>
        </div>
      )}

      {/* TOP OVERLAY BAR */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-10 gap-2">
        {/* Active Tile & Room Dimension Pill */}
        <div className="pointer-events-auto flex items-center gap-2.5 bg-slate-900/90 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/10 shadow-lg text-white">
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold truncate max-w-[140px] sm:max-w-[200px]">
                {selectedTile.name}
              </span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono px-1.5 py-0.5 rounded">
                {selectedTile.sku}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {calibration.dimensions.widthMeters}m × {calibration.dimensions.lengthMeters}m ({areaM2} m² sàn) • Cao {calibration.dimensions.heightMeters}m
            </p>
          </div>
        </div>

        {/* Action Controls & Mode Toggle */}
        <div className="pointer-events-auto flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 shadow-lg">
          {/* Mode Switcher */}
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

          {/* Toggle Ceiling */}
          <button
            type="button"
            onClick={handleToggleCeiling}
            title={isCeilingVisible ? 'Ẩn trần nhà (nhìn từ trên xuống)' : 'Hiện trần nhà'}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              isCeilingVisible
                ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <Layers size={14} />
            <span className="hidden sm:inline">{isCeilingVisible ? 'Trần: Bật' : 'Trần: Ẩn'}</span>
          </button>

          {/* Photo Overlay Toggle */}
          <button
            type="button"
            onClick={handleTogglePhotoOverlay}
            title={isPhotoOverlay ? 'Ẩn ảnh gốc' : 'Chiếu ảnh phòng gốc để đối chiếu'}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              isPhotoOverlay
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Camera size={14} />
            <span className="hidden sm:inline">Ảnh gốc</span>
          </button>

          {/* Day / Night Light */}
          <button
            type="button"
            onClick={handleToggleLighting}
            title={isDayLight ? 'Đổi sang ánh sáng buổi tối' : 'Đổi sang ánh sáng ban ngày'}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            {isDayLight ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} className="text-sky-300" />}
          </button>

          {/* Fullscreen */}
          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Thu nhỏ' : 'Xem toàn màn hình'}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {/* FLOATING ACTION GIZMO (When furniture is selected) */}
      {selectedFurnitureId && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-slate-900/95 backdrop-blur-md px-4 py-2 rounded-2xl border shadow-2xl text-white animate-fadeIn border-emerald-500/40">
          <span className="text-xs font-bold flex items-center gap-1.5 pr-2 border-r border-white/10 text-emerald-400">
            <Move size={13} />
            <span>{isSelectedDetected ? '🤖 AI Nhận diện' : '➕ Đã thêm'}</span>
          </span>

          <button
            type="button"
            onClick={onRotateFurniture}
            title="Xoay món đồ 45°"
            className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
          >
            <RotateCw size={14} className="text-amber-400" />
            <span>Xoay 45°</span>
          </button>

          <button
            type="button"
            onClick={onDuplicateFurniture}
            title="Nhân bản thêm 1 món"
            className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
          >
            <Copy size={14} className="text-sky-400" />
            <span>Nhân bản</span>
          </button>

          <button
            type="button"
            onClick={onDeleteFurniture}
            title="Xóa món đồ này"
            className="px-2.5 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/40 text-red-400 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
          >
            <Trash2 size={14} />
            <span>Xóa</span>
          </button>

          <button
            type="button"
            onClick={onDeselectFurniture}
            title="Bỏ chọn"
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* BOTTOM CAMERA PRESET TOOLBAR */}
      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between pointer-events-none z-10 gap-2">
        <div className="pointer-events-auto flex items-center gap-1 bg-slate-900/85 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 shadow-lg text-xs text-white">
          <button
            type="button"
            onClick={handleResetCamera}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activePreset === 'perspective'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Compass size={14} />
            <span>Góc 3D phối cảnh</span>
          </button>

          <button
            type="button"
            onClick={handlePhotoPerspective}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activePreset === 'photo'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Camera size={14} />
            <span>Góc ảnh gốc</span>
          </button>

          <button
            type="button"
            onClick={handleTopDownView}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activePreset === 'topDown'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Layers size={14} />
            <span>Mặt bằng sàn (2D/3D)</span>
          </button>

          <button
            type="button"
            onClick={handleEyeLevelView}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activePreset === 'eyeLevel'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Eye size={14} />
            <span>Góc mắt người</span>
          </button>
        </div>

        <div className="pointer-events-auto hidden md:flex items-center gap-2 bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-white/10 text-[11px] text-slate-400 shadow-lg">
          <span>Chuột trái: Xoay 360° • Chuột phải: Trượt phòng • Cuộn: Thu/Phóng</span>
        </div>
      </div>
    </div>
  );
};
