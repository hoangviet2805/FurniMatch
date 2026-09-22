import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { getComparisonIds, toggleComparison, setComparisonProductIds, clearComparison } from '../utils/comparison';

const money = (value?: number) => value ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value) : 'Liên hệ';
const firstPrice = (product: any) => product.productVariants?.length ? Math.min(...product.productVariants.map((variant: any) => variant.price)) : product.price;
const imageUrl = (url?: string) => url?.startsWith('http') ? url : `http://localhost:5234${url}`;

const CompareProducts = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const ids = getComparisonIds();
    if (!ids.length) {
      setProducts([]);
      setLoading(false);
      return;
    }

    const results = await Promise.allSettled(ids.map(id => api.get(`/products/${id}`)));
    const loaded = results
      .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
      .map(result => result.value.data);

    // Đồng bộ lại danh sách ID hợp lệ nếu có sản phẩm đã bị xóa hoặc không tải được
    const validIds = loaded.map((p: any) => p.productId);
    if (validIds.length !== ids.length) {
      setComparisonProductIds(validIds);
    }

    setProducts(loaded);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const remove = (id: number) => {
    toggleComparison(id);
    setProducts(current => current.filter(product => product.productId !== id));
  };

  const handleClearAll = () => {
    clearComparison();
    setProducts([]);
  };

  const rows = [
    ['Giá khởi điểm', (product: any) => money(firstPrice(product))],
    ['Danh mục', (product: any) => product.category?.name || '—'],
    ['Xưởng sản xuất', (product: any) => product.seller?.shopName || product.seller?.fullName || '—'],
    ['Đặt theo kích thước', (product: any) => product.customSizeSupported ? 'Có hỗ trợ' : 'Không hỗ trợ'],
    ['Số lựa chọn', (product: any) => `${product.productVariants?.length || 0} biến thể`],
    ['Thời gian sản xuất', (product: any) => {
      const days = product.productVariants?.map((variant: any) => variant.productionDays).filter(Boolean);
      return days?.length ? `${Math.min(...days)}–${Math.max(...days)} ngày` : 'Liên hệ';
    }]
  ];

  if (loading) return <div className="max-w-7xl mx-auto px-4 py-20 text-center text-gray-500">Đang tải danh sách so sánh...</div>;

  if (!products.length) return (
    <div className="max-w-3xl mx-auto px-4 py-20 text-center">
      <div className="text-5xl">⚖️</div>
      <h1 className="text-2xl font-bold text-gray-900 mt-4">Chưa có sản phẩm để so sánh</h1>
      <p className="text-gray-500 mt-2">Mở trang chi tiết sản phẩm và chọn “Thêm so sánh”.</p>
      <Link to="/products" className="inline-block mt-5 text-emerald-600 font-semibold hover:underline">
        Khám phá sản phẩm
      </Link>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">So sánh sản phẩm</h1>
          <p className="text-gray-500 mt-2">
            Đang so sánh {products.length}/3 sản phẩm. Đặt tối đa ba mẫu cạnh nhau để chọn dễ hơn.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {products.length > 0 && (
            <button
              onClick={handleClearAll}
              className="text-sm text-rose-600 hover:text-rose-700 hover:underline font-medium cursor-pointer"
            >
              Xóa tất cả
            </button>
          )}
          <Link
            to="/products"
            className="inline-flex items-center px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold text-sm transition-colors border border-emerald-200"
          >
            + Thêm sản phẩm
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full min-w-[680px] text-sm">
          <thead>
            <tr>
              <th className="w-44 text-left bg-gray-50 p-4 text-gray-500 font-medium border-b border-gray-100">Tiêu chí</th>
              {products.map(product => (
                <th key={product.productId} className="p-4 min-w-56 align-top border-b border-gray-100">
                  <img
                    className="h-36 w-full rounded-lg object-cover bg-gray-100"
                    src={product.productImages?.[0] ? imageUrl(product.productImages[0].imageUrl) : undefined}
                    alt=""
                  />
                  <Link
                    to={`/products/${product.productId}`}
                    className="block text-left mt-3 font-bold text-gray-900 hover:text-emerald-600 line-clamp-2"
                  >
                    {product.name}
                  </Link>
                  <button
                    onClick={() => remove(product.productId)}
                    className="mt-2 text-xs text-rose-600 hover:underline cursor-pointer"
                  >
                    Bỏ khỏi so sánh
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, value]) => (
              <tr key={label as string} className="border-t border-gray-100">
                <td className="p-4 bg-gray-50 font-medium text-gray-600">{label as string}</td>
                {products.map(product => (
                  <td key={product.productId} className="p-4 text-gray-800">
                    {(value as (item: any) => string)(product)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CompareProducts;
