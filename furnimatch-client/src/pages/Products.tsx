import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import { isFavorite, toggleFavorite } from '../utils/favorites';

const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryIdParam = searchParams.get('categoryId');
  
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState(searchParams.get('search') ?? '');
  const [sort, setSort] = useState(searchParams.get('sort') ?? 'diverse');
  const [favorites, setFavorites] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 16;
  const [minutesToNextHour, setMinutesToNextHour] = useState<number>(60 - new Date().getMinutes());

  useEffect(() => {
    setFavorites(JSON.parse(localStorage.getItem('favoriteProductIds') ?? '[]'));
    const updateMinutes = () => {
      const now = new Date();
      setMinutesToNextHour(60 - now.getMinutes());
    };
    updateMinutes();
    const interval = setInterval(updateMinutes, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Fetch categories for sidebar
    api.get('/categories')
      .then(res => setCategories(res.data))
      .catch(err => console.error('Error fetching categories:', err));
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [categoryIdParam, keyword, sort]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (categoryIdParam) params.set('categoryId', categoryIdParam);
      if (keyword.trim()) params.set('search', keyword.trim());
      if (sort) params.set('sort', sort);
      // Đồng bộ theo mốc giờ hiện tại để backend và client tự động luân phiên đổi mới mỗi 1 tiếng
      params.set('_h', Math.floor(Date.now() / 3600000).toString());
      const url = `/products?${params.toString()}`;
      const response = await api.get(url);
      setProducts(response.data);
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  }, [categoryIdParam, keyword, sort]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Tự động làm mới danh sách sản phẩm khi sang khung giờ mới (mỗi 1 tiếng)
  useEffect(() => {
    const now = new Date();
    const msToNextHour = (60 - now.getMinutes()) * 60000 - now.getSeconds() * 1000 - now.getMilliseconds();

    let intervalId: any;
    const timeoutId = setTimeout(() => {
      fetchProducts();
      intervalId = setInterval(() => {
        fetchProducts();
      }, 3600000);
    }, Math.max(1000, msToNextHour));

    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [fetchProducts]);

  const handleCategoryClick = (id: number | null) => {
    const next = new URLSearchParams(searchParams);
    if (id === null) next.delete('categoryId'); else next.set('categoryId', id.toString());
    setSearchParams(next);
  };

  const updateSearch = (value: string) => {
    setKeyword(value);
    const next = new URLSearchParams(searchParams);
    if (value.trim()) next.set('search', value); else next.delete('search');
    setSearchParams(next, { replace: true });
  };

  const updateSort = (value: string) => {
    setSort(value);
    const next = new URLSearchParams(searchParams);
    if (value !== 'diverse') next.set('sort', value); else next.delete('sort');
    setSearchParams(next, { replace: true });
  };

  const toggleSaved = (id: number) => {
    toggleFavorite(id);
    setFavorites(JSON.parse(localStorage.getItem('favoriteProductIds') ?? '[]'));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row gap-8">
        
        {/* Sidebar */}
        <div className="w-full md:w-64 shrink-0">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 sticky top-24">
            <h2 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Danh Mục</h2>
            <ul className="space-y-2">
              <li>
                <button 
                  onClick={() => handleCategoryClick(null)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${!categoryIdParam ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-gray-600 hover:bg-gray-50 hover:text-emerald-600'}`}
                >
                  Tất cả sản phẩm
                </button>
              </li>
              {categories.map(cat => (
                <li key={cat.categoryId}>
                  <button 
                    onClick={() => handleCategoryClick(cat.categoryId)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${categoryIdParam === cat.categoryId.toString() ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-gray-600 hover:bg-gray-50 hover:text-emerald-600'}`}
                  >
                    {cat.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row justify-between gap-4 sm:items-end mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {categoryIdParam 
                  ? categories.find(c => c.categoryId.toString() === categoryIdParam)?.name || 'Danh sách Sản phẩm' 
                  : 'Tất cả Sản phẩm'}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <p className="text-gray-500 text-sm">{products.length} sản phẩm phù hợp (16 sản phẩm/trang)</p>
                {sort === 'diverse' && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Đa dạng xưởng (đổi mới sau {minutesToNextHour}p)
                  </span>
                )}
              </div>
            </div>
            <select 
              value={sort} 
              onChange={event => updateSort(event.target.value)} 
              className="rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
            >
              <option value="diverse">Đa dạng xưởng (Làm mới mỗi 1h)</option>
              <option value="newest">Mới nhất</option>
              <option value="price-asc">Giá thấp đến cao</option>
              <option value="price-desc">Giá cao đến thấp</option>
              <option value="oldest">Cũ nhất</option>
            </select>
          </div>
          <div className="mb-6 relative"><input value={keyword} onChange={event => updateSearch(event.target.value)} placeholder="Tìm theo tên sản phẩm, mô tả hoặc xưởng..." className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-4 pr-10 focus:outline-none focus:ring-2 focus:ring-emerald-500" />{keyword && <button onClick={() => updateSearch('')} className="absolute right-3 top-3 text-gray-400 hover:text-gray-700" aria-label="Xóa tìm kiếm">×</button>}</div>
          
          {loading ? (
            <div className="text-center py-20 text-gray-500">Đang tải sản phẩm...</div>
          ) : products.length === 0 ? (
            <div className="text-center text-gray-500 py-16 bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="text-4xl mb-4">🪑</div>
              <p>Chưa có sản phẩm nào trong danh mục này.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((product: any) => (
                <div key={product.productId} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group flex flex-col relative">
                  <button onClick={() => toggleSaved(product.productId)} className={`absolute z-10 top-3 right-3 w-9 h-9 rounded-full bg-white/95 shadow-sm text-xl ${favorites.includes(product.productId) || isFavorite(product.productId) ? 'text-rose-600' : 'text-gray-500 hover:text-rose-600'}`} aria-label="Lưu sản phẩm">{favorites.includes(product.productId) || isFavorite(product.productId) ? '♥' : '♡'}</button>
                  <Link to={`/products/${product.productId}`} className="flex flex-col flex-1">
                  <div className="h-48 bg-gray-100 relative overflow-hidden shrink-0">
                    {product.productImages && product.productImages.length > 0 ? (
                      (() => {
                        const thumb = product.productImages.find((img: any) => img.isThumbnail) || product.productImages[0];
                        const imgUrl = thumb.imageUrl.startsWith('http') ? thumb.imageUrl : `http://localhost:5234${thumb.imageUrl.startsWith('/') ? '' : '/'}${thumb.imageUrl}`;
                        return (
                          <img 
                            src={imgUrl} 
                            alt={product.name} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=300';
                            }}
                          />
                        );
                      })()
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">Không có ảnh</div>
                    )}
                    {product.customSizeSupported && (
                      <div className="absolute top-2 right-2 bg-emerald-500 text-white text-xs font-bold px-2 py-1 rounded shadow-sm">
                        May đo
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex flex-col flex-1">
                    <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m3-4h1m-1 4h1m-5 8h8" /></svg>
                      {product.seller?.shopName || 'Nhà sản xuất'}
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 flex-1 group-hover:text-emerald-600 transition-colors">{product.name}</h3>
                    <div className="mt-3 flex items-end justify-between">
                      <div className="text-emerald-600 font-bold text-lg">
                        {product.productVariants && product.productVariants.length > 0 
                          ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Math.min(...product.productVariants.map((v: any) => v.price)))
                          : 'Liên hệ'}
                      </div>
                    </div>
                  </div></Link>
                </div>
              ))}
            </div>
          )}
          
          {products.length > 0 && (
            <div className="flex justify-center items-center gap-4 mt-12 mb-8">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1 || Math.ceil(products.length / ITEMS_PER_PAGE) <= 1}
                className="px-5 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-emerald-600 disabled:opacity-50 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed font-semibold shadow-sm transition-all"
              >
                Trước
              </button>
              <div className="flex items-center justify-center min-w-[80px] px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 text-gray-700 font-medium">
                {currentPage} / {Math.max(1, Math.ceil(products.length / ITEMS_PER_PAGE))}
              </div>
              <button 
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(products.length / ITEMS_PER_PAGE), p + 1))}
                disabled={currentPage === Math.ceil(products.length / ITEMS_PER_PAGE) || Math.ceil(products.length / ITEMS_PER_PAGE) <= 1}
                className="px-5 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-emerald-600 disabled:opacity-50 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed font-semibold shadow-sm transition-all"
              >
                Sau
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Products;
