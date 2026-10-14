import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api, { API_URL } from '../utils/api';

interface Props {
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface Category {
  categoryId: number;
  name: string;
}

const RequestQuotation = ({ onSuccess, onCancel }: Props) => {
  const [searchParams] = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState({
    categoryId: 1,
    length: 120,
    width: 60,
    height: 75,
    quantity: 1,
    description: '',
    budgetMin: 1000000,
    budgetMax: 5000000,
  });

  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [sourceProduct, setSourceProduct] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Cấu hình thời hạn hết hạn yêu cầu (setup thời gian vs không setup thời gian)
  const [hasExpiry, setHasExpiry] = useState<boolean>(false);
  const [expiryDays, setExpiryDays] = useState<number>(3);
  const [expiryHours, setExpiryHours] = useState<number>(0);
  const [expiryMinutes, setExpiryMinutes] = useState<number>(0);
  const [activePreset, setActivePreset] = useState<string>('3d');

  useEffect(() => {
    // Load categories
    api.get('/categories')
      .then(res => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setCategories(res.data);
          setFormData(prev => ({ ...prev, categoryId: prev.categoryId || res.data[0].categoryId }));
        }
      })
      .catch(() => {});

    // Check query params if customized from product
    const productId = searchParams.get('productId');
    if (!productId) return;
    api.get(`/products/${productId}`).then(response => {
      const product = response.data;
      const variant = product.productVariants?.[0];
      const price = product.productVariants?.length ? Math.min(...product.productVariants.map((item: any) => item.price)) : product.price || 0;
      setFormData(current => ({
        ...current,
        categoryId: product.categoryId || current.categoryId,
        length: variant?.length || product.length || 120,
        width: variant?.width || product.width || 60,
        height: variant?.height || product.height || 75,
        description: `Tôi muốn đặt làm theo mẫu “${product.name}”. ${product.description || ''}`,
        budgetMin: price,
        budgetMax: price ? Math.round(price * 1.2) : 5000000
      }));
      setSourceProduct(product.name);
      if (product.imageUrl) {
        const fullUrl = product.imageUrl.startsWith('http') ? product.imageUrl : `https://furnimatch-2.onrender.com${product.imageUrl.startsWith('/') ? '' : '/'}${product.imageUrl}`;
        setImagePreviews([fullUrl]);
      }
    }).catch(() => setSourceProduct('Không thể tải thông tin mẫu đã chọn.'));
  }, [searchParams]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const validFiles: File[] = [];
    const newPreviews: string[] = [];

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        setErrorMessage('Vui lòng chọn tệp hình ảnh hợp lệ (PNG, JPG, WEBP).');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setErrorMessage(`Tệp "${file.name}" vượt quá dung lượng tối đa 10MB.`);
        return;
      }
      validFiles.push(file);
      newPreviews.push(URL.createObjectURL(file));
    }

    if (imageFiles.length + validFiles.length > 8) {
      setErrorMessage('Hệ thống hỗ trợ tải lên tối đa 8 hình ảnh mẫu.');
    } else {
      setErrorMessage('');
    }

    const combinedFiles = [...imageFiles, ...validFiles].slice(0, 8);
    const combinedPreviews = [...imagePreviews, ...newPreviews].slice(0, 8);

    setImageFiles(combinedFiles);
    setImagePreviews(combinedPreviews);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImageFiles(prev => prev.filter((_, idx) => idx !== indexToRemove));
    setImagePreviews(prev => prev.filter((_, idx) => idx !== indexToRemove));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClearAllImages = () => {
    setImageFiles([]);
    setImagePreviews([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const token = localStorage.getItem('token');
    if (!token) {
      setErrorMessage('Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn. Vui lòng đăng nhập tài khoản trước khi gửi yêu cầu.');
      return;
    }

    if (imageFiles.length === 0 && imagePreviews.length === 0) {
      setErrorMessage('Vui lòng tải lên ít nhất một hình ảnh sản phẩm mẫu bạn cần xưởng làm.');
      return;
    }

    if (hasExpiry) {
      const totalMinutes = (expiryDays * 24 * 60) + (expiryHours * 60) + expiryMinutes;
      if (totalMinutes <= 0) {
        setErrorMessage('Vui lòng chọn thời gian hết hạn lớn hơn 0 (tối thiểu 1 phút) hoặc chọn chế độ Không setup thời gian.');
        return;
      }
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const body = new FormData();
      body.append('categoryId', String(formData.categoryId || 1));
      body.append('length', String(formData.length || 120));
      body.append('width', String(formData.width || 60));
      body.append('height', String(formData.height || 75));
      body.append('quantity', String(formData.quantity || 1));
      if (formData.budgetMin) body.append('budgetMin', String(formData.budgetMin));
      if (formData.budgetMax) body.append('budgetMax', String(formData.budgetMax));
      if (formData.description) body.append('description', formData.description.trim());
      
      // Gửi cấu hình thời hạn hết hạn
      body.append('hasExpiry', String(hasExpiry));
      if (hasExpiry) {
        body.append('durationDays', String(expiryDays));
        body.append('durationHours', String(expiryHours));
        body.append('durationMinutes', String(expiryMinutes));
        const totalMinutes = (expiryDays * 24 * 60) + (expiryHours * 60) + expiryMinutes;
        const expiryDate = new Date(Date.now() + totalMinutes * 60 * 1000);
        body.append('expiredAt', expiryDate.toISOString());
      }
      
      if (imageFiles.length > 0) {
        imageFiles.forEach(file => {
          body.append('imageFiles', file);
        });
        body.append('imageFile', imageFiles[0]); // Đảm bảo tương thích ngược
      } else if (imagePreviews.length > 0) {
        imagePreviews.forEach(url => {
          body.append('imageUrls', url);
        });
        body.append('imageUrl', imagePreviews[0]);
      }

      // Dùng native fetch gửi FormData trực tiếp để trình duyệt tự sinh boundary multipart/form-data
      const response = await fetch(`${API_URL}/quotationrequests`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: body
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        let msg = '';
        if (data?.message) {
          msg = data.message;
        } else if (typeof data === 'string' && data.trim()) {
          msg = data;
        } else if (data?.detail) {
          msg = data.detail;
        } else if (data?.title) {
          msg = data.title;
          if (data?.errors) {
            const details = Object.values(data.errors).flat().join(', ');
            if (details) msg += `: ${details}`;
          }
        } else if (response.status === 401) {
          msg = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.';
        } else if (response.status === 403) {
          msg = 'Tài khoản của bạn không có quyền thực hiện thao tác này.';
        } else {
          msg = `Lỗi máy chủ (${response.status}). Vui lòng thử lại sau.`;
        }
        throw new Error(msg);
      }

      setSuccessMessage(data?.message || 'Đã gửi yêu cầu đặt hàng tới các xưởng thành công!');
      if (onSuccess) {
        setTimeout(onSuccess, 1500);
      }
    } catch (err: any) {
      console.error('Submit quotation error:', err);
      let msg = err.message || 'Có lỗi xảy ra khi gửi yêu cầu. Vui lòng thử lại sau.';
      if (err.name === 'TypeError' && err.message?.toLowerCase().includes('fetch')) {
        msg = 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau giây lát (máy chủ có thể đang tải lại).';
      }
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const isNumberField = ['categoryId', 'length', 'width', 'height', 'quantity', 'budgetMin', 'budgetMax'].includes(name);
    setFormData(prev => ({ ...prev, [name]: isNumberField ? Number(value) : value }));
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-emerald-100 relative">
        {onCancel && (
          <button 
            type="button" 
            onClick={onCancel} 
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 transition-colors text-lg font-bold cursor-pointer"
          >
            ✕
          </button>
        )}
        
        <div className="mb-6">
          <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider">
            🪵 Đặt Hàng Theo Yêu Cầu
          </span>
          <h2 className="text-2xl font-bold text-gray-900 mt-2">Đặt Đóng Nội Thất Theo Mẫu & Kích Thước Riêng</h2>
          <p className="text-sm text-gray-500 mt-1">
            Yêu cầu của bạn sẽ được gửi trực tiếp đến các xưởng mộc uy tín có nhận gia công theo yêu cầu.
          </p>
        </div>

        {successMessage && (
          <div className="mb-6 rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-800 flex items-center gap-2">
            <span className="text-xl">✓</span>
            <div>
              <p className="font-bold">Gửi yêu cầu thành công!</p>
              <p className="text-xs text-emerald-700 mt-0.5">{successMessage}</p>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 rounded-xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-800 flex items-center gap-2">
            <span className="text-xl">⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {sourceProduct && (
          <div className="mb-6 rounded-xl bg-sky-50 border border-sky-100 px-4 py-3 text-sm text-sky-800">
            Đang điền sẵn theo mẫu: <strong>{sourceProduct}</strong>. Bạn có thể tùy biến kích thước và ảnh bên dưới.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Hàng 1: Danh mục & Số lượng */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                Danh mục nội thất <span className="text-rose-500">*</span>
              </label>
              <select
                name="categoryId"
                value={formData.categoryId}
                onChange={handleChange}
                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-gray-50/50"
                required
              >
                {categories.length > 0 ? (
                  categories.map(cat => (
                    <option key={cat.categoryId} value={cat.categoryId}>
                      {cat.name}
                    </option>
                  ))
                ) : (
                  <option value={1}>Nội thất tổng hợp</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                Số lượng (cái / bộ) <span className="text-rose-500">*</span>
              </label>
              <input
                name="quantity"
                type="number"
                min="1"
                required
                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-gray-50/50"
                value={formData.quantity}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Phần tải ảnh sản phẩm mẫu (Hỗ trợ nhiều ảnh) */}
          <div className="rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/30 p-5 transition-all hover:bg-emerald-50/50">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <label className="text-xs font-bold uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
                <span>📸</span>
                <span>Tải ảnh sản phẩm cần làm <span className="text-rose-500">*</span></span>
                {imagePreviews.length > 0 && (
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full ml-1">
                    Đã chọn {imagePreviews.length}/8 ảnh
                  </span>
                )}
              </label>
              <span className="text-[11px] text-gray-500">Định dạng JPG, PNG, WEBP (Tối đa 8 ảnh, mỗi ảnh ≤ 10MB)</span>
            </div>

            <input 
              ref={fileInputRef}
              type="file" 
              multiple
              accept="image/*" 
              className="hidden" 
              onChange={handleImageChange}
            />

            {imagePreviews.length > 0 ? (
              <div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {imagePreviews.map((url, idx) => (
                    <div 
                      key={idx} 
                      className="relative group rounded-xl overflow-hidden border-2 border-emerald-200 bg-white aspect-square shadow-2xs"
                    >
                      <img 
                        src={url} 
                        alt={`Ảnh mẫu ${idx + 1}`} 
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      {/* Badge ảnh chính */}
                      {idx === 0 && (
                        <span className="absolute top-1.5 left-1.5 bg-emerald-600/90 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs">
                          ⭐ Ảnh chính
                        </span>
                      )}
                      {/* Nút xóa ảnh */}
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-rose-600/90 hover:bg-rose-700 text-white flex items-center justify-center text-xs font-bold shadow-sm transition-all opacity-80 hover:opacity-100 cursor-pointer"
                        title="Xóa ảnh này"
                      >
                        ✕
                      </button>
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/75 to-transparent p-1.5 text-center">
                        <span className="text-[10px] text-white font-medium truncate block">
                          {imageFiles[idx] ? imageFiles[idx].name : `Ảnh ${idx + 1}`}
                        </span>
                      </div>
                    </div>
                  ))}

                  {/* Nút thêm ảnh nếu chưa đủ 8 */}
                  {imagePreviews.length < 8 && (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-xl border-2 border-dashed border-emerald-300 bg-white/70 hover:bg-emerald-50 hover:border-emerald-500 transition-all flex flex-col items-center justify-center p-3 text-center cursor-pointer aspect-square group shadow-2xs"
                    >
                      <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl font-bold group-hover:scale-110 transition-transform mb-1">
                        +
                      </div>
                      <p className="text-xs font-bold text-emerald-800">Thêm ảnh khác</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">Tối đa {8 - imagePreviews.length} ảnh nữa</p>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-emerald-100 flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-800 font-medium">
                  <p className="flex items-center gap-1.5">
                    <span>💡</span>
                    <span>Bạn có thể tải thêm ảnh các góc chụp khác, chi tiết mộng gỗ, bản vẽ kích thước hoặc mẫu sơn.</span>
                  </p>
                  <div className="flex gap-2">
                    {imagePreviews.length < 8 && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-2xs"
                      >
                        + Chọn thêm ảnh
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleClearAllImages}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      Xóa tất cả
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 py-8 flex flex-col items-center justify-center cursor-pointer border border-emerald-200/60 rounded-xl bg-white/70 hover:bg-white transition-all text-center px-4"
              >
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl mb-2 shadow-xs">
                  📷
                </div>
                <p className="text-sm font-bold text-gray-800">
                  Nhấn vào đây để tải ảnh mẫu bạn muốn xưởng đóng
                </p>
                <p className="text-xs text-gray-500 mt-1 max-w-sm">
                  Có thể chọn <strong>nhiều ảnh cùng lúc</strong> (ảnh các góc, ảnh chụp Pinterest, bản vẽ tay...) để các xưởng dễ hình dung và báo giá chuẩn xác nhất.
                </p>
                <button
                  type="button"
                  className="mt-3 px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer"
                >
                  + Chọn Ảnh (Tối đa 8 ảnh)
                </button>
              </div>
            )}
          </div>

          {/* Kích thước 3 chiều */}
          <div className="p-4 bg-emerald-50/40 rounded-2xl border border-emerald-100">
            <label className="block text-xs font-bold uppercase tracking-wider text-emerald-950 mb-3 flex items-center gap-1.5">
              <span>📐</span>
              <span>Kích Thước Mong Muốn (cm)</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Dài (cm)</label>
                <input
                  name="length"
                  type="number"
                  min="1"
                  required
                  placeholder="120"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                  value={formData.length || ''}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Rộng (cm)</label>
                <input
                  name="width"
                  type="number"
                  min="1"
                  required
                  placeholder="60"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                  value={formData.width || ''}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Cao (cm)</label>
                <input
                  name="height"
                  type="number"
                  min="1"
                  required
                  placeholder="75"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                  value={formData.height || ''}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          {/* Khoảng ngân sách */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                Ngân sách dự kiến từ (VNĐ)
              </label>
              <input
                name="budgetMin"
                type="number"
                min="0"
                step="50000"
                placeholder="1.000.000"
                value={formData.budgetMin || ''}
                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-gray-50/50"
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                Ngân sách tối đa (VNĐ)
              </label>
              <input
                name="budgetMax"
                type="number"
                min="0"
                step="50000"
                placeholder="5.000.000"
                value={formData.budgetMax || ''}
                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-gray-50/50"
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Cấu hình thời hạn nhận báo giá: 2 option Setup thời gian vs Không setup thời gian */}
          <div className="p-5 bg-gradient-to-br from-emerald-50/40 via-white to-teal-50/30 rounded-2xl border border-emerald-100 shadow-2xs">
            <div className="flex items-center justify-between gap-2 mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
                <span>⏱️</span>
                <span>Thời Hạn Nhận Báo Giá Từ Xưởng <span className="text-rose-500">*</span></span>
              </label>
              <span className="text-[11px] text-gray-500 font-medium">Chọn chế độ đóng đơn</span>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Bạn có thể đặt hạn chót nhận báo giá để nhanh chóng chốt xưởng hoặc để mở cho đến khi tìm được xưởng ưng ý.
            </p>

            {/* 2 Lựa chọn chính (Radio Cards) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              {/* Option 1: Không setup thời gian */}
              <div
                onClick={() => setHasExpiry(false)}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  !hasExpiry
                    ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-200/60 shadow-xs'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                    !hasExpiry ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-gray-300'
                  }`}>
                    {!hasExpiry && <span className="text-xs font-bold leading-none">✓</span>}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                      <span>♾️</span>
                      <span>Không setup thời gian</span>
                    </h4>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                      Đơn sẽ mở liên tục cho các xưởng gửi báo giá cho đến khi bạn chọn được xưởng ưng ý.
                    </p>
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-emerald-100/60 flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                  <span>✨ Đơn mở liên tục không giới hạn</span>
                </div>
              </div>

              {/* Option 2: Setup thời gian */}
              <div
                onClick={() => {
                  setHasExpiry(true);
                  if (expiryDays === 0 && expiryHours === 0 && expiryMinutes === 0) {
                    setExpiryDays(3);
                    setActivePreset('3d');
                  }
                }}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  hasExpiry
                    ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-200/60 shadow-xs'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                    hasExpiry ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-gray-300'
                  }`}>
                    {hasExpiry && <span className="text-xs font-bold leading-none">✓</span>}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                      <span>⏳</span>
                      <span>Setup thời gian hết hạn</span>
                    </h4>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                      Chỉ định số ngày, số giờ, số phút. Hết giờ, đơn sẽ tự đóng và xưởng không thể gửi báo giá nữa.
                    </p>
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-emerald-100/60 flex items-center gap-1 text-[11px] font-semibold text-amber-700">
                  <span>⏱️ Tự động đóng đơn khi hết thời gian</span>
                </div>
              </div>
            </div>

            {/* Chi tiết cấu hình số ngày, số giờ, số phút khi chọn hasExpiry */}
            {hasExpiry && (
              <div className="mt-3 p-4 bg-white rounded-xl border border-emerald-200/80 shadow-2xs animate-in fade-in slide-in-from-top-2 duration-200 space-y-3.5">
                {/* Nút chọn nhanh (Presets) */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-2">
                    Chọn nhanh thời hạn:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: '12h', label: '12 Giờ', d: 0, h: 12, m: 0 },
                      { key: '1d', label: '1 Ngày (24h)', d: 1, h: 0, m: 0 },
                      { key: '3d', label: '3 Ngày', d: 3, h: 0, m: 0 },
                      { key: '7d', label: '7 Ngày (1 tuần)', d: 7, h: 0, m: 0 },
                      { key: '15d', label: '15 Ngày', d: 15, h: 0, m: 0 },
                    ].map(preset => (
                      <button
                        key={preset.key}
                        type="button"
                        onClick={() => {
                          setExpiryDays(preset.d);
                          setExpiryHours(preset.h);
                          setExpiryMinutes(preset.m);
                          setActivePreset(preset.key);
                        }}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                          activePreset === preset.key && expiryDays === preset.d && expiryHours === preset.h && expiryMinutes === preset.m
                            ? 'bg-emerald-600 text-white shadow-2xs scale-102'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3 ô nhập: Số ngày, Số giờ, Số phút */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                    Tùy chỉnh chi tiết (Số ngày, Số giờ, Số phút):
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <span className="text-xs text-gray-500 font-medium block mb-1">Số Ngày</span>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="365"
                          value={expiryDays}
                          onChange={(e) => {
                            setExpiryDays(Math.max(0, parseInt(e.target.value) || 0));
                            setActivePreset('custom');
                          }}
                          className="w-full px-3 py-2 pr-12 text-sm font-semibold border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-gray-50/50"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium pointer-events-none">
                          ngày
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="text-xs text-gray-500 font-medium block mb-1">Số Giờ</span>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="23"
                          value={expiryHours}
                          onChange={(e) => {
                            setExpiryHours(Math.min(23, Math.max(0, parseInt(e.target.value) || 0)));
                            setActivePreset('custom');
                          }}
                          className="w-full px-3 py-2 pr-10 text-sm font-semibold border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-gray-50/50"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium pointer-events-none">
                          giờ
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="text-xs text-gray-500 font-medium block mb-1">Số Phút</span>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="59"
                          value={expiryMinutes}
                          onChange={(e) => {
                            setExpiryMinutes(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)));
                            setActivePreset('custom');
                          }}
                          className="w-full px-3 py-2 pr-10 text-sm font-semibold border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-gray-50/50"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium pointer-events-none">
                          phút
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Banner xem trước thời gian hết hạn */}
                {(() => {
                  const totalMinutes = (expiryDays * 24 * 60) + (expiryHours * 60) + expiryMinutes;
                  if (totalMinutes <= 0) {
                    return (
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                        <span>⚠️</span>
                        <span>Vui lòng chọn ít nhất 1 phút cho thời hạn nhận báo giá.</span>
                      </div>
                    );
                  }
                  const futureDate = new Date(Date.now() + totalMinutes * 60 * 1000);
                  const timeStr = futureDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                  const dateStr = futureDate.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
                  return (
                    <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                      <span className="text-base shrink-0">⏳</span>
                      <div>
                        <p className="font-semibold">
                          Đơn sẽ tự động đóng vào lúc: <strong className="text-amber-950 font-bold">{timeStr} — {dateStr}</strong>
                        </p>
                        <p className="text-[11px] text-amber-700 mt-0.5">
                          (Sau {expiryDays > 0 ? `${expiryDays} ngày ` : ''}{expiryHours > 0 ? `${expiryHours} giờ ` : ''}{expiryMinutes > 0 ? `${expiryMinutes} phút` : ''} kể từ lúc tạo). Hết thời gian này xưởng sẽ không thể gửi báo giá.
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
              Ghi chú thêm & Chi tiết yêu cầu (Nếu có)
            </label>
            <textarea
              name="description"
              rows={4}
              placeholder="Bạn có yêu cầu đặc biệt gì không? Ví dụ: chất liệu gỗ tự nhiên hay gỗ công nghiệp, màu sơn, tay nắm kim loại, vận chuyển tận nơi..."
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-gray-50/50"
              value={formData.description}
              onChange={handleChange}
            />
          </div>

          <div className="flex gap-4 pt-2">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="w-1/3 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Hủy
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className={`${onCancel ? 'w-2/3' : 'w-full'} py-3.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-700/20 active:scale-[0.99] disabled:bg-gray-400 cursor-pointer`}
            >
              {loading ? 'Đang tải ảnh và gửi yêu cầu...' : '🚀 Gửi Yêu Cầu Cho Các Xưởng'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RequestQuotation;
