import { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Camera,
  Sliders,
  Home,
  ShoppingCart,
  CheckCircle,
  ExternalLink,
  AlertTriangle,
  Download,
} from 'lucide-react';
import { PhotoUploader } from '../components/roomReconstruction/PhotoUploader';
import { FloorCalibrationView } from '../components/roomReconstruction/FloorCalibrationView';
import { Reconstructed3DViewer } from '../components/roomReconstruction/Reconstructed3DViewer';
import { RoomDesignToolbar } from '../components/roomReconstruction/RoomDesignToolbar';
import type { ReconstructedRoomScene } from '../components/roomReconstruction/ReconstructedRoomScene';
import type {
  PhotoAnalysisResult,
  RoomCalibrationConfig,
  ReconstructedRoomDesign,
  SampleRoomPhoto,
} from '../types/roomReconstruction';
import type { TileProduct, TileLayoutOptions } from '../types/tile';
import type { PlacedFurnitureItem, FurnitureModelDef } from '../types/furniture';
import { INITIAL_TILE_PRODUCTS } from '../data/tileProducts';
import { fetchRealCatalogTiles } from '../services/catalogService';
import { addToCart } from '../utils/cart';
import {
  saveReconstructedDesign,
  getSavedReconstructedDesigns,
  deleteReconstructedDesign,
} from '../services/roomReconstructStorage';

export default function CustomRoomDesigner() {
  const sceneRef = useRef<ReconstructedRoomScene | null>(null);

  // Workflow Step: 1 (Upload) -> 2 (Calibrate) -> 3 (3D Studio)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Analysis & Calibration State
  const [analysisResult, setAnalysisResult] = useState<PhotoAnalysisResult | null>(null);
  const [calibrationConfig, setCalibrationConfig] = useState<RoomCalibrationConfig>({
    floorPolygon: {
      topLeft: { x: 18, y: 55 },
      topRight: { x: 82, y: 55 },
      bottomRight: { x: 96, y: 96 },
      bottomLeft: { x: 4, y: 96 },
    },
    dimensions: {
      widthMeters: 5.5,
      lengthMeters: 6.0,
      heightMeters: 2.8,
    },
    wallColor: '#eceae4',
    roomType: 'living_room',
    photoUrl: '',
    openings: [],
    ceiling: {
      enabled: true,
      color: '#faf9f6',
      estimatedHeight: 2.8,
      hasRecessedLights: true,
      confidence: 90,
    },
    detectedFurniture: [],
  });

  // Tile Catalog State
  const [tiles, setTiles] = useState<TileProduct[]>(INITIAL_TILE_PRODUCTS);
  const [selectedTile, setSelectedTile] = useState<TileProduct>(INITIAL_TILE_PRODUCTS[0]);

  const [layoutOptions, setLayoutOptions] = useState<TileLayoutOptions>({
    pattern: 'grid',
    direction: 'horizontal',
    orientation: 0,
    groutColor: '#cfcfcf',
    groutWidthMm: 2.0,
    finishEnhancement: 'normal',
  });

  // Furniture & Viewer Interaction State
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedFurnitureId, setSelectedFurnitureId] = useState<string | null>(null);
  const [isSelectedDetected, setIsSelectedDetected] = useState<boolean>(false);
  const [placedItems, setPlacedItems] = useState<PlacedFurnitureItem[]>([]);

  // Persistence & Toast
  const [savedDesigns, setSavedDesigns] = useState<ReconstructedRoomDesign[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Fetch real tile products from backend API
  const loadCatalog = useCallback(async () => {
    try {
      const res = await fetchRealCatalogTiles();
      if (res.tiles.length > 0) {
        setTiles(res.tiles);
        const nextTile = res.tiles.find((t) => t.has3DTexture) || res.tiles[0];
        setSelectedTile(nextTile);
      } else {
        setTiles(INITIAL_TILE_PRODUCTS);
      }
    } catch (err: any) {
      console.warn('Could not fetch catalog:', err);
      setTiles(INITIAL_TILE_PRODUCTS);
    }
  }, []);

  useEffect(() => {
    loadCatalog();
    setSavedDesigns(getSavedReconstructedDesigns());
  }, [loadCatalog]);

  // Handle Photo Analysis Completion (Step 1 -> Step 2)
  const handleAnalysisComplete = (result: PhotoAnalysisResult) => {
    setAnalysisResult(result);
    setCalibrationConfig({
      floorPolygon: result.floorPolygon,
      dimensions: {
        widthMeters: result.estimatedDimensions.widthMeters,
        lengthMeters: result.estimatedDimensions.lengthMeters,
        heightMeters: result.estimatedDimensions.heightMeters,
      },
      wallColor: result.detectedColors.primaryWallColor,
      roomType: result.estimatedDimensions.roomType,
      photoUrl: result.photoUrl,
      openings: result.openings || [],
      ceiling: result.ceiling || {
        enabled: true,
        color: result.detectedColors.ceilingColor || '#faf9f6',
        estimatedHeight: result.estimatedDimensions.heightMeters,
        hasRecessedLights: true,
        confidence: 90,
      },
      detectedFurniture: result.detectedFurniture || [],
    });
    setCurrentStep(2);
  };

  // Handle Selecting a Pre-configured Sample Room
  const handleSelectSampleRoom = (sample: SampleRoomPhoto) => {
    setCalibrationConfig({
      floorPolygon: sample.defaultPolygon,
      dimensions: sample.defaultDimensions,
      wallColor: sample.defaultWallColor,
      roomType: sample.roomType,
      photoUrl: sample.photoUrl,
      openings: sample.defaultOpenings || [],
      ceiling: sample.defaultCeiling || {
        enabled: true,
        color: '#faf9f6',
        estimatedHeight: sample.defaultDimensions.heightMeters,
        hasRecessedLights: true,
        confidence: 92,
      },
      detectedFurniture: sample.defaultDetectedFurniture || [],
    });
    setPlacedItems(sample.defaultFurniture);
    setCurrentStep(3);

    showToast(`Đã tải phòng mẫu: ${sample.title}`);
  };

  // Handle Calibration Confirmation (Step 2 -> Step 3)
  const handleCalibrationConfirm = (calib: RoomCalibrationConfig) => {
    setCalibrationConfig(calib);

    // Convert detected furniture from calibration to placed furniture items
    const detectedPlacedItems: PlacedFurnitureItem[] = (calib.detectedFurniture || []).map((df) => ({
      instanceId: df.id,
      modelId: df.modelId,
      name: df.name,
      category: df.category,
      position: [df.estimated3DPos[0], 0, df.estimated3DPos[2]],
      rotationY: df.estimatedRotationY,
      color: df.dominantColor,
    }));

    setPlacedItems(detectedPlacedItems);
    setCurrentStep(3);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Furniture Operations
  const handleAddFurniture = (model: FurnitureModelDef) => {
    setIsEditMode(true);
    if (sceneRef.current) {
      const newId = sceneRef.current.addFurniture(model);
      setSelectedFurnitureId(newId);
      setIsSelectedDetected(false);
    }
  };

  const handleRotateFurniture = () => {
    if (sceneRef.current) {
      sceneRef.current.rotateSelectedFurniture(Math.PI / 4);
    }
  };

  const handleDuplicateFurniture = () => {
    if (sceneRef.current) {
      const newId = sceneRef.current.duplicateSelectedFurniture();
      if (newId) {
        setSelectedFurnitureId(newId);
        setIsSelectedDetected(false);
      }
    }
  };

  const handleDeleteFurniture = (id: string) => {
    if (sceneRef.current) {
      sceneRef.current.removeFurniture(id);
    }
  };

  const handleClearAllFurniture = () => {
    if (sceneRef.current) {
      sceneRef.current.clearAllFurniture();
      setSelectedFurnitureId(null);
      setIsSelectedDetected(false);
    }
  };

  // Save Design
  const handleSaveDesign = () => {
    try {
      const newDesign: ReconstructedRoomDesign = {
        id: `room_${Date.now()}`,
        name: `Phòng ${calibrationConfig.dimensions.widthMeters}m × ${calibrationConfig.dimensions.lengthMeters}m (${new Date().toLocaleDateString('vi-VN')})`,
        photoUrl: calibrationConfig.photoUrl,
        photoFileName: analysisResult?.photoFileName || 'sample_room.jpg',
        calibration: calibrationConfig,
        selectedTileId: selectedTile.id,
        layoutOptions,
        placedFurniture: placedItems,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      saveReconstructedDesign(newDesign);
      setSavedDesigns(getSavedReconstructedDesigns());
      setIsSaved(true);
      showToast('Đã lưu thiết kế phòng 3D thành công!');
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err: any) {
      showToast(err.message || 'Không thể lưu thiết kế.');
    }
  };

  // Load Saved Design
  const handleLoadSavedDesign = (design: ReconstructedRoomDesign) => {
    setCalibrationConfig(design.calibration);
    setLayoutOptions(design.layoutOptions);
    const matchedTile = tiles.find((t) => t.id === design.selectedTileId) || selectedTile;
    setSelectedTile(matchedTile);
    setPlacedItems(design.placedFurniture);

    if (sceneRef.current) {
      sceneRef.current.setPlacedFurnitureList(design.placedFurniture);
      sceneRef.current.updateRoomDimensions(
        design.calibration.dimensions.widthMeters,
        design.calibration.dimensions.lengthMeters,
        design.calibration.dimensions.heightMeters
      );
      sceneRef.current.setWallColor(design.calibration.wallColor);
      if (design.calibration.openings) {
        sceneRef.current.setOpenings(design.calibration.openings);
      }
      if (design.calibration.ceiling) {
        sceneRef.current.setCeilingVisible(design.calibration.ceiling.enabled);
      }
      sceneRef.current.updateTile(matchedTile, design.layoutOptions);
    }

    showToast(`Đã mở: ${design.name}`);
  };

  const handleDeleteSavedDesign = (id: string) => {
    deleteReconstructedDesign(id);
    setSavedDesigns(getSavedReconstructedDesigns());
    showToast('Đã xóa bản thiết kế.');
  };

  // Export Screenshot
  const handleExportScreenshot = () => {
    if (sceneRef.current) {
      const dataUrl = sceneRef.current.captureScreenshot();
      const link = document.createElement('a');
      link.download = `FurniMatch_Room_3D_${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      showToast('Đã xuất ảnh phòng 3D thành công!');
    }
  };

  // Add to cart
  const handleAddToCart = (tile: TileProduct, boxes: number) => {
    const pId = tile.productId || parseInt(tile.id) || 1;
    const res = addToCart({
      productId: pId,
      variantId: tile.selectedVariant?.variantId,
      name: tile.name,
      sizeLabel: tile.sizeLabel,
      price: tile.price,
      quantity: boxes,
      imageUrl: tile.thumbnailUrl || tile.textureUrl,
      sellerName: tile.origin,
      sellerId: tile.rawProduct?.sellerId,
    });
    showToast(res.message);
  };

  return (
    <div className="min-h-screen bg-slate-50/70 pb-20 font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-700 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-semibold animate-bounce">
          <CheckCircle size={18} />
          <span>{toastMessage}</span>
          <Link to="/checkout" className="ml-2 underline font-bold text-emerald-200 hover:text-white">
            Xem giỏ
          </Link>
        </div>
      )}

      {/* STEPPER HEADER */}
      <section className="bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-700 border-b border-emerald-500/30 text-white pt-6 pb-6 px-4 sm:px-6 lg:px-8 shadow-sm relative overflow-hidden">
        {/* Ambient subtle glow */}
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-emerald-400/20 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-teal-300/20 blur-2xl pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10">
          {/* Breadcrumb & Navigation */}
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2 text-xs text-emerald-100 font-medium">
              <Link to="/" className="hover:text-white flex items-center gap-1 transition">
                <Home size={13} /> Trang chủ
              </Link>
              <span>/</span>
              <Link to="/space-planner" className="hover:text-white transition">
                Phòng mẫu 3D
              </Link>
              <span>/</span>
              <span className="text-white font-semibold">Tái tạo phòng từ ảnh</span>
            </div>

            <Link
              to="/space-planner"
              className="text-xs text-white hover:bg-white/25 bg-white/15 px-3.5 py-1.5 rounded-xl border border-white/25 backdrop-blur-sm transition font-medium shadow-sm"
            >
              Chuyển sang Phòng mẫu dựng sẵn ➔
            </Link>
          </div>

          {/* Stepper Navigation */}
          <div className="flex items-center justify-center max-w-2xl mx-auto">
            <div className="flex items-center w-full">
              {/* Step 1 */}
              <div
                onClick={() => setCurrentStep(1)}
                className={`flex items-center gap-2 cursor-pointer ${
                  currentStep === 1
                    ? 'text-white font-bold'
                    : currentStep > 1
                    ? 'text-emerald-100'
                    : 'text-emerald-200/60'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition ${
                    currentStep === 1
                      ? 'bg-white text-emerald-800 ring-4 ring-white/30 shadow-md font-black'
                      : currentStep > 1
                      ? 'bg-emerald-900/60 text-white border border-white/30'
                      : 'bg-white/10 text-emerald-100/60 border border-white/15'
                  }`}
                >
                  1
                </div>
                <span className="text-xs sm:text-sm hidden sm:inline">1. Tải ảnh phòng</span>
              </div>

              <div
                className={`flex-1 h-0.5 mx-3 transition-colors ${
                  currentStep > 1 ? 'bg-white/70' : 'bg-white/20'
                }`}
              />

              {/* Step 2 */}
              <div
                onClick={() => analysisResult && setCurrentStep(2)}
                className={`flex items-center gap-2 ${
                  analysisResult ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
                } ${
                  currentStep === 2
                    ? 'text-white font-bold'
                    : currentStep > 2
                    ? 'text-emerald-100'
                    : 'text-emerald-200/60'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition ${
                    currentStep === 2
                      ? 'bg-white text-emerald-800 ring-4 ring-white/30 shadow-md font-black'
                      : currentStep > 2
                      ? 'bg-emerald-900/60 text-white border border-white/30'
                      : 'bg-white/10 text-emerald-100/60 border border-white/15'
                  }`}
                >
                  2
                </div>
                <span className="text-xs sm:text-sm hidden sm:inline">2. Cấu trúc &amp; Đồ vật</span>
              </div>

              <div
                className={`flex-1 h-0.5 mx-3 transition-colors ${
                  currentStep > 2 ? 'bg-white/70' : 'bg-white/20'
                }`}
              />

              {/* Step 3 */}
              <div
                onClick={() => calibrationConfig.photoUrl && setCurrentStep(3)}
                className={`flex items-center gap-2 ${
                  calibrationConfig.photoUrl ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
                } ${currentStep === 3 ? 'text-white font-bold' : 'text-emerald-200/60'}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition ${
                    currentStep === 3
                      ? 'bg-white text-emerald-800 ring-4 ring-white/30 shadow-md font-black'
                      : 'bg-white/10 text-emerald-100/60 border border-white/15'
                  }`}
                >
                  3
                </div>
                <span className="text-xs sm:text-sm hidden sm:inline">3. Không gian 3D tương tác</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STEP BODY CONTAINER */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {/* STEP 1: UPLOAD PHOTO */}
        {currentStep === 1 && (
          <PhotoUploader
            onAnalysisComplete={handleAnalysisComplete}
            onSelectSampleRoom={handleSelectSampleRoom}
          />
        )}

        {/* STEP 2: FLOOR & DIMENSION CALIBRATION */}
        {currentStep === 2 && analysisResult && (
          <FloorCalibrationView
            analysis={analysisResult}
            onConfirm={handleCalibrationConfirm}
            onBackToUpload={() => setCurrentStep(1)}
          />
        )}

        {/* STEP 3: INTERACTIVE 3D STUDIO */}
        {currentStep === 3 && (
          <div className="space-y-8 animate-fadeIn">
            {/* Top Return Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-gray-200/90 shadow-sm text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-gray-700">
                  <strong>Không gian 3D toàn bộ căn phòng:</strong> Sàn ({calibrationConfig.dimensions.widthMeters}m × {calibrationConfig.dimensions.lengthMeters}m ={' '}
                  {(
                    calibrationConfig.dimensions.widthMeters *
                    calibrationConfig.dimensions.lengthMeters
                  ).toFixed(1)}{' '}
                  m²), Trần (cao {calibrationConfig.dimensions.heightMeters}m), Các mặt tường,{' '}
                  {calibrationConfig.openings?.length || 0} Cửa và{' '}
                  {placedItems.length} Món nội thất.
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-3 py-1.5 rounded-xl border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <Sliders size={13} />
                  <span>Căn chỉnh lại phòng</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-3 py-1.5 rounded-xl border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <Camera size={13} />
                  <span>Đổi ảnh phòng</span>
                </button>
              </div>
            </div>

            {/* Main 3D Studio: Viewer (Left) + Toolbar (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: 3D Room Viewer (7-8 cols) */}
              <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-4">
                <Reconstructed3DViewer
                  calibration={calibrationConfig}
                  selectedTile={selectedTile}
                  options={layoutOptions}
                  isEditMode={isEditMode}
                  onToggleEditMode={setIsEditMode}
                  selectedFurnitureId={selectedFurnitureId}
                  isSelectedDetected={isSelectedDetected}
                  onRotateFurniture={handleRotateFurniture}
                  onDuplicateFurniture={handleDuplicateFurniture}
                  onDeleteFurniture={() => {
                    if (selectedFurnitureId) {
                      handleDeleteFurniture(selectedFurnitureId);
                      setSelectedFurnitureId(null);
                      setIsSelectedDetected(false);
                    }
                  }}
                  onDeselectFurniture={() => {
                    setSelectedFurnitureId(null);
                    setIsSelectedDetected(false);
                  }}
                  onSceneReady={(scene) => {
                    sceneRef.current = scene;
                    if (placedItems.length > 0) {
                      scene.setPlacedFurnitureList(placedItems);
                    }
                  }}
                  onSelectionChange={(id, isDet) => {
                    setSelectedFurnitureId(id);
                    setIsSelectedDetected(!!isDet);
                  }}
                  onFurnitureChange={(items) => setPlacedItems(items)}
                  className="w-full shadow-2xl"
                />

                {/* Instructions Bar */}
                <div className="p-4 rounded-2xl bg-white border border-gray-200/90 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-600">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span>
                      <strong>Hướng dẫn:</strong> Bật <strong>"Chỉnh nội thất"</strong> để click chuột kéo thả giường, tủ, sofa. Bật <strong>"Xem 360°"</strong> để xoay tự do. Nhấn <strong>"Trần: Bật/Ẩn"</strong> để quan sát từ trên cao. Nhấn <strong>"Ảnh gốc"</strong> để đối chiếu trực tiếp.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportScreenshot}
                    className="inline-flex items-center gap-1 font-bold text-emerald-700 hover:text-emerald-800 shrink-0 cursor-pointer"
                  >
                    <Download size={14} />
                    <span>Tải ảnh phối cảnh 3D</span>
                  </button>
                </div>
              </div>

              {/* Right Column: Tile & Furniture Toolbar (4-5 cols) */}
              <div className="lg:col-span-5 xl:col-span-4 h-full">
                <RoomDesignToolbar
                  tiles={tiles}
                  selectedTile={selectedTile}
                  onSelectTile={setSelectedTile}
                  options={layoutOptions}
                  onOptionsChange={setLayoutOptions}
                  calibration={calibrationConfig}
                  onCalibrationChange={(newCalib) => {
                    setCalibrationConfig(newCalib);
                    if (sceneRef.current) {
                      sceneRef.current.updateRoomDimensions(
                        newCalib.dimensions.widthMeters,
                        newCalib.dimensions.lengthMeters,
                        newCalib.dimensions.heightMeters
                      );
                      sceneRef.current.setWallColor(newCalib.wallColor);
                      if (newCalib.openings) {
                        sceneRef.current.setOpenings(newCalib.openings);
                      }
                      if (newCalib.ceiling) {
                        sceneRef.current.setCeilingVisible(newCalib.ceiling.enabled);
                      }
                    }
                  }}
                  placedItems={placedItems}
                  selectedInstanceId={selectedFurnitureId}
                  isSelectedDetected={isSelectedDetected}
                  onSelectInstance={(id) => {
                    setSelectedFurnitureId(id);
                    if (sceneRef.current) sceneRef.current.selectFurniture(id);
                  }}
                  onAddFurniture={handleAddFurniture}
                  onRotateInstance={handleRotateFurniture}
                  onDuplicateInstance={handleDuplicateFurniture}
                  onDeleteInstance={handleDeleteFurniture}
                  onClearAllFurniture={handleClearAllFurniture}
                  onSaveDesign={handleSaveDesign}
                  isSaved={isSaved}
                  onExportScreenshot={handleExportScreenshot}
                  onAddToCart={handleAddToCart}
                  savedDesigns={savedDesigns}
                  onLoadSavedDesign={handleLoadSavedDesign}
                  onDeleteSavedDesign={handleDeleteSavedDesign}
                />
              </div>
            </div>

            {/* Selected Tile Showcase Details */}
            <div className="rounded-3xl bg-white border border-gray-200 shadow-md p-6 sm:p-8">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">
                      Mẫu gạch đang xem thử
                    </span>
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

                  <h3 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
                    {selectedTile.name}
                  </h3>
                  <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                    {selectedTile.description}
                  </p>

                  {/* Warning if no 3D texture */}
                  {!selectedTile.has3DTexture && (
                    <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start gap-2.5">
                      <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <strong>Thông báo:</strong> Mẫu gạch này chưa có texture 3D bề mặt phẳng từ nhà sản xuất. Bạn vẫn có thể xem thông số kỹ thuật và đặt hàng thực tế.
                      </div>
                    </div>
                  )}

                  {/* Specs */}
                  <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <span className="text-gray-400 block font-medium">Mã sản phẩm</span>
                      <span className="font-mono font-bold text-gray-800 text-sm mt-0.5 block">
                        {selectedTile.sku}
                      </span>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <span className="text-gray-400 block font-medium">Kích thước</span>
                      <span className="font-bold text-gray-800 text-sm mt-0.5 block">
                        {selectedTile.sizeLabel}
                      </span>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <span className="text-gray-400 block font-medium">Bề mặt</span>
                      <span className="font-bold text-gray-800 text-sm mt-0.5 block truncate">
                        {selectedTile.finishLabel}
                      </span>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <span className="text-gray-400 block font-medium">Độ dày viên</span>
                      <span className="font-bold text-gray-800 text-sm mt-0.5 block">
                        {selectedTile.thicknessMm} mm
                      </span>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <span className="text-gray-400 block font-medium">Đơn giá</span>
                      <span className="font-bold text-emerald-700 text-sm mt-0.5 block">
                        {new Intl.NumberFormat('vi-VN', {
                          style: 'currency',
                          currency: 'VND',
                        }).format(selectedTile.price)}
                        /{selectedTile.unit}
                      </span>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <span className="text-gray-400 block font-medium">Xuất xứ / Shop</span>
                      <span className="font-bold text-gray-800 text-xs mt-0.5 block truncate">
                        {selectedTile.origin}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-6 flex flex-wrap gap-3">
                    {selectedTile.productId && (
                      <Link
                        to={`/products/${selectedTile.productId}`}
                        className="px-6 py-3 rounded-xl bg-gray-900 hover:bg-black text-white font-bold text-sm shadow-md transition flex items-center gap-2"
                      >
                        <ExternalLink size={16} />
                        <span>Xem trang chi tiết sản phẩm</span>
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => handleAddToCart(selectedTile, 1)}
                      className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md shadow-emerald-600/20 transition flex items-center gap-2 cursor-pointer"
                    >
                      <ShoppingCart size={16} />
                      <span>Thêm mẫu vào giỏ hàng</span>
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl overflow-hidden border border-gray-200 aspect-square max-h-[380px] bg-slate-100 flex items-center justify-center">
                  <img
                    src={selectedTile.textureUrl || selectedTile.thumbnailUrl}
                    alt={selectedTile.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
