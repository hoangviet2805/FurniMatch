import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../utils/api';
import { isFavorite, toggleFavorite } from '../utils/favorites';
import { addRecentlyViewed, isCompared, toggleComparison } from '../utils/comparison';
import { saveCart } from '../utils/cart';

const imageUrl = (url?: string) => url?.startsWith('http') ? url : `http://localhost:5234${url}`;
const money = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [saved, setSaved] = useState(false);
  const [compared, setCompared] = useState(false);
  const [compareMessage, setCompareMessage] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const user = JSON.parse(localStorage.getItem('user') || 'null');

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
  const selectedVariant = variants.find((variant: any) => (variant.productVariantId ?? variant.variantId) === selectedVariantId);
  const selectedPrice = selectedVariant?.price ?? product?.price ?? 0;
  const variantLabel = (variant: any) => `${variant.sizeName || 'Tiêu chuẩn'}${variant.length || variant.width || variant.height ? ` · ${variant.length ?? '-'} × ${variant.width ?? '-'} × ${variant.height ?? '-'} cm` : ''}`;
  const buyNow = () => {
    if (variants.length && !selectedVariant) { setActionMessage('Vui lòng chọn kích thước trước khi mua.'); return; }
    if (!localStorage.getItem('token')) { navigate(`/login?redirect=/products/${product.productId}`); return; }
    const stock = selectedVariant?.stock;
    if (typeof stock === 'number' && stock > 0 && quantity > stock) { setActionMessage(`Số lượng tối đa hiện có là ${stock}.`); return; }
    saveCart([{ productId: product.productId, variantId: selectedVariant?.productVariantId ?? selectedVariant?.variantId, name: product.name, sizeLabel: selectedVariant ? variantLabel(selectedVariant) : 'Tiêu chuẩn', price: selectedPrice, quantity, imageUrl: product.productImages?.[0]?.imageUrl, sellerName: product.seller?.shopName || product.seller?.fullName }]);
    navigate('/checkout');
  };
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
          <div className="mt-7"><h2 className="font-bold text-gray-900 mb-3">Chọn kích thước <span className="text-rose-600">*</span></h2>{variants.length > 0 ? <div className="space-y-2">{variants.map((variant: any) => { const variantId = variant.productVariantId ?? variant.variantId; const selected = selectedVariantId === variantId; return <button type="button" key={variantId} onClick={() => { setSelectedVariantId(variantId); setActionMessage(''); }} className={`w-full flex justify-between items-center rounded-lg border px-4 py-3 text-left text-sm transition-colors ${selected ? 'border-emerald-600 bg-emerald-50 ring-1 ring-emerald-200' : 'border-gray-200 hover:border-emerald-300'}`}><span><strong>{variantLabel(variant)}</strong>{variant.productionDays ? <small className="block text-gray-500 mt-1">Sản xuất dự kiến {variant.productionDays} ngày{typeof variant.stock === 'number' ? ` · Còn ${variant.stock}` : ''}</small> : null}</span><span className="font-bold text-emerald-600">{money(variant.price)}</span></button>; })}</div> : <div className="rounded-lg border border-emerald-600 bg-emerald-50 px-4 py-3 text-sm font-medium">Tiêu chuẩn</div>}</div>
          {(!user || user.role === 'CUSTOMER') && (
            <>
              <div className="mt-6 flex items-center justify-between gap-4"><div><h2 className="font-bold text-gray-900">Số lượng <span className="text-rose-600">*</span></h2><p className="mt-1 text-xs text-gray-500">Chọn số sản phẩm cần mua</p></div><div className="flex items-center rounded-lg border border-gray-300"><button type="button" aria-label="Giảm số lượng" onClick={() => setQuantity(value => Math.max(1, value - 1))} className="px-4 py-2 text-lg hover:bg-gray-50">−</button><span className="min-w-10 text-center font-semibold">{quantity}</span><button type="button" aria-label="Tăng số lượng" onClick={() => setQuantity(value => value + 1)} className="px-4 py-2 text-lg hover:bg-gray-50">+</button></div></div>
              <div className="mt-6 rounded-xl bg-emerald-50 p-4 flex items-center justify-between"><span className="text-sm text-gray-700">Tạm tính</span><strong className="text-xl text-emerald-700">{money(selectedPrice * quantity)}</strong></div>
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3"><button type="button" onClick={buyNow} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-5 py-3 font-semibold transition-colors">Mua ngay</button><button onClick={updateComparison} className="rounded-lg border border-emerald-600 px-5 py-3 font-semibold text-emerald-700 hover:bg-emerald-50 transition-colors">{compared ? 'Bỏ so sánh' : 'Thêm so sánh'}</button></div>
            </>
          )}
          <div className="grid grid-cols-2 gap-3 mt-3"><button onClick={shareProduct} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Chia sẻ liên kết</button><button onClick={copySpecification} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Sao chép thông tin</button></div>
          {compareMessage && <p className="mt-3 text-sm text-emerald-700" role="status">{compareMessage} {compared && <Link to="/compare" className="underline font-medium">Xem ngay</Link>}</p>}
          {actionMessage && <p className="mt-3 text-sm text-emerald-700" role="status">{actionMessage}</p>}
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
