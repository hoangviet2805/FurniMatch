import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { getImageUrl } from '../utils/api';
import { isFavorite, toggleFavorite } from '../utils/favorites';
import { addRecentlyViewed, isCompared, toggleComparison } from '../utils/comparison';
import { addToCart, type CartItem } from '../utils/cart';
import { openChatWithSeller } from '../utils/chat';
import { 
  MessageCircle, ChevronRight, ShieldCheck, Truck, RotateCcw, 
  Share2, Copy, GitCompare 
} from 'lucide-react';

const imageUrl = getImageUrl;
const money = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

const resolveMediaUrl = getImageUrl;

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
  const [buyError, setBuyError] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [cartSuccessMessage, setCartSuccessMessage] = useState('');
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  // ========== REVIEWS STATE ==========
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewStats, setReviewStats] = useState<{ total: number; avgRating: number }>({ total: 0, avgRating: 0 });
  const [loadingReviews, setLoadingReviews] = useState<boolean>(true);
  const [starFilter, setStarFilter] = useState<'ALL' | number>('ALL');
  const [withMediaOnly, setWithMediaOnly] = useState<boolean>(false);
  const [activeMediaModal, setActiveMediaModal] = useState<{ url: string; isVideo: boolean } | null>(null);
  const [activeTab, setActiveTab] = useState<'desc' | 'specs' | 'policy'>('desc');

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
  const variantLabel = (variant: any) => `${variant.sizeName || 'Tiêu chuẩn'} - ${variant.materialName || 'Mặc định'}`;

  const buyNow = () => {
    setBuyError('');
    if (variants.length && !selectedVariant) { setBuyError('Vui lòng chọn phân loại trước khi mua.'); return; }
    if (!localStorage.getItem('token')) { navigate(`/login?redirect=/products/${product.productId}`); return; }
    const stock = selectedVariant?.stock;
    if (typeof stock === 'number') {
      if (stock <= 0) { setBuyError('Sản phẩm này đã hết hàng.'); return; }
      if (quantity > stock) { setBuyError(`Số lượng tối đa hiện có là ${stock}.`); return; }
    }
    const thumbImg = product.productImages?.find((img: any) => img.isThumbnail)?.imageUrl || product.productImages?.[0]?.imageUrl;
    const fullLabel = selectedVariant ? variantLabel(selectedVariant) : 'Tiêu chuẩn';
    addToCart({ 
      productId: product.productId, 
      variantId: selectedVariant?.productVariantId ?? selectedVariant?.variantId, 
      name: product.name, 
      sizeLabel: fullLabel, 
      price: selectedPrice, 
      quantity: quantity, 
      imageUrl: thumbImg, 
      sellerName: product.seller?.shopName || product.seller?.fullName,
      sellerId: product.sellerId 
    });
    navigate('/checkout');
  };

  const handleAddToCart = () => {
    setBuyError('');
    setCartSuccessMessage('');
    if (variants.length && !selectedVariant) { setBuyError('Vui lòng chọn phân loại trước khi thêm vào giỏ.'); return; }
    if (!localStorage.getItem('token')) { navigate(`/login?redirect=/products/${product.productId}`); return; }
    const stock = selectedVariant?.stock;
    if (typeof stock === 'number') {
      if (stock <= 0) {
        setBuyError('Sản phẩm này đã hết hàng.');
        return;
      }
      if (quantity > stock) {
        setBuyError(`Số lượng tối đa hiện có là ${stock}.`);
        return;
      }
    }
    const thumbImg = product.productImages?.find((img: any) => img.isThumbnail)?.imageUrl || product.productImages?.[0]?.imageUrl;
    const fullLabel = selectedVariant ? variantLabel(selectedVariant) : 'Tiêu chuẩn';
    const item: CartItem = {
      productId: product.productId,
      variantId: selectedVariant?.productVariantId ?? selectedVariant?.variantId,
      name: product.name,
      sizeLabel: fullLabel,
      price: selectedPrice,
      quantity: quantity,
      imageUrl: thumbImg,
      sellerName: product.seller?.shopName || product.seller?.fullName,
      sellerId: product.sellerId
    };

    const res = addToCart(item);
    if (res.success) {
      setCartSuccessMessage(res.message);
      setTimeout(() => setCartSuccessMessage(''), 5000);
    } else {
      setBuyError(res.message);
    }
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

  const handleChatWithSeller = () => {
    if (!product?.sellerId) return;

    const savedUser = localStorage.getItem('user');
    if (!savedUser) {
      if (confirm('Vui lòng đăng nhập để trò chuyện với xưởng sản xuất. Chuyển tới trang đăng nhập?')) {
        navigate('/login');
      }
      return;
    }

    const currentUser = JSON.parse(savedUser);
    if (currentUser.userId === product.sellerId) {
      setActionMessage('Đây là sản phẩm từ chính xưởng của bạn.');
      return;
    }

    // Mở khung chat và tự động gửi thông báo / tin nhắn hỏi về sản phẩm này cho xưởng
    openChatWithSeller({
      sellerId: product.sellerId,
      sellerName: product.seller?.fullName,
      shopName: product.seller?.shopName,
      avatarUrl: product.seller?.avatarUrl,
      product: {
        productId: product.productId,
        name: product.name,
        price: selectedPrice || lowestPrice || product.price,
        imageUrl: primaryImage?.imageUrl || product.productImages?.[0]?.imageUrl
      },
      autoSendInquiry: true
    });
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs sm:text-sm text-gray-500 mb-6 flex-wrap">
        <Link to="/" className="hover:text-emerald-600 transition-colors">Trang chủ</Link>
        <span>/</span>
        <Link to="/products" className="hover:text-emerald-600 transition-colors">Sản phẩm nội thất</Link>
        <span>/</span>
        <span className="text-gray-900 font-semibold truncate max-w-xs">{product.name}</span>
      </nav>
      
      {/* Product Main Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 bg-white rounded-3xl border border-gray-100 shadow-sm p-5 sm:p-8">
        
        {/* LEFT COLUMN: Gallery & Trust Highlights (5 cols on lg) */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="relative aspect-square rounded-2xl bg-gray-50 overflow-hidden border border-gray-100 shadow-inner group">
            {primaryImage ? (
              <img 
                src={imageUrl(primaryImage.imageUrl)} 
                alt={product.name} 
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
              />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">Không có ảnh sản phẩm</div>
            )}
            
            {/* Top Badges */}
            <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
              <span className="bg-emerald-600 text-white text-[11px] font-extrabold px-2.5 py-1 rounded-lg shadow-sm">
                Chính hãng 100%
              </span>
              {product.customSizeSupported && (
                <span className="bg-amber-500 text-white text-[11px] font-extrabold px-2.5 py-1 rounded-lg shadow-sm">
                  Nhận làm theo size
                </span>
              )}
            </div>

            {/* Favorite button */}
            <button 
              onClick={() => setSaved(toggleFavorite(product.productId))} 
              className={`absolute top-3 right-3 h-10 w-10 rounded-full bg-white/90 backdrop-blur-sm border shadow-sm flex items-center justify-center text-xl transition-all hover:scale-110 active:scale-95 cursor-pointer z-10 ${
                saved ? 'border-rose-200 text-rose-600 bg-rose-50' : 'border-gray-200 text-gray-400 hover:text-rose-600'
              }`} 
              aria-label="Lưu sản phẩm"
            >
              {saved ? '♥' : '♡'}
            </button>
          </div>

          {/* Thumbnails row */}
          {product.productImages?.length > 1 && (
            <div className="flex gap-3 mt-4 overflow-x-auto pb-2 [scrollbar-width:thin]">
              {product.productImages.map((image: any, index: number) => (
                <button 
                  key={image.productImageId ?? image.imageUrl} 
                  onClick={() => setActiveImage(index)} 
                  className={`w-18 h-18 shrink-0 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                    activeImage === index ? 'border-emerald-600 ring-2 ring-emerald-200 scale-102' : 'border-gray-200 hover:border-gray-300 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={imageUrl(image.imageUrl)} alt={`${product.name} ${index + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Quick Pillars of Trust */}
          <div className="mt-6 pt-6 border-t border-gray-100 grid grid-cols-3 gap-2 text-center">
            <div className="p-2.5 rounded-xl bg-gray-50/70 border border-gray-100">
              <ShieldCheck className="w-5 h-5 mx-auto text-emerald-600 mb-1" />
              <p className="text-[11px] font-bold text-gray-800">Thanh toán Escrow</p>
              <p className="text-[10px] text-gray-500 mt-0.5">Giữ tiền an toàn 100%</p>
            </div>
            <div className="p-2.5 rounded-xl bg-gray-50/70 border border-gray-100">
              <Truck className="w-5 h-5 mx-auto text-emerald-600 mb-1" />
              <p className="text-[11px] font-bold text-gray-800">Giao lắp tận nhà</p>
              <p className="text-[10px] text-gray-500 mt-0.5">Xưởng tự hoàn thiện</p>
            </div>
            <div className="p-2.5 rounded-xl bg-gray-50/70 border border-gray-100">
              <RotateCcw className="w-5 h-5 mx-auto text-emerald-600 mb-1" />
              <p className="text-[11px] font-bold text-gray-800">Đổi trả 3 ngày</p>
              <p className="text-[10px] text-gray-500 mt-0.5">Nếu phát hiện lỗi xưởng</p>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Product Information & Purchase Flow (7 cols on lg) */}
        <div className="lg:col-span-7 flex flex-col justify-between">
          <div>
            {/* Category tag & Star Rating */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-wider border border-emerald-100">
                {product.category?.name ?? 'Nội thất FurniMatch'}
              </span>

              {/* Star Rating Overview Link */}
              <a href="#reviews-section" className="flex items-center gap-1.5 hover:opacity-80 transition-opacity text-sm">
                <span className="font-extrabold text-amber-500 text-base">
                  {reviewStats.avgRating > 0 ? reviewStats.avgRating.toFixed(1) : '5.0'}
                </span>
                <div className="flex text-amber-400 text-sm">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <span key={s}>{s <= Math.round(reviewStats.avgRating || 5) ? '★' : '☆'}</span>
                  ))}
                </div>
                <span className="text-gray-400">·</span>
                <span className="text-gray-600 hover:text-emerald-700 underline font-medium">
                  {reviewStats.total} Đánh giá
                </span>
              </a>
            </div>

            {/* Product Title */}
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 leading-tight">
              {product.name}
            </h1>

            {/* Price Box */}
            <div className="mt-4 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-50/80 via-teal-50/40 to-white border border-emerald-200/80 flex flex-wrap items-baseline justify-between gap-3">
              <div>
                <span className="block text-xs font-semibold text-emerald-800 uppercase tracking-wider">Giá niêm yết xưởng</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl sm:text-4xl font-black text-emerald-700">
                    {lowestPrice ? money(selectedPrice || lowestPrice) : 'Liên hệ để báo giá'}
                  </span>
                  {variants.length > 1 && !selectedVariantId && (
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                      trở lên
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                  selectedVariant && typeof selectedVariant.stock === 'number' && selectedVariant.stock <= 0
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {selectedVariant && typeof selectedVariant.stock === 'number' && selectedVariant.stock <= 0
                    ? 'Hết hàng sẵn'
                    : 'Nhận gia công & Có sẵn'}
                </span>
                <p className="text-[11px] text-gray-500 mt-1">
                  ⏱️ Sản xuất dự kiến: {selectedVariant?.productionDays || product.productionDays || 7} ngày
                </p>
              </div>
            </div>

            {/* Variant / Size Selection */}
            <div className="mt-5">
              <div className="flex items-center justify-between mb-2.5">
                <h2 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                  <span>Chọn kích thước & quy cách</span>
                  <span className="text-rose-600">*</span>
                </h2>
                {selectedVariant && (
                  <span className="text-xs font-semibold text-emerald-700">
                    Đã chọn: {variantLabel(selectedVariant)}
                  </span>
                )}
              </div>

              {variants.length > 0 ? (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1 [scrollbar-width:thin]">
                  {variants.map((variant: any) => {
                    const variantId = variant.productVariantId ?? variant.variantId;
                    const selected = selectedVariantId === variantId;
                    const isOutOfStock = typeof variant.stock === 'number' && variant.stock <= 0;
                    
                    return (
                      <button
                        type="button"
                        key={variantId}
                        onClick={() => {
                          setSelectedVariantId(variantId);
                          setActionMessage('');
                          setBuyError('');
                        }}
                        className={`w-full flex justify-between items-center rounded-xl border p-3 text-left transition-all cursor-pointer ${
                          selected
                            ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-200 shadow-xs'
                            : 'border-gray-200 hover:border-emerald-300 hover:bg-gray-50/50'
                        } ${isOutOfStock ? 'opacity-60 bg-gray-50 cursor-not-allowed' : ''}`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                            selected ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-gray-300'
                          }`}>
                            {selected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-gray-900 text-sm truncate flex items-center gap-2">
                              <span>{variantLabel(variant)}</span>
                              {isOutOfStock && (
                                <span className="text-[10px] font-bold text-rose-600 bg-rose-100 px-1.5 py-0.2 rounded">
                                  Hết hàng
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {variant.length && variant.width && variant.height ? `${variant.length}×${variant.width}×${variant.height} cm · ` : ''}
                              Sản xuất {variant.productionDays || 7} ngày
                              {!isOutOfStock && typeof variant.stock === 'number' ? ` · Còn ${variant.stock}` : ''}
                            </p>
                          </div>
                        </div>

                        <span className="font-extrabold text-emerald-700 text-sm shrink-0 ml-3">
                          {money(variant.price)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-emerald-600 bg-emerald-50/50 px-4 py-3 text-sm font-medium text-emerald-900">
                  Quy cách tiêu chuẩn xưởng sản xuất
                </div>
              )}
            </div>

            {/* Quantity & Subtotal Row */}
            {(!user || user.role === 'CUSTOMER') && (
              <div className="mt-5 p-3.5 bg-gray-50 rounded-xl border border-gray-200/80 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-800 uppercase tracking-wide">Số lượng:</span>
                  <div className="flex items-center border border-gray-300 rounded-lg bg-white overflow-hidden shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                      disabled={quantity <= 1}
                      className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-base font-bold cursor-pointer"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={typeof selectedVariant?.stock === 'number' && selectedVariant.stock > 0 ? selectedVariant.stock : 99}
                      value={quantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        const maxStock = typeof selectedVariant?.stock === 'number' && selectedVariant.stock > 0 ? selectedVariant.stock : 99;
                        if (isNaN(val) || val < 1) {
                          setQuantity(1);
                        } else if (val > maxStock) {
                          setQuantity(maxStock);
                        } else {
                          setQuantity(val);
                        }
                      }}
                      className="w-12 h-8 text-center text-sm font-bold text-gray-900 border-x border-gray-300 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const maxStock = typeof selectedVariant?.stock === 'number' && selectedVariant.stock > 0 ? selectedVariant.stock : 99;
                        setQuantity(prev => Math.min(maxStock, prev + 1));
                      }}
                      disabled={typeof selectedVariant?.stock === 'number' && selectedVariant.stock > 0 ? quantity >= selectedVariant.stock : false}
                      className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-base font-bold cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                  {typeof selectedVariant?.stock === 'number' && selectedVariant.stock > 0 && (
                    <span className="text-xs text-gray-500">
                      (Còn {selectedVariant.stock})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-600">Tạm tính:</span>
                  <span className="text-xl font-black text-emerald-700">
                    {money(selectedPrice * quantity)}
                  </span>
                </div>
              </div>
            )}

            {/* Alerts */}
            {buyError && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs sm:text-sm font-semibold text-rose-700 flex items-center gap-2 animate-in fade-in">
                <span>⚠️</span>
                <span>{buyError}</span>
              </div>
            )}

            {cartSuccessMessage && (
              <div className="mt-4 p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between gap-3 text-xs sm:text-sm text-emerald-900 shadow-xs animate-in fade-in">
                <div className="flex items-center gap-2 font-bold">
                  <span>🎉</span>
                  <span>{cartSuccessMessage}</span>
                </div>
                <Link 
                  to="/checkout" 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors shadow-xs"
                >
                  Xem giỏ hàng →
                </Link>
              </div>
            )}

            {/* PRIMARY PURCHASE ACTIONS: MUA NGAY (FIRST) -> THÊM GIỎ (SECOND) -> CHAT DUY NHẤT (THIRD) */}
            {(!user || user.role === 'CUSTOMER') && (
              <div className="mt-5 flex flex-col sm:flex-row gap-3">
                {/* 1. NÚT MUA NGAY - LÊN ĐẦU TIÊN THEO YÊU CẦU */}
                <button
                  type="button"
                  onClick={buyNow}
                  className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-extrabold text-sm sm:text-base py-3.5 px-6 rounded-xl shadow-md shadow-emerald-700/25 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="text-base sm:text-lg">⚡</span>
                  <span>Mua ngay</span>
                </button>

                {/* 2. NÚT THÊM VÀO GIỎ */}
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="sm:w-auto bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-2 border-emerald-600 font-bold text-xs sm:text-sm py-3.5 px-5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-[0.99]"
                >
                  <span className="text-base sm:text-lg">🛒</span>
                  <span>Thêm vào giỏ</span>
                </button>

                {/* 3. NÚT CHAT VỚI XƯỞNG - ĐỂ LẠI DUY NHẤT 1 NÚT NÀY */}
                <button
                  type="button"
                  onClick={handleChatWithSeller}
                  className="sm:w-auto bg-white hover:bg-teal-50 text-teal-700 hover:text-teal-800 border-2 border-teal-300 hover:border-teal-400 font-bold text-xs sm:text-sm py-3.5 px-5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-[0.99]"
                  title="Nhấn để chat trực tiếp với xưởng về sản phẩm này"
                >
                  <MessageCircle size={18} className="text-teal-600" />
                  <span>Chat với xưởng</span>
                </button>
              </div>
            )}

            {/* Quick Actions Row: So sánh, Chia sẻ, Sao chép */}
            <div className="mt-4 pt-3.5 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500 font-medium">
              <div className="flex items-center gap-3">
                <button 
                  type="button" 
                  onClick={updateComparison} 
                  className={`flex items-center gap-1 hover:text-emerald-700 transition-colors cursor-pointer ${compared ? 'text-emerald-700 font-bold' : ''}`}
                >
                  <GitCompare size={14} />
                  <span>{compared ? '✓ Đã thêm so sánh' : 'So sánh'}</span>
                </button>
                <span>·</span>
                <button 
                  type="button" 
                  onClick={shareProduct} 
                  className="flex items-center gap-1 hover:text-emerald-700 transition-colors cursor-pointer"
                >
                  <Share2 size={14} />
                  <span>Chia sẻ</span>
                </button>
                <span>·</span>
                <button 
                  type="button" 
                  onClick={copySpecification} 
                  className="flex items-center gap-1 hover:text-emerald-700 transition-colors cursor-pointer"
                >
                  <Copy size={14} />
                  <span>Sao chép thông tin</span>
                </button>
              </div>

              {compared && (
                <Link to="/compare" className="text-emerald-700 hover:underline font-bold">
                  Xem bảng so sánh →
                </Link>
              )}
            </div>

            {compareMessage && <p className="mt-2 text-xs text-emerald-700 font-medium" role="status">{compareMessage}</p>}
            {actionMessage && <p className="mt-2 text-xs text-emerald-700 font-medium" role="status">{actionMessage}</p>}
          </div>

          {/* WORKSHOP / SELLER INFORMATION CARD - KHÔNG CÓ NÚT CHAT TRÙNG LẶP */}
          <div className="mt-6 p-4 rounded-2xl border border-gray-200/80 bg-gray-50/70 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-full bg-emerald-600 text-white font-black flex items-center justify-center text-base shadow-xs shrink-0 overflow-hidden">
                {product.seller?.avatarUrl ? (
                  <img src={imageUrl(product.seller.avatarUrl)} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span>{(product.seller?.shopName || product.seller?.fullName || 'X').charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Xưởng sản xuất</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">Xác thực</span>
                </div>
                <p className="font-bold text-gray-900 text-sm truncate mt-0.5">
                  {product.seller?.shopName || product.seller?.fullName || 'Nhà sản xuất'}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {[product.seller?.district, product.seller?.province].filter(Boolean).join(', ') || 'Xưởng nội thất uy tín trên FurniMatch'}
                </p>
              </div>
            </div>

            <Link
              to={`/shop/${product.sellerId}`}
              className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-white hover:bg-emerald-50 border border-emerald-200 px-3.5 py-2 rounded-xl transition-colors shrink-0 shadow-2xs"
            >
              <span>Xem gian hàng</span>
              <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      </div>

      {/* DETAILED INFORMATION & SPECIFICATIONS TABS */}
      <div className="mt-10 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Tab Headers */}
        <div className="flex border-b border-gray-100 bg-gray-50/60 overflow-x-auto [scrollbar-width:thin]">
          <button
            onClick={() => setActiveTab('desc')}
            className={`py-4 px-6 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'desc'
                ? 'border-emerald-600 text-emerald-700 bg-white shadow-2xs'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Mô tả sản phẩm
          </button>
          <button
            onClick={() => setActiveTab('specs')}
            className={`py-4 px-6 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'specs'
                ? 'border-emerald-600 text-emerald-700 bg-white shadow-2xs'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Thông số kỹ thuật & Kích thước
          </button>
          <button
            onClick={() => setActiveTab('policy')}
            className={`py-4 px-6 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'policy'
                ? 'border-emerald-600 text-emerald-700 bg-white shadow-2xs'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Chính sách bảo hành & Escrow
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 sm:p-8">
          {activeTab === 'desc' && (
            <div className="prose max-w-none text-gray-700 text-sm sm:text-base leading-relaxed">
              <h3 className="text-lg font-bold text-gray-900 mb-3">Chi tiết về {product.name}</h3>
              <p className="whitespace-pre-line leading-7">
                {product.description || 'Xưởng sản xuất đang cập nhật mô tả chi tiết cho sản phẩm này.'}
              </p>
              {product.material && (
                <div className="mt-4 p-4 rounded-xl bg-gray-50 border border-gray-100">
                  <span className="font-bold text-gray-900 text-sm">Chất liệu chế tác: </span>
                  <span className="text-gray-700 text-sm">{product.material}</span>
                </div>
              )}
            </div>
          )}

          {activeTab === 'specs' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-900 mb-3">Bảng phân loại & thông số kỹ thuật</h3>
              {variants.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full text-left text-sm text-gray-700">
                    <thead className="bg-gray-50 text-xs font-bold text-gray-800 uppercase tracking-wider border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3">Phân loại</th>
                        <th className="px-4 py-3">Kích thước (D × R × C)</th>
                        <th className="px-4 py-3">Chất liệu</th>
                        <th className="px-4 py-3">Thời gian sản xuất</th>
                        <th className="px-4 py-3 text-right">Giá niêm yết</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {variants.map((v: any, idx: number) => (
                        <tr key={idx} className="hover:bg-gray-50/80 transition-colors">
                          <td className="px-4 py-3.5 font-bold text-gray-900">{variantLabel(v)}</td>
                          <td className="px-4 py-3.5">
                            {v.length && v.width && v.height ? `${v.length} × ${v.width} × ${v.height} cm` : 'Tiêu chuẩn'}
                          </td>
                          <td className="px-4 py-3.5">{v.materialName || product.material || 'Gỗ tự nhiên/công nghiệp cao cấp'}</td>
                          <td className="px-4 py-3.5">{v.productionDays || product.productionDays || 7} ngày</td>
                          <td className="px-4 py-3.5 text-right font-extrabold text-emerald-700">{money(v.price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Sản phẩm sử dụng kích thước tiêu chuẩn của xưởng.</p>
              )}
            </div>
          )}

          {activeTab === 'policy' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-100">
                <ShieldCheck className="w-8 h-8 text-emerald-600 mb-2" />
                <h4 className="font-bold text-gray-900 text-sm mb-1">Ví trung gian Escrow</h4>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Toàn bộ tiền thanh toán được FurniMatch giữ an toàn. Chỉ giải ngân cho xưởng khi quý khách đã nhận sản phẩm và hoàn tất xác nhận.
                </p>
              </div>
              <div className="p-5 rounded-2xl bg-teal-50/50 border border-teal-100">
                <RotateCcw className="w-8 h-8 text-teal-600 mb-2" />
                <h4 className="font-bold text-gray-900 text-sm mb-1">Khiếu nại & Đổi trả trong 3 ngày</h4>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Nếu hàng giao bị móp méo, nứt vỡ hoặc sai lệch kích thước mô tả, quý khách được quyền mở khiếu nại để hoàn tiền hoặc yêu cầu sản xuất lại.
                </p>
              </div>
              <div className="p-5 rounded-2xl bg-blue-50/50 border border-blue-100">
                <Truck className="w-8 h-8 text-blue-600 mb-2" />
                <h4 className="font-bold text-gray-900 text-sm mb-1">Vận chuyển từ xưởng chuyên nghiệp</h4>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Đội ngũ xưởng trực tiếp đóng gói kỹ càng với màng co chống sốc và giao hàng an toàn đến địa chỉ của bạn.
                </p>
              </div>
            </div>
          )}
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

