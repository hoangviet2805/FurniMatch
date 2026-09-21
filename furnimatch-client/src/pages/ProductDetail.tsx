import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../utils/api';
import { isFavorite, toggleFavorite } from '../utils/favorites';
import { addRecentlyViewed, isCompared, toggleComparison } from '../utils/comparison';

const imageUrl = (url?: string) => url?.startsWith('http') ? url : `http://localhost:5234${url}`;
const money = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

const ProductDetail = () => {
  const { id } = useParams();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [saved, setSaved] = useState(false);
  const [compared, setCompared] = useState(false);
  const [compareMessage, setCompareMessage] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  useEffect(() => {
    if (!id) return;
    api.get(`/products/${id}`).then(response => {
      setProduct(response.data);
      setSaved(isFavorite(response.data.productId));
      setCompared(isCompared(response.data.productId));
      addRecentlyViewed(response.data.productId);
    }).catch(() => setProduct(null)).finally(() => setLoading(false));
  }, [id]);

  const variants = useMemo(() => product?.productVariants ?? [], [product]);
  const primaryImage = product?.productImages?.[activeImage];
  const lowestPrice = variants.length ? Math.min(...variants.map((variant: any) => variant.price)) : product?.price;
  const updateComparison = () => {
    const result = toggleComparison(product.productId);
    if (result.limitReached) { setCompareMessage('Bạn chỉ có thể so sánh tối đa 3 sản phẩm.'); return; }
    setCompared(result.added);
    setCompareMessage(result.added ? 'Đã thêm vào danh sách so sánh.' : 'Đã bỏ khỏi danh sách so sánh.');
  };
  const shareProduct = async () => {
    const shareData = { title: product.name, text: `Xem mẫu nội thất ${product.name} trên FurniMatch`, url: window.location.href };
    try {
      if (navigator.share) await navigator.share(shareData);
      else await navigator.clipboard.writeText(window.location.href);
      setActionMessage('Đã sao chép liên kết sản phẩm để bạn chia sẻ.');
    } catch (error) {
      if ((error as Error).name !== 'AbortError') setActionMessage('Không thể chia sẻ lúc này.');
    }
  };
  const copySpecification = async () => {
    const dimensions = variants.map((variant: any) => `${variant.sizeName || 'Tiêu chuẩn'}: ${variant.length ?? '-'} × ${variant.width ?? '-'} × ${variant.height ?? '-'} cm`).join('; ');
    try { await navigator.clipboard.writeText(`${product.name}\nXưởng: ${product.seller?.shopName || product.seller?.fullName || 'Nhà sản xuất'}\nGiá từ: ${lowestPrice ? money(lowestPrice) : 'Liên hệ'}\nKích thước: ${dimensions || 'Liên hệ'}\n${window.location.href}`); setActionMessage('Đã sao chép thông tin sản phẩm.'); }
    catch { setActionMessage('Không thể sao chép thông tin lúc này.'); }
  };

  if (loading) return <div className="max-w-7xl mx-auto px-4 py-20 text-center text-gray-500">Đang tải sản phẩm...</div>;
  if (!product) return <div className="max-w-3xl mx-auto px-4 py-20 text-center"><p className="text-xl font-semibold">Không tìm thấy sản phẩm.</p><Link className="inline-block mt-4 text-emerald-600" to="/products">Quay lại danh mục</Link></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Link to="/products" className="inline-flex items-center text-sm text-gray-600 hover:text-emerald-600 mb-6">← Quay lại danh mục</Link>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-8">
        <div>
          <div className="aspect-square rounded-xl bg-gray-100 overflow-hidden">
            {primaryImage ? <img src={imageUrl(primaryImage.imageUrl)} alt={product.name} className="w-full h-full object-cover" /> : <div className="h-full flex items-center justify-center text-gray-400">Không có ảnh sản phẩm</div>}
          </div>
          {product.productImages?.length > 1 && <div className="flex gap-3 mt-4 overflow-x-auto pb-1">
            {product.productImages.map((image: any, index: number) => <button key={image.productImageId ?? image.imageUrl} onClick={() => setActiveImage(index)} className={`w-20 h-20 shrink-0 rounded-lg overflow-hidden border-2 ${activeImage === index ? 'border-emerald-500' : 'border-transparent'}`}><img src={imageUrl(image.imageUrl)} alt={`${product.name} ${index + 1}`} className="w-full h-full object-cover" /></button>)}
          </div>}
        </div>
        <div className="flex flex-col">
          <div className="flex justify-between gap-4"><div><p className="text-sm text-emerald-700 font-medium">{product.category?.name ?? 'Nội thất'}</p><h1 className="text-3xl font-bold text-gray-900 mt-1">{product.name}</h1></div><button onClick={() => setSaved(toggleFavorite(product.productId))} className={`h-11 w-11 rounded-full border text-xl ${saved ? 'bg-rose-50 border-rose-200 text-rose-600' : 'border-gray-200 text-gray-500 hover:text-rose-600'}`} aria-label="Lưu sản phẩm">{saved ? '♥' : '♡'}</button></div>
          <p className="text-2xl font-bold text-emerald-600 mt-5">{lowestPrice ? `${money(lowestPrice)}${variants.length > 1 ? ' trở lên' : ''}` : 'Liên hệ để báo giá'}</p>
          <p className="text-gray-600 leading-7 mt-6 whitespace-pre-line">{product.description || 'Nhà sản xuất chưa bổ sung mô tả cho sản phẩm này.'}</p>
          <div className="grid grid-cols-2 gap-3 mt-6 text-sm">
            <div className="bg-gray-50 rounded-lg p-3"><span className="block text-gray-500">Xưởng sản xuất</span><Link to={`/shop/${product.sellerId}`} className="font-semibold text-gray-900 hover:text-emerald-600">{product.seller?.shopName || product.seller?.fullName || 'Nhà sản xuất'}</Link></div>
            <div className="bg-gray-50 rounded-lg p-3"><span className="block text-gray-500">Đặt theo kích thước</span><span className="font-semibold text-gray-900">{product.customSizeSupported ? 'Có hỗ trợ' : 'Không hỗ trợ'}</span></div>
          </div>
          {variants.length > 0 && <div className="mt-7"><h2 className="font-bold text-gray-900 mb-3">Tùy chọn kích thước</h2><div className="space-y-2">{variants.map((variant: any) => <div key={variant.productVariantId} className="flex justify-between items-center rounded-lg border border-gray-200 px-4 py-3 text-sm"><span><strong>{variant.sizeName || 'Tiêu chuẩn'}</strong>{variant.length || variant.width || variant.height ? ` · ${variant.length ?? '-'} × ${variant.width ?? '-'} × ${variant.height ?? '-'} cm` : ''}{variant.productionDays ? ` · ${variant.productionDays} ngày` : ''}</span><span className="font-bold text-emerald-600">{money(variant.price)}</span></div>)}</div></div>}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3"><Link to={`/request-quotation?productId=${product.productId}`} className="text-center bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-5 py-3 font-semibold transition-colors">Yêu cầu báo giá</Link><button onClick={updateComparison} className="rounded-lg border border-emerald-600 px-5 py-3 font-semibold text-emerald-700 hover:bg-emerald-50 transition-colors">{compared ? 'Bỏ so sánh' : 'Thêm so sánh'}</button></div>
          <div className="grid grid-cols-2 gap-3 mt-3"><button onClick={shareProduct} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Chia sẻ liên kết</button><button onClick={copySpecification} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Sao chép thông tin</button></div>
          {compareMessage && <p className="mt-3 text-sm text-emerald-700" role="status">{compareMessage} {compared && <Link to="/compare" className="underline font-medium">Xem ngay</Link>}</p>}
          {actionMessage && <p className="mt-3 text-sm text-emerald-700" role="status">{actionMessage}</p>}
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
