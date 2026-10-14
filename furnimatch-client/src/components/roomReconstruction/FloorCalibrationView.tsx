import { useState, useRef, useEffect, type MouseEvent, type TouchEvent } from 'react';
import {
  Sliders,
  Palette,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Sparkles,
  Layers,
  X,
  Info,
} from 'lucide-react';
import type {
  PhotoAnalysisResult,
  FloorPolygon,
  RoomCalibrationConfig,
  DetectedOpening,
  DetectedCeiling,
  DetectedFurnitureObject,
} from '../../types/roomReconstruction';

interface FloorCalibrationViewProps {
  analysis: PhotoAnalysisResult;
  onConfirm: (config: RoomCalibrationConfig) => void;
  onBackToUpload: () => void;
}

type ActiveHandle = 'topLeft' | 'topRight' | 'bottomRight' | 'bottomLeft' | null;

const WALL_COLOR_PRESETS = [
  { name: 'Màu nhận diện từ ảnh', hex: '' },
  { name: 'Trắng sứ tự nhiên', hex: '#f8fafc' },
  { name: 'Xám ấm Scandinavian', hex: '#eceae4' },
  { name: 'Kem be thanh lịch', hex: '#f5efe6' },
  { name: 'Xám bê tông Modern', hex: '#e2e8f0' },
  { name: 'Xanh Sage thư giãn', hex: '#e2ebe6' },
];

export const FloorCalibrationView = ({
  analysis,
  onConfirm,
  onBackToUpload,
}: FloorCalibrationViewProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Polygon state
  const [polygon, setPolygon] = useState<FloorPolygon>(analysis.floorPolygon);
  const [activeHandle, setActiveHandle] = useState<ActiveHandle>(null);

  // Room dimensions state
  const [widthMeters, setWidthMeters] = useState<number>(analysis.estimatedDimensions.widthMeters);
  const [lengthMeters, setLengthMeters] = useState<number>(analysis.estimatedDimensions.lengthMeters);
  const [heightMeters, setHeightMeters] = useState<number>(analysis.estimatedDimensions.heightMeters);
  const roomType = analysis.estimatedDimensions.roomType;

  // Wall color state
  const [wallColor, setWallColor] = useState<string>(analysis.detectedColors.primaryWallColor);

  // Openings & Ceiling & Furniture state
  const [openings, setOpenings] = useState<DetectedOpening[]>(analysis.openings || []);
  const [ceiling, setCeiling] = useState<DetectedCeiling>(
    analysis.ceiling || {
      enabled: true,
      color: '#faf9f6',
      estimatedHeight: 2.8,
      hasRecessedLights: true,
      confidence: 90,
    }
  );
  const [detectedFurniture, setDetectedFurniture] = useState<DetectedFurnitureObject[]>(
    analysis.detectedFurniture || []
  );

  // Dynamic preset wall color
  WALL_COLOR_PRESETS[0].hex = analysis.detectedColors.primaryWallColor;

  const updateHandleCoords = (clientX: number, clientY: number) => {
    if (!activeHandle || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));

    setPolygon((prev) => ({
      ...prev,
      [activeHandle]: { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) },
    }));
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (activeHandle) {
      updateHandleCoords(e.clientX, e.clientY);
    }
  };

  const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    if (activeHandle && e.touches.length > 0) {
      updateHandleCoords(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  useEffect(() => {
    const handleGlobalUp = () => setActiveHandle(null);
    window.addEventListener('mouseup', handleGlobalUp);
    window.addEventListener('touchend', handleGlobalUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalUp);
      window.removeEventListener('touchend', handleGlobalUp);
    };
  }, []);

  const handleResetToAuto = () => {
    setPolygon(analysis.floorPolygon);
    setWidthMeters(analysis.estimatedDimensions.widthMeters);
    setLengthMeters(analysis.estimatedDimensions.lengthMeters);
    setHeightMeters(analysis.estimatedDimensions.heightMeters);
    setWallColor(analysis.detectedColors.primaryWallColor);
    setOpenings(analysis.openings);
    setCeiling(analysis.ceiling);
    setDetectedFurniture(analysis.detectedFurniture);
  };

  const toggleOpening = (id: string) => {
    setOpenings((prev) => prev.filter((op) => op.id !== id));
  };

  const toggleFurniture = (id: string) => {
    setDetectedFurniture((prev) => prev.filter((f) => f.id !== id));
  };

  const handleConfirm = () => {
    onConfirm({
      floorPolygon: polygon,
      dimensions: {
        widthMeters,
        lengthMeters,
        heightMeters,
      },
      wallColor,
      roomType,
      photoUrl: analysis.photoUrl,
      openings,
      ceiling,
      detectedFurniture,
    });
  };

  const floorAreaM2 = Number((widthMeters * lengthMeters).toFixed(1));

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 animate-fadeIn pb-12 font-sans">
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">
            <Sparkles size={14} />
            <span>Bước 2: Xác nhận cấu trúc toàn bộ căn phòng</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900">
            Hiệu chỉnh sàn, tường, trần, cửa &amp; đồ nội thất nhận diện
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Hệ thống đã phân đoạn trần, tường, sàn, cửa sổ, cửa đi và các vật thể chính từ ảnh. Bạn có thể kéo góc sàn và xác nhận trước khi tái tạo 3D.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onBackToUpload}
            className="px-4 py-2.5 rounded-xl border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft size={15} />
            <span>Đổi ảnh khác</span>
          </button>
          <button
            type="button"
            onClick={handleResetToAuto}
            className="px-4 py-2.5 rounded-xl border border-emerald-200 text-emerald-700 hover:bg-emerald-50 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw size={14} />
            <span>Khôi phục nhận diện</span>
          </button>
        </div>
      </div>

      {/* MAIN TWO-COLUMN WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: INTERACTIVE 2D IMAGE WITH POLYGON & OBJECT DETECTIONS (7 cols) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-3xl border border-gray-200 shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs text-gray-600 px-1">
            <span className="font-bold flex items-center gap-1.5 text-gray-900">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Phân đoạn phòng &amp; vật thể (Kéo 4 chốt xanh để căn chân tường)</span>
            </span>
            <span className="bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full font-bold">
              Độ tin cậy: {analysis.estimatedDimensions.confidenceScore}%
            </span>
          </div>

          {/* Interactive Image Container */}
          <div
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onTouchMove={handleTouchMove}
            className="relative w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-700 shadow-inner select-none touch-none aspect-[16/11] flex items-center justify-center cursor-crosshair"
          >
            <img
              src={analysis.photoUrl}
              alt="Calibration target"
              className="w-full h-full object-contain pointer-events-none"
            />

            {/* SVG Polygon Overlay */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <polygon
                points={`${polygon.topLeft.x},${polygon.topLeft.y} ${polygon.topRight.x},${polygon.topRight.y} ${polygon.bottomRight.x},${polygon.bottomRight.y} ${polygon.bottomLeft.x},${polygon.bottomLeft.y}`}
                fill="rgba(16, 185, 129, 0.32)"
                stroke="#10b981"
                strokeWidth="0.8"
                strokeDasharray="2, 1"
              />
            </svg>

            {/* Detected Openings Overlays (Windows / Doors) */}
            {openings.map((op) => (
              <div
                key={op.id}
                style={{
                  left: `${op.bbox2D.x}%`,
                  top: `${op.bbox2D.y}%`,
                  width: `${op.bbox2D.width}%`,
                  height: `${op.bbox2D.height}%`,
                }}
                className={`absolute pointer-events-none border-2 rounded-lg flex items-start justify-start p-1 ${
                  op.type === 'window'
                    ? 'border-sky-400 bg-sky-400/20 text-sky-200'
                    : 'border-amber-400 bg-amber-400/20 text-amber-200'
                }`}
              >
                <span className="text-[10px] font-black bg-slate-900/85 px-1.5 py-0.5 rounded shadow">
                  {op.type === 'window' ? '🪟 ' : '🚪 '}
                  {op.label}
                </span>
              </div>
            ))}

            {/* Detected Furniture Overlays */}
            {detectedFurniture.map((f) => (
              <div
                key={f.id}
                style={{
                  left: `${f.bbox2D.x}%`,
                  top: `${f.bbox2D.y}%`,
                  width: `${f.bbox2D.width}%`,
                  height: `${f.bbox2D.height}%`,
                }}
                className="absolute pointer-events-none border-2 border-emerald-400 bg-emerald-400/20 rounded-xl flex items-start justify-start p-1.5"
              >
                <span className="text-[10px] font-black bg-slate-900/90 text-emerald-300 px-1.5 py-0.5 rounded shadow truncate max-w-full">
                  {f.category === 'bed' ? '🛏️ ' : f.category === 'sofa' ? '🛋️ ' : f.category === 'wardrobe' ? '🚪 ' : '☕ '}
                  {f.name} ({f.confidence}%)
                </span>
              </div>
            ))}

            {/* 4 Interactive Draggable Corner Handles */}
            {(['topLeft', 'topRight', 'bottomRight', 'bottomLeft'] as const).map((handleKey) => {
              const pt = polygon[handleKey];
              return (
                <div
                  key={handleKey}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setActiveHandle(handleKey);
                  }}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    setActiveHandle(handleKey);
                  }}
                  style={{
                    left: `${pt.x}%`,
                    top: `${pt.y}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  className={`absolute z-20 w-7 h-7 rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing transition-transform ${
                    activeHandle === handleKey
                      ? 'scale-125 bg-amber-400 ring-4 ring-amber-400/40 text-slate-950'
                      : 'bg-emerald-500 hover:scale-110 ring-4 ring-emerald-500/30 text-white'
                  }`}
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-white shadow-sm" />
                </div>
              );
            })}
          </div>

          {/* Occluded Areas Transparency Notice */}
          <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-2xl text-[11px] text-amber-900 flex items-start gap-2">
            <Info size={15} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong>Lưu ý về chiều sâu &amp; vùng bị khuất:</strong> Một bức ảnh 2D không chứa thông tin mặt sau của đồ vật hoặc phần phòng nằm ngoài góc máy. Hệ thống tự động suy luận hình học đối xứng và cho phép bạn tự do xoay, di chuyển hoặc đổi vị trí trong không gian 3D.
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: STRUCTURAL ELEMENTS & DIMENSIONS (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Detected Objects Checklist */}
          <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm space-y-3">
            <h3 className="font-bold text-gray-900 text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Layers size={16} className="text-emerald-600" />
                <span>Thành phần phòng nhận diện ({openings.length + detectedFurniture.length + 1})</span>
              </span>
              <span className="text-[11px] text-emerald-700 font-semibold">Tự động dựng 3D</span>
            </h3>

            <div className="space-y-1.5 max-h-[190px] overflow-y-auto pr-1 text-xs">
              {/* Ceiling */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center gap-2">
                  <span className="text-slate-600 font-bold">🏠 Trần nhà thạch cao</span>
                  <span className="text-[10px] text-gray-400">Cao {heightMeters}m</span>
                </div>
                <button
                  type="button"
                  onClick={() => setCeiling((c) => ({ ...c, enabled: !c.enabled }))}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${
                    ceiling.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {ceiling.enabled ? '✓ Dựng trần' : 'Ẩn trần'}
                </button>
              </div>

              {/* Openings */}
              {openings.map((op) => (
                <div key={op.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="flex items-center gap-2">
                    <span>{op.type === 'window' ? '🪟' : '🚪'}</span>
                    <span className="font-bold text-gray-800">{op.label}</span>
                    <span className="text-[10px] text-gray-400">
                      Tường {op.wall === 'right' ? 'phải' : op.wall === 'left' ? 'trái' : 'sau'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleOpening(op.id)}
                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                    title="Xóa cửa này"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}

              {/* Detected Furniture */}
              {detectedFurniture.map((f) => (
                <div key={f.id} className="flex items-center justify-between p-2 rounded-xl bg-emerald-50/60 border border-emerald-200/80">
                  <div className="flex items-center gap-2">
                    <span>{f.category === 'bed' ? '🛏️' : f.category === 'sofa' ? '🛋️' : '🚪'}</span>
                    <div>
                      <span className="font-bold text-emerald-950 block">{f.name}</span>
                      <span className="text-[10px] text-emerald-700">Độ tin cậy: {f.confidence}%</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleFurniture(f.id)}
                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                    title="Bỏ qua món đồ này"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Metric Dimensions */}
          <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <Sliders size={16} className="text-emerald-600" />
                <span>Kích thước phòng (Metric 3D)</span>
              </h3>
              <div className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                {floorAreaM2} m² sàn
              </div>
            </div>

            {/* Width */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-gray-700">Chiều rộng:</span>
                <span className="font-bold text-emerald-700">{widthMeters} m</span>
              </div>
              <input
                type="range"
                min="3.0"
                max="10.0"
                step="0.1"
                value={widthMeters}
                onChange={(e) => setWidthMeters(parseFloat(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
            </div>

            {/* Length */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-gray-700">Chiều dài:</span>
                <span className="font-bold text-emerald-700">{lengthMeters} m</span>
              </div>
              <input
                type="range"
                min="3.0"
                max="10.0"
                step="0.1"
                value={lengthMeters}
                onChange={(e) => setLengthMeters(parseFloat(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
            </div>

            {/* Height */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-gray-700">Chiều cao trần:</span>
                <span className="font-bold text-emerald-700">{heightMeters} m</span>
              </div>
              <input
                type="range"
                min="2.4"
                max="4.5"
                step="0.1"
                value={heightMeters}
                onChange={(e) => setHeightMeters(parseFloat(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
            </div>
          </div>

          {/* Wall Paint Color */}
          <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm space-y-2.5">
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
              <Palette size={16} className="text-emerald-600" />
              <span>Màu sơn các mặt tường</span>
            </h3>

            <div className="flex flex-wrap items-center gap-2">
              {WALL_COLOR_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setWallColor(preset.hex)}
                  title={preset.name}
                  className={`w-8 h-8 rounded-xl border flex items-center justify-center transition cursor-pointer shadow-sm ${
                    wallColor.toLowerCase() === preset.hex.toLowerCase()
                      ? 'ring-2 ring-emerald-500 scale-105'
                      : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: preset.hex }}
                >
                  {wallColor.toLowerCase() === preset.hex.toLowerCase() && (
                    <div className="w-2 h-2 rounded-full bg-slate-900/60" />
                  )}
                </button>
              ))}

              <div className="flex items-center gap-2 ml-auto">
                <input
                  type="color"
                  value={wallColor}
                  onChange={(e) => setWallColor(e.target.value)}
                  className="w-8 h-8 rounded-xl border border-gray-300 p-0.5 cursor-pointer"
                  title="Chọn màu tùy biến"
                />
              </div>
            </div>
          </div>

          {/* Confirm & Build 3D Button */}
          <button
            type="button"
            onClick={handleConfirm}
            className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-base shadow-xl shadow-emerald-600/30 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Tái tạo không gian 3D hoàn chỉnh</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
