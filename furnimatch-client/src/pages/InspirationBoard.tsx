import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { getFavoriteIds } from '../utils/favorites';
import { demoProducts, productImageUrl } from '../utils/demoProducts';

const money = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
const price = (product: any) => product.productVariants?.length ? Math.min(...product.productVariants.map((variant: any) => variant.price)) : product.price || 0;

const InspirationBoard = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [theme, setTheme] = useState('Tối giản hiện đại');
  const [loading, setLoading] = useState(true);
  const [usingExamples, setUsingExamples] = useState(false);
  useEffect(() => {
    const ids = getFavoriteIds();
    if (!ids.length) { setProducts(demoProducts); setUsingExamples(true); setLoading(false); return; }
    Promise.allSettled(ids.map(id => api.get(`/products/${id}`))).then(results => {
      const saved = results.filter((item): item is PromiseFulfilledResult<any> => item.status === 'fulfilled').map(item => item.value.data);
      setProducts(saved.length ? saved : demoProducts);
      setUsingExamples(!saved.length);
      setLoading(false);
    });
  }, []);
  const chosen = useMemo(() => products.filter(product => selected.includes(product.productId)), [products, selected]);
  const total = chosen.reduce((sum, product) => sum + price(product), 0);
  const pick = (id: number) => setSelected(current => current.includes(id) ? current.filter(item => item !== id) : current.length < 4 ? [...current, id] : current);
  if (loading) return <div className="py-20 text-center text-gray-500">Đang tải bộ sưu tập...</div>;
  return <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12"><div className="grid lg:grid-cols-[1fr_320px] gap-8"><main><div className="rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-sky-50 p-7"><p className="text-sm font-semibold text-emerald-600 uppercase tracking-wider">Không gian của bạn</p><h1 className="mt-2 text-3xl font-bold text-gray-900">Bảng cảm hứng</h1><p className="mt-2 text-gray-600">Chọn tối đa 4 sản phẩm để thử tạo một góc nội thất hài hòa.</p>{usingExamples && <p className="mt-3 inline-block rounded-full bg-white px-3 py-1 text-xs font-medium text-emerald-700">✨ Đang dùng các mẫu minh họa — lưu sản phẩm yêu thích để thay bằng bộ sưu tập của bạn.</p>}</div><div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-4">{products.map(product => { const image = product.productImages?.[0]?.imageUrl; const active = selected.includes(product.productId); return <button key={product.productId} onClick={() => pick(product.productId)} className={`relative text-left overflow-hidden rounded-xl border-2 transition-all ${active ? 'border-emerald-500 ring-2 ring-emerald-100' : 'border-transparent bg-white hover:border-gray-200'}`}><div className="h-40 bg-gray-100">{image ? <img src={productImageUrl(image)} alt={product.name} className="h-full w-full object-cover" /> : <div className="h-full flex items-center justify-center text-gray-400">Không có ảnh</div>}</div><div className="p-3"><p className="font-semibold text-sm text-gray-900 truncate">{product.name}</p><p className="text-xs text-emerald-600 mt-1">{money(price(product))}</p></div>{active && <span className="absolute top-3 right-3 h-7 w-7 rounded-full bg-emerald-600 text-white text-center leading-7">✓</span>}</button>; })}</div><Link to="/products" className="inline-block mt-6 text-sm font-semibold text-emerald-600">Khám phá thêm sản phẩm →</Link></main><aside className="rounded-2xl bg-slate-900 text-white p-6 h-fit sticky top-24"><h2 className="font-bold text-lg">Góc phối của bạn</h2><label className="block text-xs text-slate-300 mt-5 mb-2">Phong cách</label><select value={theme} onChange={event => setTheme(event.target.value)} className="w-full rounded-lg bg-slate-800 border border-slate-600 px-3 py-2 text-sm"><option>Tối giản hiện đại</option><option>Ấm cúng Bắc Âu</option><option>Đông Dương thanh lịch</option><option>Luxury đương đại</option></select><div className="mt-6 min-h-32 grid grid-cols-2 gap-2">{chosen.map(product => <div key={product.productId} className="rounded-lg overflow-hidden bg-slate-800"><img src={productImageUrl(product.productImages?.[0]?.imageUrl)} alt="" className="h-20 w-full object-cover" /><p className="p-2 text-xs truncate">{product.name}</p></div>)}{!chosen.length && <p className="col-span-2 self-center text-center text-sm text-slate-400">Chọn sản phẩm ở bên trái để bắt đầu phối.</p>}</div><div className="border-t border-slate-700 mt-5 pt-4"><p className="text-sm text-slate-300">Ngân sách tham khảo</p><p className="text-xl font-bold mt-1">{money(total)}</p><p className="text-xs text-slate-400 mt-1">{chosen.length}/4 sản phẩm · {theme}</p></div><Link to="/compare" className="block mt-6 text-center rounded-lg bg-emerald-500 hover:bg-emerald-400 py-2.5 text-sm font-semibold">Đi đến so sánh</Link></aside></div></div>;
};
export default InspirationBoard;
