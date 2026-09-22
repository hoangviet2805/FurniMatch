import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { demoProducts, productImageUrl } from '../utils/demoProducts';

const SpacePlanner = () => {
  const [dimensions, setDimensions] = useState<{
    length: number | '';
    width: number | '';
    height: number | '';
  }>({
    length: 400,
    width: 300,
    height: 280,
  });

  const [results, setResults] = useState<any[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const update = (key: 'length' | 'width' | 'height', value: string) => {
    if (value.trim() === '') {
      setDimensions(current => ({ ...current, [key]: '' }));
      return;
    }
    const num = Number(value);
    if (!isNaN(num)) {
      setDimensions(current => ({ ...current, [key]: Math.max(0, num) }));
    }
  };

  const numLength = typeof dimensions.length === 'number' ? dimensions.length : 0;
  const numWidth = typeof dimensions.width === 'number' ? dimensions.width : 0;
  const numHeight = typeof dimensions.height === 'number' ? dimensions.height : 0;

  const area = ((numLength * numWidth) / 10000).toFixed(1);
  const volume = ((numLength * numWidth * numHeight) / 1000000).toFixed(1);

  const findProducts = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await api.get('/products', {
        params: {
          maxLength: numLength > 0 ? numLength : undefined,
          maxWidth: numWidth > 0 ? numWidth : undefined,
          maxHeight: numHeight > 0 ? numHeight : undefined,
        },
      });
      setResults(response.data.slice(0, 8));
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-3xl">
        <p className="uppercase text-sm tracking-wider font-semibold text-emerald-600">Công cụ thông minh</p>
        <h1 className="text-3xl font-bold text-gray-900 mt-2">Tính không gian nội thất</h1>
        <p className="mt-3 text-gray-600">
          Nhập kích thước khu vực dự kiến đặt đồ. FurniMatch sẽ gợi ý các mẫu có kích thước phù hợp.
        </p>
      </div>

      <div className="mt-8 grid lg:grid-cols-[400px_1fr] gap-8">
        <form onSubmit={findProducts} className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 h-fit">
          <h2 className="font-bold text-gray-900 text-lg">Kích thước khu vực (cm)</h2>
          <div className="mt-5 space-y-4">
            {([
              ['length', 'Chiều dài'],
              ['width', 'Chiều rộng'],
              ['height', 'Chiều cao'],
            ] as const).map(([key, label]) => (
              <label key={key} className="block">
                <span className="text-sm font-medium text-gray-700">{label}</span>
                <div className="mt-1 relative">
                  <input
                    value={dimensions[key]}
                    type="number"
                    min="0"
                    placeholder="Nhập kích thước..."
                    onChange={event => update(key, event.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 pr-12 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-gray-900"
                  />
                  <span className="absolute right-4 top-3 text-gray-400 text-sm font-medium">cm</span>
                </div>
              </label>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3.5">
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Diện tích sàn</p>
              <p className="font-extrabold text-emerald-900 text-lg mt-1">{area} m²</p>
            </div>
            <div className="rounded-xl bg-sky-50 border border-sky-100 p-3.5">
              <p className="text-xs font-semibold text-sky-700 uppercase tracking-wide">Thể tích</p>
              <p className="font-extrabold text-sky-900 text-lg mt-1">{volume} m³</p>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 py-3.5 font-bold text-white shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
          >
            {loading ? 'Đang tìm mẫu...' : 'Tìm sản phẩm phù hợp'}
          </button>
          <p className="mt-3 text-xs text-gray-400 text-center">Gợi ý dựa trên kích thước sản phẩm do xưởng cung cấp.</p>
        </form>

        <section>
          {!submitted ? (
            <div className="rounded-2xl bg-gradient-to-br from-sky-50 to-emerald-50 p-6 border border-emerald-100/50">
              <div className="flex gap-4 items-center">
                <div className="text-5xl">📐</div>
                <div>
                  <h2 className="font-bold text-gray-800 text-lg">Thử với phòng khách mẫu</h2>
                  <p className="mt-1 text-sm text-gray-600">
                    Kích thước mặc định 4 × 3 × 2.8 m — phù hợp cho một góc tiếp khách nhỏ gọn.
                  </p>
                </div>
              </div>
              <h3 className="mt-7 text-sm font-bold text-gray-700">Một vài mẫu kích thước phổ biến</h3>
              <div className="mt-3 grid sm:grid-cols-3 gap-3">
                {demoProducts.slice(0, 3).map(product => (
                  <div key={product.productId} className="rounded-xl overflow-hidden bg-white shadow-sm border border-gray-100">
                    <img
                      src={productImageUrl(product.productImages[0].imageUrl)}
                      alt={product.name}
                      className="h-24 w-full object-cover"
                    />
                    <div className="p-3">
                      <p className="text-sm font-semibold text-gray-900 truncate">{product.name}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {product.productVariants[0].length} × {product.productVariants[0].width} cm
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-5 text-xs text-gray-400">Nhấn “Tìm sản phẩm phù hợp” để dùng kích thước thực tế từ hệ thống.</p>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-end mb-5">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Mẫu có thể phù hợp</h2>
                  <p className="text-sm text-gray-500 mt-1">Tìm thấy {results.length} gợi ý đầu tiên</p>
                </div>
                <Link to="/products" className="text-sm font-semibold text-emerald-600 hover:underline">
                  Xem toàn bộ
                </Link>
              </div>
              {results.length ? (
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {results.map(product => {
                    const image = product.productImages?.[0]?.imageUrl;
                    return (
                      <Link
                        to={`/products/${product.productId}`}
                        key={product.productId}
                        className="rounded-xl overflow-hidden bg-white border border-gray-100 hover:shadow-md transition-shadow group"
                      >
                        <div className="h-32 bg-gray-100">
                          {image ? (
                            <img
                              src={productImageUrl(image)}
                              alt={product.name}
                              className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="h-full flex items-center justify-center text-gray-400">Không có ảnh</div>
                          )}
                        </div>
                        <div className="p-3">
                          <h3 className="font-semibold text-sm text-gray-900 truncate">{product.name}</h3>
                          <p className="mt-1 text-xs text-gray-500">
                            {product.length && product.width
                              ? `${product.length} × ${product.width} × ${product.height ?? '-'} cm`
                              : product.customSizeSupported
                              ? 'Hỗ trợ may đo'
                              : 'Xem kích thước chi tiết'}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl bg-white border border-gray-100 p-10 text-center text-gray-500">
                  Chưa có mẫu nào có thông tin kích thước phù hợp. Hãy thử tăng kích thước khu vực hoặc xem các sản phẩm may đo.
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
};

export default SpacePlanner;
