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
