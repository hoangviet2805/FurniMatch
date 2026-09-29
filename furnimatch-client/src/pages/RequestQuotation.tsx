import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../utils/api';

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

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
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
        setImagePreview(product.imageUrl.startsWith('http') ? product.imageUrl : `https://furnimatch-2.onrender.com${product.imageUrl.startsWith('/') ? '' : '/'}${product.imageUrl}`);
      }
    }).catch(() => setSourceProduct('Không thể tải thông tin mẫu đã chọn.'));
  }, [searchParams]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Vui lòng chọn tệp hình ảnh hợp lệ (PNG, JPG, WEBP).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('Dung lượng ảnh tối đa là 10MB.');
      return;
    }

    setErrorMessage('');
    setImageFile(file);
    const objectUrl = URL.createObjectURL(file);
    setImagePreview(objectUrl);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageFile && !imagePreview) {
      setErrorMessage('Vui lòng tải lên hình ảnh sản phẩm mẫu bạn cần xưởng làm.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const body = new FormData();
      body.append('categoryId', String(formData.categoryId));
      body.append('length', String(formData.length));
      body.append('width', String(formData.width));
      body.append('height', String(formData.height));
      body.append('quantity', String(formData.quantity));
      if (formData.budgetMin) body.append('budgetMin', String(formData.budgetMin));
      if (formData.budgetMax) body.append('budgetMax', String(formData.budgetMax));
      if (formData.description) body.append('description', formData.description.trim());
      if (imageFile) {
        body.append('imageFile', imageFile);
      } else if (imagePreview) {
        body.append('imageUrl', imagePreview);
      }

      const response = await api.post('/quotationrequests', body, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setSuccessMessage(response.data.message || 'Đã gửi yêu cầu đặt hàng tới các xưởng thành công!');
      if (onSuccess) {
        setTimeout(onSuccess, 1500);
      }
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.message || (typeof err.response?.data === 'string' ? err.response.data : 'Có lỗi xảy ra, vui lòng đăng nhập trước khi gửi yêu cầu.');
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

          {/* Phần tải ảnh sản phẩm mẫu (Thay thế tên món đồ, chất liệu) */}
          <div className="rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/30 p-5 transition-all hover:bg-emerald-50/50">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
                <span>📸</span>
                <span>Tải ảnh sản phẩm cần làm <span className="text-rose-500">*</span></span>
              </label>
              <span className="text-[11px] text-gray-500">Định dạng JPG, PNG, WEBP (Tối đa 10MB)</span>
            </div>

            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={handleImageChange}
            />

            {imagePreview ? (
              <div className="mt-3 flex flex-col sm:flex-row items-center gap-4 bg-white p-3.5 rounded-xl border border-emerald-200">
                <div className="relative group w-32 h-32 rounded-lg overflow-hidden border border-gray-200 shrink-0 bg-gray-50">
                  <img 
                    src={imagePreview} 
                    alt="Ảnh mẫu đã chọn" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 text-center sm:text-left min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {imageFile ? imageFile.name : 'Ảnh mẫu tham khảo'}
                  </p>
                  {imageFile && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {(imageFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  )}
                  <p className="text-xs text-emerald-700 font-medium mt-1">
                    ✓ Đã sẵn sàng gửi kèm yêu cầu cho các xưởng
                  </p>
                  <div className="mt-3 flex gap-2 justify-center sm:justify-start">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      Chọn ảnh khác
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      Xóa ảnh
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
                  Nhấn vào đây để tải ảnh mẫu bạn muốn đóng
                </p>
                <p className="text-xs text-gray-500 mt-1 max-w-sm">
                  Hình ảnh bản vẽ, ảnh chụp từ Pinterest, thực tế hoặc sản phẩm bạn thích để các xưởng ước lượng vật liệu và báo giá chuẩn xác nhất.
                </p>
                <button
                  type="button"
                  className="mt-3 px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors shadow-xs"
                >
                  + Tải Ảnh Sản Phẩm
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
