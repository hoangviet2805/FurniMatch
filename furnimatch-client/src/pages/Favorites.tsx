import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { getFavoriteIds, toggleFavorite } from '../utils/favorites';
import { getComparisonIds, toggleComparison } from '../utils/comparison';

const money = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

const Favorites = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('recent');
  const [comparisonIds, setComparisonIds] = useState<number[]>(getComparisonIds());

  useEffect(() => {
    const load = async () => {
      const ids = getFavoriteIds();
      if (!ids.length) { setLoading(false); return; }
      const responses = await Promise.allSettled(ids.map(id => api.get(`/products/${id}`)));
      setProducts(responses.filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled').map(result => result.value.data));
      setLoading(false);
    };
    load();
  }, []);

  const remove = (id: number) => {
    toggleFavorite(id);
    setProducts(current => current.filter(product => product.productId !== id));
  };
  const toggleCompare = (id: number) => {
    const result = toggleComparison(id);
    if (result.limitReached) { alert('Bạn chỉ có thể so sánh tối đa 3 sản phẩm.'); return; }
    setComparisonIds(getComparisonIds());
  };
  const shownProducts = useMemo(() => products.filter(product => product.name.toLowerCase().includes(query.toLowerCase()) || (product.seller?.shopName || '').toLowerCase().includes(query.toLowerCase())).sort((a, b) => {
    const aPrice = a.productVariants?.length ? Math.min(...a.productVariants.map((item: any) => item.price)) : a.price || 0;
    const bPrice = b.productVariants?.length ? Math.min(...b.productVariants.map((item: any) => item.price)) : b.price || 0;
    return sort === 'price-asc' ? aPrice - bPrice : sort === 'price-desc' ? bPrice - aPrice : 0;
  }), [products, query, sort]);

  return <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <div className="rounded-2xl bg-gradient-to-r from-rose-50 to-amber-50 border border-rose-100 p-6 sm:p-8 mb-8 flex flex-col sm:flex-row justify-between gap-5"><div><p className="text-sm font-semibold text-rose-600 uppercase tracking-wider">Bộ sưu tập cá nhân</p><h1 className="text-3xl font-bold text-gray-900 mt-1">Sản phẩm yêu thích</h1><p className="text-gray-600 mt-2">Lưu mẫu, tìm nhanh và đưa các lựa chọn tốt nhất vào bảng so sánh.</p></div><div className="flex gap-3 self-start"><Link to="/compare" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">So sánh ({comparisonIds.length})</Link></div></div>
    {loading ? <div className="py-20 text-center text-gray-500">Đang tải danh sách...</div> : products.length === 0 ? <div className="text-center py-20 bg-white rounded-2xl border border-gray-100"><div className="text-4xl mb-4">♡</div><p className="font-semibold text-gray-800">Bạn chưa lưu sản phẩm nào</p><Link to="/products" className="inline-block mt-4 text-emerald-600 font-medium">Khám phá sản phẩm</Link></div> : <><div className="flex flex-col sm:flex-row gap-3 mb-6"><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm trong danh sách yêu thích..." className="flex-1 rounded-xl border border-gray-200 px-4 py-3 outline-none focus:ring-2 focus:ring-rose-300" /><select value={sort} onChange={event => setSort(event.target.value)} className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm"><option value="recent">Mới lưu gần đây</option><option value="price-asc">Giá thấp đến cao</option><option value="price-desc">Giá cao đến thấp</option></select></div><p className="mb-4 text-sm text-gray-500">Hiển thị {shownProducts.length}/{products.length} sản phẩm</p><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">{shownProducts.map(product => {
      const lowest = product.productVariants?.length ? Math.min(...product.productVariants.map((variant: any) => variant.price)) : product.price;
      const image = product.productImages?.[0]?.imageUrl;
      return <div key={product.productId} className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm group relative"><Link to={`/products/${product.productId}`} className="block"><div className="h-48 bg-gray-100">{image ? <img src={image.startsWith('http') ? image : `http://localhost:5234${image}`} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" /> : <div className="h-full flex items-center justify-center text-gray-400">Không có ảnh</div>}</div><div className="p-4"><p className="text-xs text-gray-500">{product.seller?.shopName || 'Nhà sản xuất'}</p><h2 className="font-semibold text-gray-900 mt-1 line-clamp-2 min-h-10">{product.name}</h2><p className="text-emerald-600 font-bold mt-3">{lowest ? money(lowest) : 'Liên hệ'}</p></div></Link><div className="px-4 pb-4"><button onClick={() => toggleCompare(product.productId)} className="w-full rounded-lg border border-emerald-200 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50">{comparisonIds.includes(product.productId) ? '✓ Đang so sánh' : '+ Thêm so sánh'}</button></div><button onClick={() => remove(product.productId)} className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white shadow text-rose-600" aria-label="Bỏ yêu thích">♥</button></div>;
    })}</div></>}
  </div>;
};

export default Favorites;
