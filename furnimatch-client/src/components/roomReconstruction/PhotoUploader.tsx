import { useState, useRef, type DragEvent, type ChangeEvent } from 'react';
import {
  UploadCloud,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Trash2,
  Sparkles,
  Camera,
  ArrowRight,
  Eye,
} from 'lucide-react';
import {
  validateImageFile,
  readFileAsDataUrl,
  analyzeRoomPhoto,
  type ImageValidationError,
} from '../../services/imageAnalysisService';
import { SAMPLE_ROOMS } from '../../data/sampleRooms';
import type { PhotoAnalysisResult, SampleRoomPhoto } from '../../types/roomReconstruction';

interface PhotoUploaderProps {
  onAnalysisComplete: (result: PhotoAnalysisResult) => void;
  onSelectSampleRoom?: (sample: SampleRoomPhoto) => void;
}

export const PhotoUploader = ({
  onAnalysisComplete,
  onSelectSampleRoom,
}: PhotoUploaderProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageMeta, setImageMeta] = useState<{ width: number; height: number; sizeMb: string } | null>(null);

  const [hasConsented, setHasConsented] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'analyzing' | 'success' | 'error'>('idle');
  const [progressPercent, setProgressPercent] = useState(0);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // File selection handling
  const handleFile = async (file: File) => {
    setErrorMessage(null);
    const validationError: ImageValidationError | null = validateImageFile(file);
    if (validationError) {
      setErrorMessage(validationError.message);
      setStatus('error');
      return;
    }

    try {
      setSelectedFile(file);
      setStatus('uploading');
      setProgressPercent(20);
      setProcessingStep('Đang tải ảnh và đọc dữ liệu tệp...');

      const dataUrl = await readFileAsDataUrl(file);
      setPreviewUrl(dataUrl);

      // Read dimensions
      const img = new Image();
      img.src = dataUrl;
      await new Promise((res) => {
        img.onload = () => {
          setImageMeta({
            width: img.naturalWidth,
            height: img.naturalHeight,
            sizeMb: (file.size / (1024 * 1024)).toFixed(2),
          });
          res(true);
        };
      });

      setStatus('idle');
      setProgressPercent(0);
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err.message || 'Lỗi khi đọc tệp ảnh.');
    }
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setImageMeta(null);
    setStatus('idle');
    setErrorMessage(null);
    setProgressPercent(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleStartAnalysis = async () => {
    if (!previewUrl || !selectedFile) return;

    if (!hasConsented) {
      setErrorMessage('Vui lòng đánh dấu xác nhận đồng ý xử lý ảnh trước khi tiếp tục.');
      return;
    }

    try {
      setStatus('analyzing');
      setErrorMessage(null);

      // Simulated progressive steps for delightful UX feedback
      setProgressPercent(25);
      setProcessingStep('Bước 1/3: Khởi tạo mô hình xử lý hình ảnh...');
      await new Promise((r) => setTimeout(r, 450));

      setProgressPercent(55);
      setProcessingStep('Bước 2/3: Phân tích điểm tụ, ranh giới chân tường và mặt sàn...');
      await new Promise((r) => setTimeout(r, 600));

      setProgressPercent(85);
      setProcessingStep('Bước 3/3: Trích xuất màu sơn tường & ước tính kích thước 3D...');
      const analysis = await analyzeRoomPhoto(previewUrl, selectedFile.name, selectedFile.size);

      setProgressPercent(100);
      setProcessingStep('Hoàn tất nhận diện không gian!');
      setStatus('success');

      setTimeout(() => {
        onAnalysisComplete(analysis);
      }, 500);
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err.message || 'Không thể phân tích ảnh phòng. Vui lòng thử lại với góc chụp rõ hơn.');
    }
  };

  const handleSelectSample = (sample: SampleRoomPhoto) => {
    if (onSelectSampleRoom) {
      onSelectSampleRoom(sample);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 animate-fadeIn">
      {/* SECTION 1: HEADER & GUIDELINES BANNER */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white p-6 sm:p-8 border border-emerald-500/30 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold uppercase tracking-wider mb-3">
            <Camera size={13} />
            <span>Upload Room Photo → 3D Room Reconstruction</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
            Thiết kế phòng của bạn từ ảnh thực tế
          </h1>
          <p className="mt-3 text-slate-300 text-sm sm:text-base leading-relaxed">
            Chụp hoặc tải ảnh căn phòng của bạn (phòng khách, phòng ngủ, studio). Hệ thống sẽ phân tích phối cảnh, tự động dựng lại không gian 3D theo kích thước thực, cho phép bạn lát gạch Furni Match và sắp đặt nội thất ngay lập tức.
          </p>
        </div>

        {/* Photography Tips Pills */}
        <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-300">
          <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block font-semibold">Thấy rõ mặt sàn</strong>
              <span>Góc chụp bao quát, thấy rõ ít nhất 60% diện tích sàn và chân tường.</span>
            </div>
          </div>
          <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block font-semibold">Chụp ngang tầm mắt</strong>
              <span>Giữ điện thoại thẳng ở độ cao 1.2m - 1.5m, tránh góc chụp quá nghiêng.</span>
            </div>
          </div>
          <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block font-semibold">Đủ ánh sáng phòng</strong>
              <span>Bật đèn phòng hoặc tận dụng ánh sáng cửa sổ để hệ thống nhận diện màu chuẩn.</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: UPLOAD DROPZONE / PREVIEW */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-md p-6 sm:p-8">
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp"
          className="hidden"
          onChange={onInputChange}
        />

        {!previewUrl ? (
          // Empty State Dropzone
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl p-8 sm:p-14 flex flex-col items-center justify-center text-center cursor-pointer transition duration-200 ${
              isDragging
                ? 'border-emerald-500 bg-emerald-50/60 scale-[1.01]'
                : 'border-slate-300 hover:border-emerald-500 bg-slate-50/50 hover:bg-emerald-50/20'
            }`}
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4 shadow-sm">
              <UploadCloud size={36} />
            </div>

            <h3 className="text-lg sm:text-xl font-black text-gray-900">
              Kéo thả ảnh phòng vào đây hoặc <span className="text-emerald-600 underline">chọn từ thiết bị</span>
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-gray-500 max-w-md">
              Hỗ trợ định dạng <strong>JPG, JPEG, PNG, WebP</strong>. Dung lượng tối đa 15 MB. Khuyến nghị độ phân giải từ 1280×720px trở lên.
            </p>

            <button
              type="button"
              className="mt-6 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 transition flex items-center gap-2 cursor-pointer"
            >
              <ImageIcon size={16} />
              <span>Duyệt ảnh từ máy</span>
            </button>
          </div>
        ) : (
          // Selected Preview State
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Eye size={18} className="text-emerald-600" />
                  <span>Ảnh phòng đã chọn</span>
                </h3>
                {imageMeta && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {selectedFile?.name} • {imageMeta.width} × {imageMeta.height} px • {imageMeta.sizeMb} MB
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={status === 'analyzing'}
                  className="px-3.5 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw size={14} />
                  <span>Thay ảnh khác</span>
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={status === 'analyzing'}
                  className="px-3.5 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Trash2 size={14} />
                  <span>Xóa ảnh</span>
                </button>
              </div>
            </div>

            {/* Photo Preview Container */}
            <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-gray-200 shadow-inner max-h-[460px] flex items-center justify-center">
              <img
                src={previewUrl}
                alt="Room Preview"
                className="w-full h-auto max-h-[460px] object-contain"
              />

              {/* Processing Overlay */}
              {status === 'analyzing' && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-white text-center">
                  <div className="w-14 h-14 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4" />
                  <p className="text-base font-bold">{processingStep}</p>
                  <p className="text-xs text-slate-300 mt-1 max-w-md">
                    Hệ thống đang trích xuất điểm tụ phối cảnh, nhận diện vùng sàn và tự động tính toán kích thước phòng...
                  </p>
                  <div className="w-64 h-2 bg-slate-700 rounded-full overflow-hidden mt-4">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Privacy Consent Checkbox */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs flex items-start gap-3">
              <input
                id="privacy-consent"
                type="checkbox"
                checked={hasConsented}
                onChange={(e) => setHasConsented(e.target.checked)}
                className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer h-4 w-4"
              />
              <label htmlFor="privacy-consent" className="text-gray-700 leading-relaxed cursor-pointer select-none">
                <span className="font-bold text-gray-900">Cam kết bảo mật & quyền sở hữu ảnh cá nhân:</span> Tôi xác nhận ảnh chụp thuộc quyền sở hữu của tôi và cho phép phân tích hình học trong trình duyệt để tái tạo không gian 3D. Furni Match cam kết không tự ý gửi hoặc chia sẻ ảnh cá nhân cho bất kỳ bên thứ ba nào.
              </label>
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                <AlertCircle size={16} className="text-red-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Primary Action Button */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleStartAnalysis}
                disabled={status === 'analyzing' || !hasConsented}
                className="px-8 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm shadow-xl shadow-emerald-600/30 transition flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles size={16} />
                <span>Bắt đầu phân tích & Tái tạo 3D</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 3: QUICK SAMPLE ROOMS CAROUSEL */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-md p-6 sm:p-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Sparkles size={18} className="text-amber-500" />
              <span>Chưa có ảnh sẵn? Thử ngay với các phòng mẫu thực tế</span>
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Nhấp vào một trong các phòng mẫu dưới đây để trải nghiệm tức thì toàn bộ quy trình tái tạo 3D và thử gạch:
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {SAMPLE_ROOMS.map((sample) => (
            <div
              key={sample.id}
              onClick={() => handleSelectSample(sample)}
              className="group border border-gray-200 hover:border-emerald-500 rounded-2xl overflow-hidden p-3 bg-slate-50/50 hover:bg-emerald-50/30 transition duration-200 cursor-pointer shadow-sm hover:shadow-md flex flex-col"
            >
              <div className="relative rounded-xl overflow-hidden bg-slate-900 aspect-[16/10] mb-3">
                <img
                  src={sample.thumbnailUrl}
                  alt={sample.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                />
                <div className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-sm text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-md border border-white/10">
                  {sample.defaultDimensions.widthMeters}m × {sample.defaultDimensions.lengthMeters}m
                </div>
              </div>

              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-gray-900 text-sm group-hover:text-emerald-700 transition">
                    {sample.title}
                  </h4>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{sample.subtitle}</p>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-200/60 flex items-center justify-between text-xs text-emerald-700 font-bold">
                  <span>Trải nghiệm phòng này</span>
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
