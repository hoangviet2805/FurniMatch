import { useEffect, useState } from 'react';
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
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState({
    categoryId: 1,
    productType: '',
    length: 120,
    width: 60,
    height: 75,
    material: '',
    quantity: 1,
    description: '',
    radiusKm: 50,
    budgetMin: 0,
    budgetMax: 0,
  });
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
        productType: product.name || '',
        material: product.material || 'Gỗ tự nhiên cao cấp',
        length: variant?.length || product.length || 120,
        width: variant?.width || product.width || 60,
        height: variant?.height || product.height || 75,
        description: `Tôi muốn đặt làm theo mẫu “${product.name}”. ${product.description || ''}`,
        budgetMin: price,
        budgetMax: price ? Math.round(price * 1.2) : 0
      }));
      setSourceProduct(product.name);
    }).catch(() => setSourceProduct('Không thể tải thông tin mẫu đã chọn.'));
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    try {
      const response = await api.post('/quotationrequests', formData);
      setSuccessMessage(response.data.message || 'Đã gửi yêu cầu khảo giá thành công!');
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
    const isNumberField = ['categoryId', 'length', 'width', 'height', 'quantity', 'radiusKm', 'budgetMin', 'budgetMax'].includes(name);
    setFormData(prev => ({ ...prev, [name]: isNumberField ? Number(value) : value }));
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-emerald-100 relative">
        {onCancel && (
          <button 
            type="button" 
            onClick={onCancel} 
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 transition-colors text-lg font-bold"
          >
            ✕
          </button>
        )}
        
        <div className="mb-6">
          <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider">
            🪵 Dịch Vụ Gia Công Theo Yêu Cầu
          </span>
          <h2 className="text-2xl font-bold text-gray-900 mt-2">Đặt Đóng Nội Thất Theo Mẫu & Kích Thước Riêng</h2>
          <p className="text-sm text-gray-500 mt-1">
            Yêu cầu của bạn sẽ được gửi trực tiếp đến các xưởng mộc uy tín có nhận làm theo yêu cầu.
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
            Đang điền sẵn theo mẫu: <strong>{sourceProduct}</strong>. Bạn có thể tùy biến kích thước và chất liệu bên dưới.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
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
                Tên món đồ / Loại sản phẩm <span className="text-rose-500">*</span>
              </label>
              <input
                name="productType"
                required
                placeholder="VD: Bàn làm việc chữ L, Kệ tivi gỗ sồi..."
                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-gray-50/50"
                value={formData.productType}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                Chất liệu mong muốn <span className="text-rose-500">*</span>
              </label>
              <input
                name="material"
                required
                placeholder="VD: Gỗ Sồi tự nhiên, Gỗ MDF chống ẩm, Gỗ Óc Chó..."
                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-gray-50/50"
                value={formData.material}
                onChange={handleChange}
              />
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
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                Bán kính tìm kiếm xưởng mộc
              </label>
              <span className="text-xs font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md">
                {formData.radiusKm} km
              </span>
            </div>
            <input
              name="radiusKm"
              type="range"
              min="5"
              max="200"
              step="5"
              value={formData.radiusKm}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              onChange={handleChange}
            />
            <p className="text-xs text-gray-400 mt-1">
              Gửi yêu cầu ưu tiên tới các xưởng mộc nằm trong bán kính này tính từ vị trí của bạn (tự động mở rộng nếu không có xưởng lân cận).
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
              Mô tả chi tiết & Yêu cầu gia công
            </label>
            <textarea
              name="description"
              rows={4}
              placeholder="Mô tả kỹ hơn về mong muốn của bạn: màu sơn PU, loại tay nắm, ray trượt giảm chấn, yêu cầu lắp ráp tận nơi..."
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
                className="w-1/3 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
              >
                Hủy
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className={`${onCancel ? 'w-2/3' : 'w-full'} py-3.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-700/20 active:scale-[0.99] disabled:bg-gray-400`}
            >
              {loading ? 'Đang gửi yêu cầu...' : '🚀 Gửi Yêu Cầu Cho Các Xưởng'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RequestQuotation;
