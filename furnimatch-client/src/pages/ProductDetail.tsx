import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../utils/api';
import { isFavorite, toggleFavorite } from '../utils/favorites';
import { addRecentlyViewed, isCompared, toggleComparison } from '../utils/comparison';
import { saveCart } from '../utils/cart';

const imageUrl = (url?: string) => url?.startsWith('http') ? url : `http://localhost:5234${url}`;
const money = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

const resolveMediaUrl = (url: string) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `http://localhost:5234${url.startsWith('/') ? '' : '/'}${url}`;
};

const isVideoFile = (url: string) => {
  const clean = url.split('?')[0].toLowerCase();
  return clean.endsWith('.mp4') || clean.endsWith('.mov') || clean.endsWith('.webm') || clean.endsWith('.avi');
};

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

  // ========== REVIEWS STATE ==========
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewStats, setReviewStats] = useState<{ total: number; avgRating: number }>({ total: 0, avgRating: 0 });
  const [loadingReviews, setLoadingReviews] = useState<boolean>(true);
  const [starFilter, setStarFilter] = useState<'ALL' | number>('ALL');
  const [withMediaOnly, setWithMediaOnly] = useState<boolean>(false);
  const [activeMediaModal, setActiveMediaModal] = useState<{ url: string; isVideo: boolean } | null>(null);

  useEffect(() => {
    if (!id) return;
    api.get(`/products/${id}`).then(response => {
      setProduct(response.data);
      setSaved(isFavorite(response.data.productId));
      setCompared(isCompared(response.data.productId));
      addRecentlyViewed(response.data.productId);
    }).catch(() => setProduct(null)).finally(() => setLoading(false));

    // Fetch product reviews
    setLoadingReviews(true);
    api.get(`/reviews/product/${id}?pageSize=50`)
      .then(res => {
        setReviews(res.data?.data || []);
        setReviewStats({
          total: res.data?.total || 0,
          avgRating: res.data?.avgRating || 0,
        });
      })
      .catch(err => {
        console.error('Lỗi khi tải đánh giá sản phẩm:', err);
      })
      .finally(() => setLoadingReviews(false));
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
    const thumbImg = product.productImages?.find((img: any) => img.isThumbnail)?.imageUrl || product.productImages?.[0]?.imageUrl;
    saveCart([{ productId: product.productId, variantId: selectedVariant?.productVariantId ?? selectedVariant?.variantId, name: product.name, sizeLabel: selectedVariant ? variantLabel(selectedVariant) : 'Tiêu chuẩn', price: selectedPrice, quantity, imageUrl: thumbImg, sellerName: product.seller?.shopName || product.seller?.fullName }]);
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

  // Review calculations
  const starCounts = useMemo(() => {
    const counts: Record<number, number> & { withMedia: number } = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0, withMedia: 0 };
    reviews.forEach(r => {
      if (r.rating >= 1 && r.rating <= 5) counts[r.rating]++;
      try {
        const m = r.mediaJson ? JSON.parse(r.mediaJson) : [];
        if (Array.isArray(m) && m.length > 0) counts.withMedia++;
      } catch {}
    });
    return counts;
  }, [reviews]);

  const filteredReviews = useMemo(() => {
    return reviews.filter(r => {
      if (starFilter !== 'ALL' && r.rating !== starFilter) return false;
      if (withMediaOnly) {
        try {
          const m = r.mediaJson ? JSON.parse(r.mediaJson) : [];
          if (!Array.isArray(m) || m.length === 0) return false;
        } catch {
          return false;
        }
      }
      return true;
    });
  }, [reviews, starFilter, withMediaOnly]);

  const getRatingLabel = (rating: number) => {
    switch (rating) {
      case 5: return 'Cực kỳ hài lòng';
      case 4: return 'Hài lòng';
      case 3: return 'Bình thường';
      case 2: return 'Không hài lòng';
      case 1: return 'Rất tệ';
      default: return '';
    }
  };

  if (loading) return <div className="max-w-7xl mx-auto px-4 py-20 text-center text-gray-500">Đang tải sản phẩm...</div>;
  if (!product) return <div className="max-w-3xl mx-auto px-4 py-20 text-center"><p className="text-xl font-semibold">Không tìm thấy sản phẩm.</p><Link className="inline-block mt-4 text-emerald-600" to="/products">Quay lại danh mục</Link></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Link to="/products" className="inline-flex items-center text-sm text-gray-600 hover:text-emerald-600 mb-6">← Quay lại danh mục</Link>
      
      {/* Product Main Section */}
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
          <div className="flex justify-between gap-4">
            <div>
              <p className="text-sm text-emerald-700 font-medium">{product.category?.name ?? 'Nội thất'}</p>
              <h1 className="text-3xl font-bold text-gray-900 mt-1">{product.name}</h1>
              
              {/* Star Rating Overview at Top */}
              <div className="flex items-center gap-3 mt-2.5 text-sm">
                <a href="#reviews-section" className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
                  <span className="font-extrabold text-amber-500 text-base underline">
                    {reviewStats.avgRating > 0 ? reviewStats.avgRating.toFixed(1) : '5.0'}
                  </span>
                  <div className="flex text-amber-400 text-sm">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <span key={s}>{s <= Math.round(reviewStats.avgRating || 5) ? '★' : '☆'}</span>
                    ))}
                  </div>
                </a>
                <span className="text-gray-300">|</span>
                <a href="#reviews-section" className="text-gray-600 hover:text-emerald-700 transition-colors">
                  <span className="font-semibold text-gray-900 underline">{reviewStats.total}</span> Đánh giá
                </a>
                <span className="text-gray-300">|</span>
                <span className="text-gray-500 text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                  Chính hãng
                </span>
              </div>
            </div>
            <button onClick={() => setSaved(toggleFavorite(product.productId))} className={`h-11 w-11 rounded-full border text-xl shrink-0 ${saved ? 'bg-rose-50 border-rose-200 text-rose-600' : 'border-gray-200 text-gray-500 hover:text-rose-600'}`} aria-label="Lưu sản phẩm">{saved ? '♥' : '♡'}</button>
          </div>

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

      {/* ===================== PRODUCT REVIEWS SECTION ===================== */}
      <div id="reviews-section" className="mt-12 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-10 scroll-mt-6">
        <div className="border-b border-gray-100 pb-5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
              <span>⭐ ĐÁNH GIÁ SẢN PHẨM</span>
              <span className="text-sm font-normal text-gray-500">({reviewStats.total})</span>
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Nhận xét chân thực từ những khách hàng đã mua và hoàn tất đơn hàng
            </p>
          </div>
        </div>

        {/* Rating Overview Box */}
        <div className="bg-amber-50/50 rounded-2xl border border-amber-200/60 p-6 mb-8">
          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Left: Big Rating Score */}
            <div className="text-center md:text-left shrink-0 md:pr-8 md:border-r md:border-amber-200/80">
              <div className="text-4xl sm:text-5xl font-black text-amber-600 flex items-baseline justify-center md:justify-start gap-1">
                <span>{reviewStats.avgRating > 0 ? reviewStats.avgRating.toFixed(1) : '5.0'}</span>
                <span className="text-xl text-amber-500 font-semibold">/ 5</span>
              </div>
              <div className="flex text-amber-400 text-xl justify-center md:justify-start mt-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <span key={s}>{s <= Math.round(reviewStats.avgRating || 5) ? '★' : '☆'}</span>
                ))}
              </div>
              <p className="text-xs text-gray-600 mt-1.5 font-medium">
                Dựa trên {reviewStats.total} lượt đánh giá
              </p>
            </div>

            {/* Right: Filter Chips */}
            <div className="flex-1 w-full">
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-3">
                Lọc đánh giá theo:
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => { setStarFilter('ALL'); setWithMediaOnly(false); }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    starFilter === 'ALL' && !withMediaOnly
                      ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-amber-300 hover:bg-amber-50/40'
                  }`}
                >
                  Tất cả ({reviewStats.total})
                </button>

                {[5, 4, 3, 2, 1].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => { setStarFilter(star); setWithMediaOnly(false); }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                      starFilter === star && !withMediaOnly
                        ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-amber-300 hover:bg-amber-50/40'
                    }`}
                  >
                    {star} Sao ({starCounts[star]})
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setWithMediaOnly(!withMediaOnly)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                    withMediaOnly
                      ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-amber-300 hover:bg-amber-50/40'
                  }`}
                >
                  <span>📷 Có Ảnh / Video</span>
                  <span>({starCounts.withMedia})</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Reviews List */}
        {loadingReviews ? (
          <div className="py-12 text-center text-gray-500">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-500 border-t-transparent mb-2"></div>
            <div>Đang tải đánh giá sản phẩm...</div>
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="py-14 text-center">
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-amber-50 flex items-center justify-center text-2xl text-amber-500">
              ⭐
            </div>
            <h3 className="text-base font-bold text-gray-800">
              {reviews.length === 0
                ? 'Sản phẩm này chưa có đánh giá nào.'
                : 'Không có đánh giá nào phù hợp với bộ lọc đã chọn.'}
            </h3>
            <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
              {reviews.length === 0
                ? 'Khách hàng hoàn tất đơn hàng có thể viết đánh giá kèm số sao, cảm nhận và hình ảnh/video thực tế.'
                : 'Bạn vui lòng thử chọn bộ lọc khác để xem thêm đánh giá.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredReviews.map((rev) => {
              let mediaList: string[] = [];
              try {
                if (rev.mediaJson) mediaList = JSON.parse(rev.mediaJson);
              } catch { }

              const initial = rev.customerName ? rev.customerName.charAt(0).toUpperCase() : 'U';

              return (
                <div key={rev.reviewId} className="py-6 first:pt-0 last:pb-0 flex gap-4 sm:gap-5">
                  {/* User Avatar */}
                  <div className="shrink-0">
                    {rev.customerAvatar ? (
                      <img
                        src={imageUrl(rev.customerAvatar)}
                        alt={rev.customerName}
                        className="w-11 h-11 rounded-full object-cover border border-gray-200 shadow-sm"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-600 text-white font-bold flex items-center justify-center text-base shadow-sm">
                        {initial}
                      </div>
                    )}
                  </div>

                  {/* Review Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-bold text-gray-900 text-sm">{rev.customerName}</span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-100">
                        <span>✓</span> Đã mua hàng tại FurniMatch
                      </span>
                    </div>

                    {/* Star Rating & Label */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex text-amber-400 text-sm">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <span key={s}>{s <= rev.rating ? '★' : '☆'}</span>
                        ))}
                      </div>
                      <span className="text-xs font-semibold text-amber-600">
                        {getRatingLabel(rev.rating)}
                      </span>
                    </div>

                    {/* Review Date */}
                    <div className="text-xs text-gray-400 mb-3">
                      Đánh giá vào {new Date(rev.createdAt).toLocaleString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })}
                    </div>

                    {/* Comment text */}
                    {rev.comment ? (
                      <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line mb-3 font-normal">
                        {rev.comment}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-400 italic mb-3">
                        Người mua không để lại lời bình luận chữ.
                      </p>
                    )}

                    {/* Media Attachments Gallery */}
                    {mediaList.length > 0 && (
                      <div className="mt-3">
                        <div className="flex flex-wrap gap-2.5">
                          {mediaList.map((url, idx) => {
                            const isVideo = isVideoFile(url);
                            const fullUrl = resolveMediaUrl(url);

                            return (
                              <div
                                key={idx}
                                onClick={() => setActiveMediaModal({ url: fullUrl, isVideo })}
                                className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden border border-gray-200 cursor-pointer group hover:shadow-md transition-all bg-gray-100 shrink-0"
                              >
                                {isVideo ? (
                                  <div className="w-full h-full bg-gray-900 flex flex-col items-center justify-center text-white relative">
                                    <video src={fullUrl} className="w-full h-full object-cover opacity-60" preload="metadata" />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <div className="w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center text-sm shadow">
                                        ▶
                                      </div>
                                    </div>
                                    <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] px-1 rounded">
                                      VIDEO
                                    </span>
                                  </div>
                                ) : (
                                  <>
                                    <img
                                      src={fullUrl}
                                      alt={`Review media ${idx + 1}`}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                      loading="lazy"
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1.5">
                          💡 Bấm vào ảnh hoặc video để xem kích thước lớn
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ===================== MEDIA LIGHTBOX MODAL ===================== */}
      {activeMediaModal && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 transition-opacity"
          onClick={() => setActiveMediaModal(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] w-full flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setActiveMediaModal(null)}
              className="absolute -top-12 right-0 sm:right-2 text-white hover:text-gray-300 text-3xl font-bold p-2 z-10"
              aria-label="Đóng"
            >
              ✕
            </button>

            {activeMediaModal.isVideo ? (
              <video
                src={activeMediaModal.url}
                controls
                autoPlay
                className="max-h-[80vh] max-w-full rounded-2xl shadow-2xl bg-black"
              />
            ) : (
              <img
                src={activeMediaModal.url}
                alt="Chi tiết hình ảnh đánh giá"
                className="max-h-[80vh] max-w-full object-contain rounded-2xl shadow-2xl bg-black/30"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetail;
