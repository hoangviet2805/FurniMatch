import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import {
  CheckCircle2, Clock, XCircle, Package, Truck, Hammer,
  ClipboardList, Store, Info, Star, Upload, X, ChevronRight,
  Image as ImageIcon, Video, Loader2
} from 'lucide-react';

const money = (n: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

const statusConfig: Record<string, { label: string, color: string, icon: any }> = {
  WAITING_PAYMENT: { label: 'Chờ thanh toán', color: 'text-amber-600 bg-amber-50 border-amber-200', icon: Clock },
  CONFIRMED: { label: 'Đã xác nhận', color: 'text-blue-600 bg-blue-50 border-blue-200', icon: CheckCircle2 },
  PREPARING: { label: 'Đang chuẩn bị hàng', color: 'text-cyan-600 bg-cyan-50 border-cyan-200', icon: ClipboardList },
  PRODUCING: { label: 'Đang sản xuất', color: 'text-indigo-600 bg-indigo-50 border-indigo-200', icon: Hammer },
  SHIPPED: { label: 'Đang giao hàng', color: 'text-purple-600 bg-purple-50 border-purple-200', icon: Truck },
  COMPLETED: { label: 'Hoàn thành', color: 'text-emerald-600 bg-emerald-50 border-emerald-200', icon: Package },
  CANCELLED: { label: 'Đã huỷ', color: 'text-rose-600 bg-rose-50 border-rose-200', icon: XCircle }
};

const timelineSteps = ['WAITING_PAYMENT', 'CONFIRMED', 'PREPARING', 'PRODUCING', 'SHIPPED', 'COMPLETED'];

// ─── Star Rating Component ──────────────────────────────────────────────────
function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="p-0.5 transition-transform hover:scale-110 focus:outline-none cursor-pointer"
        >
          <Star
            className={`w-9 h-9 transition-colors ${
              star <= (hovered || value)
                ? 'fill-amber-400 text-amber-400'
                : 'fill-gray-200 text-gray-200'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

// ─── Review Star Display (read-only) ────────────────────────────────────────
function StarDisplay({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const sz = size === 'md' ? 'w-5 h-5' : 'w-4 h-4';
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} className={`${sz} ${s <= rating ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'}`} />
      ))}
    </div>
  );
}

export default function Orders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [orderStatusFilter, setOrderStatusFilter] = useState<'ALL' | 'INCOMPLETE' | 'COMPLETED' | 'CANCELLED'>('ALL');
  const [loading, setLoading] = useState(true);
  const [trackingOrder, setTrackingOrder] = useState<any | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [payOrder, setPayOrder] = useState<any | null>(null);
  const [paySeconds, setPaySeconds] = useState(0);
  const [cancelOrder, setCancelOrder] = useState<any | null>(null);
  const [alertModal, setAlertModal] = useState<{ type: 'success' | 'error' | 'info'; title: string; message: string } | null>(null);

  // ── Review states ──
  const [reviewDeadlineDays, setReviewDeadlineDays] = useState(7);
  const [reviewOrder, setReviewOrder] = useState<any | null>(null);        // đơn đang review
  const [reviewItems, setReviewItems] = useState<any[]>([]);               // items của đơn đó
  const [reviewStep, setReviewStep] = useState(0);                         // index item đang review
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewMedia, setReviewMedia] = useState<{ url: string; isVideo: boolean; name: string }[]>([]);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewUploading, setReviewUploading] = useState(false);
  const [orderReviews, setOrderReviews] = useState<Record<number, any[]>>({}); // orderId → reviews array
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ITEMS_PER_PAGE = 10;

  const filteredOrders = orders.filter(o => {
    if (orderStatusFilter === 'ALL') return true;
    if (orderStatusFilter === 'INCOMPLETE') return o.orderStatus !== 'COMPLETED' && o.orderStatus !== 'CANCELLED';
    if (orderStatusFilter === 'COMPLETED') return o.orderStatus === 'COMPLETED';
    if (orderStatusFilter === 'CANCELLED') return o.orderStatus === 'CANCELLED';
    return true;
  });

  const incompleteCount = orders.filter(o => o.orderStatus !== 'COMPLETED' && o.orderStatus !== 'CANCELLED').length;
  const completedCount = orders.filter(o => o.orderStatus === 'COMPLETED').length;
  const cancelledCount = orders.filter(o => o.orderStatus === 'CANCELLED').length;

  const fetchOrders = () => {
    setLoading(true);
    setCurrentPage(1);
    api.get('/orders/my')
      .then(r => setOrders(r.data))
      .finally(() => setLoading(false));
  };

  // Fetch review config & existing reviews for completed orders
  useEffect(() => {
    api.get('/reviews/config').then(r => setReviewDeadlineDays(r.data.reviewDeadlineDays)).catch(() => {});
  }, []);

  useEffect(() => {
    fetchOrders();
  }, []);

  // Khi orders load xong, fetch reviews cho các đơn COMPLETED
  useEffect(() => {
    const completedOrders = orders.filter(o => o.orderStatus === 'COMPLETED');
    completedOrders.forEach(o => {
      api.get(`/reviews/order/${o.orderId}`)
        .then(r => setOrderReviews(prev => ({ ...prev, [o.orderId]: r.data })))
        .catch(() => {});
    });
  }, [orders]);

  const confirmCancel = async () => {
    if (!cancelOrder) return;
    try {
      await api.patch(`/orders/${cancelOrder.orderId}/cancel`);
      setCancelOrder(null);
      fetchOrders();
      setAlertModal({ type: 'success', title: 'Thành công', message: 'Đã huỷ đơn hàng.' });
    } catch (e: any) {
      setAlertModal({ type: 'error', title: 'Lỗi', message: e.response?.data?.message || 'Không thể huỷ đơn hàng.' });
    }
  };

  const getUtcDate = (dateStr: string) => new Date(dateStr + (dateStr.endsWith('Z') ? '' : 'Z'));

  const handleContinuePayment = async (order: any) => {
    try {
      const res = await api.get(`/orders/${order.orderId}/sepay`);
      setPayOrder({ ...res.data, totalAmount: order.totalAmount });
    } catch (e: any) {
      setAlertModal({ type: 'error', title: 'Lỗi', message: e.response?.data?.message || 'Không thể lấy thông tin thanh toán.' });
    }
  };

  useEffect(() => {
    if (!payOrder) return;
    const update = () => setPaySeconds(Math.max(0, Math.ceil((getUtcDate(payOrder.expiredAt).getTime() - Date.now()) / 1000)));
    update();
    const t = setInterval(update, 1000);
    const p = setInterval(async () => {
      try {
        const r = await api.get(`/orders/${payOrder.orderId}`);
        if (r.data.paymentStatus === 'PAID') {
          setAlertModal({ type: 'success', title: 'Thanh toán thành công!', message: 'Cảm ơn bạn đã thanh toán. Đơn hàng của bạn đang được xử lý.' });
          setPayOrder(null);
          fetchOrders();
        } else if (r.data.orderStatus === 'CANCELLED') {
          setAlertModal({ type: 'info', title: 'Đã huỷ', message: 'Đơn hàng đã hết hạn thanh toán và bị huỷ.' });
          setPayOrder(null);
          fetchOrders();
        }
      } catch {}
    }, 5000);
    return () => { clearInterval(t); clearInterval(p); };
  }, [payOrder]);

  // ── Review helpers ──────────────────────────────────────────────────────────
  const getReviewStatus = (order: any) => {
    if (order.orderStatus !== 'COMPLETED') return 'not_applicable';
    const completedAt = order.completedAt ? getUtcDate(order.completedAt) : null;
    if (!completedAt) return 'not_applicable';
    const deadline = new Date(completedAt.getTime() + reviewDeadlineDays * 24 * 60 * 60 * 1000);
    const isExpired = Date.now() > deadline.getTime();

    let items: any[] = [];
    try { items = JSON.parse(order.itemsJson); } catch {}
    const reviews = orderReviews[order.orderId] || [];
    const reviewedProductIds = reviews.map((r: any) => r.productId);
    const unreviewedItems = items.filter((item: any) => !reviewedProductIds.includes(item.productId || item.ProductId));

    if (unreviewedItems.length === 0) return 'all_reviewed';
    if (isExpired) return 'expired';
    return 'can_review';
  };

  const openReviewModal = (order: any) => {
    let items: any[] = [];
    try { items = JSON.parse(order.itemsJson); } catch {}
    const reviews = orderReviews[order.orderId] || [];
    const reviewedProductIds = reviews.map((r: any) => r.productId);
    const unreviewedItems = items.filter((item: any) => !reviewedProductIds.includes(item.productId || item.ProductId));

    setReviewOrder(order);
    setReviewItems(unreviewedItems);
    setReviewStep(0);
    setReviewRating(0);
    setReviewComment('');
    setReviewMedia([]);
  };

  const handleMediaUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setReviewUploading(true);
    const uploaded: { url: string; isVideo: boolean; name: string }[] = [];
    for (const file of Array.from(files)) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await api.post('/reviews/upload-media', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        uploaded.push({ url: res.data.url, isVideo: res.data.isVideo, name: file.name });
      } catch (e: any) {
        setAlertModal({ type: 'error', title: 'Upload thất bại', message: e.response?.data?.message || `Không thể upload ${file.name}.` });
      }
    }
    setReviewMedia(prev => [...prev, ...uploaded]);
    setReviewUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const submitReview = async (skip = false) => {
    const currentItem = reviewItems[reviewStep];
    if (!currentItem) return;

    if (!skip) {
      if (reviewRating === 0) {
        setAlertModal({ type: 'error', title: 'Chưa chọn sao', message: 'Vui lòng chọn số sao đánh giá.' });
        return;
      }
      setReviewSubmitting(true);
      try {
        await api.post('/reviews', {
          orderId: reviewOrder.orderId,
          productId: currentItem.productId || currentItem.ProductId,
          productName: currentItem.name || currentItem.Name || '',
          rating: reviewRating,
          comment: reviewComment.trim() || null,
          mediaUrls: reviewMedia.map(m => m.url)
        });
        // Refresh reviews for this order
        const res = await api.get(`/reviews/order/${reviewOrder.orderId}`);
        setOrderReviews(prev => ({ ...prev, [reviewOrder.orderId]: res.data }));
      } catch (e: any) {
        setAlertModal({ type: 'error', title: 'Lỗi', message: e.response?.data?.message || 'Không thể gửi đánh giá.' });
        setReviewSubmitting(false);
        return;
      }
      setReviewSubmitting(false);
    }

    // Sang item tiếp theo hoặc đóng
    if (reviewStep < reviewItems.length - 1) {
      setReviewStep(prev => prev + 1);
      setReviewRating(0);
      setReviewComment('');
      setReviewMedia([]);
    } else {
      setReviewOrder(null);
      if (!skip) {
        setAlertModal({ type: 'success', title: 'Cảm ơn bạn!', message: 'Đánh giá của bạn đã được ghi nhận thành công.' });
      }
    }
  };

  const currentReviewItem = reviewItems[reviewStep];
  const resolveImgUrl = (url?: string) => !url ? '' : url.startsWith('http') ? url : `http://localhost:5234${url}`;

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Đơn mua của tôi</h1>
          <p className="text-sm text-gray-500 mt-1">Quản lý và theo dõi tiến độ các đơn hàng của bạn</p>
        </div>

        {orders.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 p-1.5 bg-gray-100/90 rounded-2xl border border-gray-200/80 w-fit shadow-xs">
            <button
              type="button"
              onClick={() => { setOrderStatusFilter('ALL'); setCurrentPage(1); }}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
                orderStatusFilter === 'ALL'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span>Tất cả</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                orderStatusFilter === 'ALL' ? 'bg-gray-100 text-gray-800' : 'bg-gray-200/70 text-gray-600'
              }`}>
                {orders.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => { setOrderStatusFilter('INCOMPLETE'); setCurrentPage(1); }}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
                orderStatusFilter === 'INCOMPLETE'
                  ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/20'
                  : 'text-amber-800 hover:bg-amber-100/60'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Chưa hoàn thành</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                orderStatusFilter === 'INCOMPLETE' ? 'bg-white/25 text-white' : 'bg-amber-100 text-amber-800'
              }`}>
                {incompleteCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => { setOrderStatusFilter('COMPLETED'); setCurrentPage(1); }}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
                orderStatusFilter === 'COMPLETED'
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
                  : 'text-emerald-800 hover:bg-emerald-100/60'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Đã hoàn thành</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                orderStatusFilter === 'COMPLETED' ? 'bg-white/25 text-white' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {completedCount}
              </span>
            </button>

            {cancelledCount > 0 && (
              <button
                type="button"
                onClick={() => { setOrderStatusFilter('CANCELLED'); setCurrentPage(1); }}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  orderStatusFilter === 'CANCELLED'
                    ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/20'
                    : 'text-rose-700 hover:bg-rose-100/60'
                }`}
              >
                <XCircle className="w-4 h-4" />
                <span>Đã huỷ</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  orderStatusFilter === 'CANCELLED' ? 'bg-white/25 text-white' : 'bg-rose-100 text-rose-700'
                }`}>
                  {cancelledCount}
                </span>
              </button>
            )}
          </div>
        )}
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        </div>
      ) : orders.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-gray-300 bg-gray-50/50 p-12 text-center">
          <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Chưa có đơn hàng nào</h3>
          <p className="text-gray-500 mb-6">Bạn chưa thực hiện giao dịch nào trên FurniMatch.</p>
          <Link className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white hover:bg-emerald-700 transition-colors shadow-sm shadow-emerald-200" to="/products">
            Khám phá sản phẩm ngay
          </Link>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
          <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {orderStatusFilter === 'INCOMPLETE'
              ? 'Không có đơn hàng nào chưa hoàn thành.'
              : orderStatusFilter === 'COMPLETED'
              ? 'Chưa có đơn hàng nào đã hoàn thành.'
              : orderStatusFilter === 'CANCELLED'
              ? 'Không có đơn hàng nào đã huỷ.'
              : 'Chưa có đơn hàng nào.'}
          </h3>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredOrders.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map(o => {
            let items: any[] = [];
            try { items = JSON.parse(o.itemsJson); } catch {}
            const StatusIcon = statusConfig[o.orderStatus]?.icon || Clock;
            const reviewStatus = getReviewStatus(o);
            
            return (
              <article key={o.orderId} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 pb-5 gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-bold text-gray-900">Đơn #{o.orderCode}</h3>
                      <Link to={`/shop/${o.sellerId}`} className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-md transition-colors">
                        <Store className="w-3.5 h-3.5" />
                        {o.shopName || 'Xưởng nội thất'}
                      </Link>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{getUtcDate(o.createdAt).toLocaleString('vi-VN', { dateStyle: 'full', timeStyle: 'short' })}</p>
                  </div>
                  <div className={`flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium ${statusConfig[o.orderStatus]?.color || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                    <StatusIcon className="w-4 h-4" />
                    <span>{statusConfig[o.orderStatus]?.label || o.orderStatus}</span>
                  </div>
                </div>
                
                <div className="py-2">
                  {items.map((x, i) => {
                    const name = x.name || x.Name;
                    const sizeLabel = x.sizeLabel || x.SizeLabel;
                    const quantity = x.quantity || x.Quantity;
                    const price = x.price || x.Price;
                    const imageUrl = x.imageUrl || x.ImageUrl;
                    return (
                      <div key={i} className="flex justify-between py-4 group">
                        <div className="flex gap-4 items-center">
                          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border bg-gray-50 flex items-center justify-center">
                            {imageUrl ? (
                              <img 
                                src={imageUrl.startsWith('http') ? imageUrl : `http://localhost:5234${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`} 
                                alt={name || 'Sản phẩm'} 
                                className="h-full w-full object-cover" 
                                onError={(e) => {
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.src = 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=300';
                                }}
                              />
                            ) : (
                              <Package className="h-8 w-8 text-gray-300" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 group-hover:text-emerald-600 transition-colors">{name}</p>
                            <p className="text-sm text-gray-500 mt-1">{sizeLabel}</p>
                            <p className="text-sm font-medium text-gray-700 mt-1">SL: {quantity}</p>
                          </div>
                        </div>
                        <strong className="text-gray-900">{money(price * quantity)}</strong>
                      </div>
                    );
                  })}
                </div>

                {(o.note || o.Note) && (
                  <div className="mb-4 px-4 py-2.5 bg-amber-50/70 border border-amber-200/70 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                    <span className="font-semibold shrink-0 text-amber-800">📝 Ghi chú:</span>
                    <span className="leading-relaxed">{o.note || o.Note}</span>
                  </div>
                )}
                
                <div className="flex flex-col sm:flex-row justify-between items-end sm:items-center border-t border-gray-100 pt-5 gap-4">
                  <div className="flex flex-wrap gap-3 w-full sm:w-auto">
                    <button 
                      onClick={() => setTrackingOrder(o)}
                      className="flex-1 sm:flex-none rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 transition-colors shadow-sm cursor-pointer"
                    >
                      Theo dõi đơn hàng
                    </button>

                    {/* ── Nút Viết đánh giá ── */}
                    {reviewStatus === 'can_review' && (
                      <button
                        onClick={() => openReviewModal(o)}
                        className="flex-1 sm:flex-none rounded-xl bg-amber-400 hover:bg-amber-500 px-5 py-2.5 text-sm font-semibold text-amber-900 transition-colors shadow-sm cursor-pointer flex items-center gap-2"
                      >
                        <Star className="w-4 h-4" />
                        Viết đánh giá
                      </button>
                    )}
                    {reviewStatus === 'all_reviewed' && (
                      <span className="flex-1 sm:flex-none rounded-xl bg-emerald-50 border border-emerald-200 px-5 py-2.5 text-sm font-semibold text-emerald-700 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        Đã đánh giá
                      </span>
                    )}
                    {reviewStatus === 'expired' && (
                      <span className="flex-1 sm:flex-none rounded-xl bg-gray-50 border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-400 flex items-center gap-2 cursor-not-allowed" title={`Hết hạn đánh giá sau ${reviewDeadlineDays} ngày`}>
                        <Clock className="w-4 h-4" />
                        Hết hạn đánh giá
                      </span>
                    )}

                    {o.orderStatus === 'WAITING_PAYMENT' && getUtcDate(o.paymentExpiredAt).getTime() > Date.now() && (
                      <button
                        onClick={() => handleContinuePayment(o)}
                        className="flex-1 sm:flex-none rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors shadow-sm cursor-pointer"
                      >
                        Tiếp tục thanh toán
                      </button>
                    )}
                    {o.orderStatus === 'WAITING_PAYMENT' && (
                      <button 
                        onClick={() => setCancelOrder(o)}
                        className="flex-1 sm:flex-none rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 transition-colors shadow-sm cursor-pointer"
                      >
                        Huỷ đơn hàng
                      </button>
                    )}
                  </div>
                  <div className="text-right w-full sm:w-auto">
                    <span className="text-sm text-gray-500 mr-3">Tổng thanh toán:</span>
                    <strong className="text-xl text-emerald-600">{money(o.totalAmount)}</strong>
                  </div>
                </div>
              </article>
            );
          })}

          {filteredOrders.length > 0 && (
            <div className="flex justify-center items-center gap-4 mt-8">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1 || Math.ceil(filteredOrders.length / ITEMS_PER_PAGE) <= 1}
                className="px-5 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-emerald-600 disabled:opacity-50 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed font-semibold shadow-sm transition-all"
              >
                Trước
              </button>
              <div className="flex items-center justify-center min-w-[80px] px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 text-gray-700 font-medium">
                {currentPage} / {Math.max(1, Math.ceil(filteredOrders.length / ITEMS_PER_PAGE))}
              </div>
              <button 
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredOrders.length / ITEMS_PER_PAGE), p + 1))}
                disabled={currentPage === Math.ceil(filteredOrders.length / ITEMS_PER_PAGE) || Math.ceil(filteredOrders.length / ITEMS_PER_PAGE) <= 1}
                className="px-5 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-emerald-600 disabled:opacity-50 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed font-semibold shadow-sm transition-all"
              >
                Sau
              </button>
            </div>
          )}
        </div>
      )}

      {/* ────────────────────── REVIEW MODAL ────────────────────────────────── */}
      {reviewOrder && currentReviewItem && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm" onClick={() => setReviewOrder(null)}>
          <div
            className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl"
            style={{ animation: 'fadeInScale 0.2s ease' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-7 pt-7 pb-5 border-b border-gray-100">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-xl font-bold text-gray-900">Viết đánh giá</h2>
                <button onClick={() => setReviewOrder(null)} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
              {/* Stepper */}
              {reviewItems.length > 1 && (
                <div className="flex items-center gap-1.5 mt-3">
                  {reviewItems.map((_, idx) => (
                    <div
                      key={idx}
                      className={`h-1.5 flex-1 rounded-full transition-colors ${idx < reviewStep ? 'bg-emerald-500' : idx === reviewStep ? 'bg-amber-400' : 'bg-gray-200'}`}
                    />
                  ))}
                  <span className="text-xs text-gray-500 ml-2 shrink-0">{reviewStep + 1}/{reviewItems.length}</span>
                </div>
              )}
            </div>

            <div className="px-7 py-6 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* Tên sản phẩm */}
              <div className="flex items-center gap-4 bg-gray-50 rounded-2xl p-4">
                <div className="h-14 w-14 shrink-0 rounded-xl overflow-hidden border bg-white">
                  {(currentReviewItem.imageUrl || currentReviewItem.ImageUrl)
                    ? <img src={resolveImgUrl(currentReviewItem.imageUrl || currentReviewItem.ImageUrl)} alt="" className="h-full w-full object-cover" />
                    : <Package className="h-full w-full p-3 text-gray-300" />}
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-0.5">Sản phẩm đánh giá</p>
                  <p className="font-semibold text-gray-900 leading-snug">{currentReviewItem.name || currentReviewItem.Name}</p>
                </div>
              </div>

              {/* Star rating */}
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600 mb-3">
                  Chấm điểm đơn hàng của bạn <span className="text-rose-500">*</span>
                </p>
                <div className="flex justify-center">
                  <StarRating value={reviewRating} onChange={setReviewRating} />
                </div>
                {reviewRating > 0 && (
                  <p className="text-sm text-amber-600 font-medium mt-2">
                    {['', 'Rất tệ', 'Không hài lòng', 'Bình thường', 'Hài lòng', 'Tuyệt vời!'][reviewRating]}
                  </p>
                )}
              </div>

              {/* Comment */}
              <div>
                <textarea
                  value={reviewComment}
                  onChange={e => setReviewComment(e.target.value.slice(0, 300))}
                  placeholder="Bạn thích hoặc không thích điều gì về sản phẩm này?"
                  rows={4}
                  className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-transparent transition-all"
                />
                <div className="text-right text-xs text-gray-400 mt-1">{reviewComment.length}/300</div>
              </div>

              {/* Upload media */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-gray-500" />
                  Thêm ảnh hoặc video
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                  onChange={e => handleMediaUpload(e.target.files)}
                />

                {/* Preview grid */}
                {reviewMedia.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {reviewMedia.map((m, i) => (
                      <div key={i} className="relative group aspect-square rounded-xl overflow-hidden border bg-gray-100">
                        {m.isVideo
                          ? <div className="h-full flex flex-col items-center justify-center gap-1 text-gray-500">
                              <Video className="w-6 h-6" />
                              <span className="text-[10px] px-1 text-center leading-tight truncate w-full text-center">{m.name}</span>
                            </div>
                          : <img src={resolveImgUrl(m.url)} alt="" className="h-full w-full object-cover" />}
                        <button
                          onClick={() => setReviewMedia(prev => prev.filter((_, idx) => idx !== i))}
                          className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={reviewUploading || reviewMedia.length >= 9}
                  className="w-full border-2 border-dashed border-gray-200 rounded-2xl py-4 flex flex-col items-center gap-2 text-gray-500 hover:border-amber-300 hover:text-amber-600 hover:bg-amber-50/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {reviewUploading
                    ? <><Loader2 className="w-6 h-6 animate-spin" /><span className="text-sm">Đang tải lên...</span></>
                    : <><Upload className="w-6 h-6" /><span className="text-sm font-medium">Thêm ảnh hoặc video</span><span className="text-xs text-gray-400">JPG, PNG, WEBP, MP4, MOV · Tối đa 20MB/file · {reviewMedia.length}/9</span></>}
                </button>
              </div>
            </div>

            {/* Footer actions */}
            <div className="px-7 pb-7 pt-4 flex gap-3 border-t border-gray-100">
              {reviewItems.length > 1 && (
                <button
                  onClick={() => submitReview(true)}
                  disabled={reviewSubmitting}
                  className="flex-1 rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Bỏ qua
                </button>
              )}
              <button
                onClick={() => submitReview(false)}
                disabled={reviewSubmitting || reviewRating === 0}
                className="flex-2 flex-1 rounded-2xl bg-amber-400 hover:bg-amber-500 disabled:bg-gray-200 disabled:text-gray-400 px-4 py-3.5 text-sm font-bold text-amber-900 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                {reviewSubmitting
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang gửi...</>
                  : reviewStep < reviewItems.length - 1
                    ? <><span>Gửi & tiếp theo</span><ChevronRight className="w-4 h-4" /></>
                    : 'Gửi đánh giá'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tracking Modal */}
      {trackingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm" onClick={() => setTrackingOrder(null)}>
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Chi tiết theo dõi đơn hàng</h2>
                <p className="text-sm text-gray-500 mt-1">Mã đơn: <span className="font-medium text-gray-900">{trackingOrder.orderCode}</span></p>
              </div>
              <button onClick={() => setTrackingOrder(null)} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {trackingOrder.orderStatus === 'CANCELLED' ? (
                <div className="rounded-2xl bg-rose-50 border border-rose-100 p-6 flex flex-col items-center text-center">
                  <XCircle className="w-16 h-16 text-rose-500 mb-4" />
                  <h3 className="text-lg font-bold text-rose-700">Đơn hàng đã bị huỷ</h3>
                  <p className="text-rose-600/80 mt-2">Đơn hàng này không còn hiệu lực. Vui lòng đặt đơn hàng mới nếu bạn vẫn muốn mua sản phẩm.</p>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-8 top-8 bottom-8 w-0.5 bg-gray-100 rounded-full"></div>
                  <div className="space-y-6 relative">
                    {timelineSteps.map((step, index) => {
                      const StepIcon = statusConfig[step].icon;
                      const currentIndex = timelineSteps.indexOf(trackingOrder.orderStatus);
                      const isCompleted = index <= currentIndex && trackingOrder.orderStatus !== 'CANCELLED';
                      const isCurrent = index === currentIndex;
                      
                      return (
                        <div key={step} className={`flex items-start gap-6 ${isCompleted ? 'opacity-100' : 'opacity-40 grayscale'}`}>
                          <div className={`relative z-10 flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border-4 border-white shadow-sm ${isCurrent ? 'bg-emerald-600 text-white scale-110' : isCompleted ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'} transition-all duration-300`}>
                            <StepIcon className="w-7 h-7" />
                          </div>
                          <div className="pt-4 flex-1">
                            <h4 className={`text-lg font-bold ${isCurrent ? 'text-emerald-700' : 'text-gray-900'}`}>{statusConfig[step].label}</h4>
                            {isCurrent && (
                              <p className="text-sm text-gray-500 mt-1">
                                {step === 'WAITING_PAYMENT' ? 'Đang chờ bạn hoàn tất thanh toán.' :
                                 step === 'CONFIRMED' ? 'Người bán đã nhận được đơn hàng và đang chờ xử lý.' :
                                 step === 'PREPARING' ? 'Sản phẩm đang được chuẩn bị nguyên vật liệu.' :
                                 step === 'PRODUCING' ? 'Sản phẩm đang được chế tác tại xưởng.' :
                                 step === 'SHIPPED' ? 'Đơn hàng đang trên đường giao tới bạn.' :
                                 'Đơn hàng đã giao thành công.'}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Reviews section in tracking modal */}
              {trackingOrder.orderStatus === 'COMPLETED' && (orderReviews[trackingOrder.orderId] || []).length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    Đánh giá của bạn
                  </h4>
                  <div className="space-y-3">
                    {(orderReviews[trackingOrder.orderId] || []).map((rv: any) => {
                      let mediaUrls: string[] = [];
                      try { mediaUrls = JSON.parse(rv.mediaJson || '[]'); } catch {}
                      return (
                        <div key={rv.reviewId} className="bg-gray-50 rounded-2xl p-4">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-semibold text-sm text-gray-800">{rv.productName}</p>
                            <StarDisplay rating={rv.rating} />
                          </div>
                          {rv.comment && <p className="text-sm text-gray-600 leading-relaxed">{rv.comment}</p>}
                          {mediaUrls.length > 0 && (
                            <div className="flex gap-2 mt-3 flex-wrap">
                              {mediaUrls.map((url, i) => (
                                <a key={i} href={resolveImgUrl(url)} target="_blank" rel="noreferrer">
                                  <img src={resolveImgUrl(url)} alt="" className="h-16 w-16 rounded-xl object-cover border hover:opacity-80 transition-opacity" />
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            
            <div className="px-8 py-5 border-t border-gray-100 bg-gray-50/50 flex justify-end">
              <button 
                onClick={() => setTrackingOrder(null)}
                className="rounded-xl bg-gray-900 px-6 py-2.5 font-semibold text-white hover:bg-gray-800 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {payOrder && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm" onClick={() => setPayOrder(null)}>
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 p-8 text-center relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setPayOrder(null)} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors">
              <XCircle className="w-6 h-6" />
            </button>
            <h2 className="text-2xl font-bold text-[#0b6e4f]">Thanh toán qua SePay</h2>
            <p className="mt-3 font-bold text-gray-700">⏱ Còn lại: {String(Math.floor(paySeconds / 60)).padStart(2, '0')}:{String(paySeconds % 60).padStart(2, '0')}</p>
            <div className="mt-4 h-2 w-full rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full bg-emerald-600 transition-all duration-1000" style={{ width: `${Math.min(100, paySeconds / 18)}%` }} />
            </div>
            {payOrder.qrCodeUrl ? (
              <img src={payOrder.qrCodeUrl} alt="Mã QR thanh toán SePay" className="mx-auto mt-7 h-56 w-56 object-contain" />
            ) : (
              <div className="mt-7 h-56 w-56 mx-auto flex items-center justify-center border-2 border-dashed border-gray-200 rounded-xl">
                <p className="text-gray-500">Đang tải mã QR…</p>
              </div>
            )}
            <p className="mt-6 text-gray-700">Mã đơn: <strong className="text-gray-900 text-lg">{payOrder.orderCode}</strong></p>
            <p className="mt-2 text-gray-700">Số tiền: <strong className="text-emerald-600 text-xl">{money(payOrder.totalAmount)}</strong></p>
            <p className="mt-6 text-sm text-gray-500 bg-gray-50 p-4 rounded-xl">
              Quét QR bằng ứng dụng ngân hàng. Hệ thống sẽ tự xác nhận khi nhận đúng số tiền và nội dung chuyển khoản.
            </p>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {cancelOrder && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm" onClick={() => setCancelOrder(null)}>
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 p-8 text-center" onClick={e => e.stopPropagation()}>
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-rose-100 mb-6">
              <XCircle className="h-8 w-8 text-rose-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Huỷ đơn hàng?</h2>
            <p className="text-gray-500 mb-8">
              Bạn có chắc chắn muốn huỷ đơn hàng <strong className="text-gray-700">#{cancelOrder.orderCode}</strong>? Hành động này không thể hoàn tác.
            </p>
            <div className="flex gap-3 w-full">
              <button 
                onClick={() => setCancelOrder(null)} 
                className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Không
              </button>
              <button 
                onClick={confirmCancel} 
                className="flex-1 rounded-xl bg-rose-600 px-4 py-3 font-semibold text-white hover:bg-rose-700 transition-colors shadow-sm shadow-rose-200"
              >
                Huỷ đơn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      {alertModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm" onClick={() => setAlertModal(null)}>
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 p-8 text-center" onClick={e => e.stopPropagation()}>
            <div className={`mx-auto flex items-center justify-center h-16 w-16 rounded-full mb-6 ${alertModal.type === 'success' ? 'bg-emerald-100 text-emerald-600' : alertModal.type === 'error' ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'}`}>
              {alertModal.type === 'success' ? <CheckCircle2 className="h-8 w-8" /> : alertModal.type === 'error' ? <XCircle className="h-8 w-8" /> : <Info className="h-8 w-8" />}
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">{alertModal.title}</h2>
            <p className="text-gray-500 mb-8">{alertModal.message}</p>
            <button 
              onClick={() => setAlertModal(null)} 
              className="w-full rounded-xl bg-gray-900 px-4 py-3 font-semibold text-white hover:bg-gray-800 transition-colors shadow-sm"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
