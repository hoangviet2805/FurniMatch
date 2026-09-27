import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import {
  CheckCircle2, Clock, XCircle, Package, Truck, Hammer,
  ClipboardList, Store, Info, Star, Upload, X, ChevronRight,
  Image as ImageIcon, Video, Loader2, ShieldAlert, AlertTriangle, Wallet,
  MapPin, Edit3, Trash2
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

  // ── Dispute states ──
  const [disputeOrder, setDisputeOrder] = useState<any | null>(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeFiles, setDisputeFiles] = useState<{ file: File; preview: string }[]>([]);
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);
  const [viewDisputeModal, setViewDisputeModal] = useState<{ isOpen: boolean; order: any | null; dispute: any | null }>({
    isOpen: false,
    order: null,
    dispute: null
  });
  const [viewDisputeImageModal, setViewDisputeImageModal] = useState<{ isOpen: boolean; url: string; title: string }>({
    isOpen: false,
    url: '',
    title: ''
  });
  const disputeFileInputRef = useRef<HTMLInputElement>(null);

  // ── Edit shipping info states ──
  const [editShippingOrder, setEditShippingOrder] = useState<any | null>(null);
  const [editShippingName, setEditShippingName] = useState('');
  const [editShippingPhone, setEditShippingPhone] = useState('');
  const [editShippingAddress, setEditShippingAddress] = useState('');
  const [editShippingNote, setEditShippingNote] = useState('');
  const [editShippingSaving, setEditShippingSaving] = useState(false);
  
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
      .then(r => setOrders(r.data.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())))
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
    const referenceDateStr = order.createdAt;
    const referenceDate = referenceDateStr ? getUtcDate(referenceDateStr) : null;
    if (!referenceDate) return 'not_applicable';
    const deadline = new Date(referenceDate.getTime() + reviewDeadlineDays * 24 * 60 * 60 * 1000);
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

  // ── Dispute helpers ──────────────────────────────────────────────────────────
  const getDisputeEligibility = (order: any) => {
    if (order.orderStatus !== 'COMPLETED') return { canDispute: false };
    if (order.dispute) return { canDispute: false, hasDispute: true, dispute: order.dispute };

    const completedAt = order.completedAt ? getUtcDate(order.completedAt) : (order.updatedAt ? getUtcDate(order.updatedAt) : null);
    if (!completedAt) return { canDispute: false };

    const deadline = new Date(completedAt.getTime() + 3 * 24 * 60 * 60 * 1000);
    const diffMs = deadline.getTime() - Date.now();

    if (diffMs <= 0) {
      return { canDispute: false, isExpired: true };
    }

    const remainingHours = Math.floor(diffMs / (1000 * 60 * 60));
    const remainingDays = Math.floor(remainingHours / 24);
    const remHours = remainingHours % 24;

    const timeLabel = remainingDays > 0 ? `${remainingDays} ngày ${remHours} giờ` : `${remHours} giờ`;
    return { canDispute: true, timeLabel, deadline };
  };

  const handleOpenDispute = (order: any) => {
    setDisputeOrder(order);
    setDisputeReason('');
    setDisputeFiles([]);
  };

  const handleDisputeFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newFiles: { file: File; preview: string }[] = [];
    Array.from(files).forEach(f => {
      if (f.type.startsWith('image/')) {
        newFiles.push({ file: f, preview: URL.createObjectURL(f) });
      }
    });
    setDisputeFiles(prev => [...prev, ...newFiles].slice(0, 5));
    if (disputeFileInputRef.current) disputeFileInputRef.current.value = '';
  };

  const handleRemoveDisputeFile = (idx: number) => {
    setDisputeFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmitDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputeOrder) return;
    if (!disputeReason.trim()) {
      setAlertModal({ type: 'error', title: 'Thiếu lý do', message: 'Vui lòng nhập lý do khiếu nại.' });
      return;
    }
    setDisputeSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('reason', disputeReason.trim());
      disputeFiles.forEach(item => {
        formData.append('images', item.file);
      });

      await api.post(`/orders/${disputeOrder.orderId}/dispute`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setAlertModal({
        type: 'success',
        title: 'Đã gửi khiếu nại thành công!',
        message: 'Khiếu nại kèm hình ảnh của bạn đã được chuyển tới Admin để xem xét. Khi được chấp thuận, số tiền sẽ được hoàn vào ví của bạn để bạn có thể rút về tài khoản ngân hàng.'
      });
      setDisputeOrder(null);
      setDisputeReason('');
      setDisputeFiles([]);
      fetchOrders();
    } catch (err: any) {
      setAlertModal({
        type: 'error',
        title: 'Gửi khiếu nại thất bại',
        message: err.response?.data?.message || 'Có lỗi xảy ra khi gửi khiếu nại. Vui lòng thử lại.'
      });
    } finally {
      setDisputeSubmitting(false);
    }
  };

  // ── Shipping Update helpers ──────────────────────────────────────────────────
  const canUpdateShipping = (order: any) => {
    // Cho phép cập nhật khi đơn hàng đang ở bước chuẩn bị hàng (chưa bàn giao giao hàng)
    const allowed = ['PREPARING', 'PRODUCING', 'CONFIRMED'];
    return allowed.includes(order.orderStatus);
  };

  const handleOpenEditShipping = (order: any) => {
    setEditShippingOrder(order);
    setEditShippingName(order.recipientName || '');
    setEditShippingPhone(order.recipientPhone || '');
    setEditShippingAddress(order.address || '');
    setEditShippingNote(order.note || '');
  };

  const handleSaveShipping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editShippingOrder) return;
    if (!editShippingName.trim() || !editShippingPhone.trim() || !editShippingAddress.trim()) {
      setAlertModal({
        type: 'error',
        title: 'Thiếu thông tin',
        message: 'Vui lòng điền đầy đủ Tên người nhận, Số điện thoại và Địa chỉ giao hàng.'
      });
      return;
    }

    setEditShippingSaving(true);
    try {
      await api.put(`/orders/${editShippingOrder.orderId}/shipping-info`, {
        recipientName: editShippingName.trim(),
        phone: editShippingPhone.trim(),
        address: editShippingAddress.trim(),
        note: editShippingNote.trim()
      });

      // Cập nhật state đơn hàng cục bộ để hiển thị ngay
      setOrders(prev => prev.map(o => o.orderId === editShippingOrder.orderId ? {
        ...o,
        recipientName: editShippingName.trim(),
        recipientPhone: editShippingPhone.trim(),
        address: editShippingAddress.trim(),
        note: editShippingNote.trim()
      } : o));

      setAlertModal({
        type: 'success',
        title: 'Cập nhật thành công!',
        message: 'Thông tin nhận hàng đã được lưu và gửi thông báo cập nhật tới xưởng sản xuất.'
      });
      setEditShippingOrder(null);
    } catch (err: any) {
      setAlertModal({
        type: 'error',
        title: 'Cập nhật thất bại',
        message: err.response?.data?.message || 'Có lỗi xảy ra khi cập nhật địa chỉ giao hàng. Vui lòng thử lại.'
      });
    } finally {
      setEditShippingSaving(false);
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
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3 w-full sm:w-auto max-w-full">
            <div className="flex overflow-x-auto items-center gap-2 p-1.5 bg-gray-100/90 rounded-2xl border border-gray-200/80 w-full sm:w-auto max-w-full shadow-xs [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <button
              type="button"
              onClick={() => { setOrderStatusFilter('ALL'); setCurrentPage(1); }}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 whitespace-nowrap ${
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
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 whitespace-nowrap ${
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
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 whitespace-nowrap ${
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
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 whitespace-nowrap ${
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

            {cancelledCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowConfirmDelete(true)}
                title="Dọn dẹp rác (Xóa tất cả đơn đã hủy)"
                className="px-3 py-2 rounded-xl text-sm font-bold text-gray-500 hover:bg-rose-100 hover:text-rose-600 transition-all flex items-center gap-2 cursor-pointer shrink-0 whitespace-nowrap border border-transparent hover:border-rose-200"
              >
                <Trash2 className="w-4 h-4" />
                <span>Dọn dẹp rác</span>
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
            const disputeInfo = getDisputeEligibility(o);
            
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

                {/* ── Thông tin nhận hàng & Nút cập nhật địa chỉ khi đang chuẩn bị hàng ── */}
                <div className="mb-4 p-3.5 bg-gray-50/80 rounded-2xl border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 font-bold text-gray-800">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Giao tới:</span>
                      </span>
                      <span className="font-semibold text-gray-900">{o.recipientName || o.RecipientName}</span>
                      <span className="text-gray-300">|</span>
                      <span className="font-mono text-gray-700">{o.recipientPhone || o.RecipientPhone}</span>
                    </div>
                    <p className="text-gray-600 leading-relaxed pl-5">{o.address || o.Address}</p>
                  </div>

                  {canUpdateShipping(o) && (
                    <button
                      type="button"
                      onClick={() => handleOpenEditShipping(o)}
                      className="shrink-0 self-start sm:self-center px-3 py-1.5 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 hover:border-emerald-400 rounded-xl font-semibold text-xs transition shadow-2xs cursor-pointer flex items-center gap-1.5"
                      title="Cập nhật tên, SĐT hoặc địa chỉ nhận hàng"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Đổi địa chỉ nhận</span>
                    </button>
                  )}
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
                      <button
                        disabled
                        className="flex-1 sm:flex-none rounded-xl bg-gray-100 border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-400 cursor-not-allowed flex items-center gap-2"
                        title={`Đã qua thời hạn ${reviewDeadlineDays} ngày để đánh giá`}
                      >
                        <Star className="w-4 h-4" />
                        Viết đánh giá
                      </button>
                    )}

                    {/* ── Nút / Trạng thái Khiếu nại (trong vòng 3 ngày sau hoàn thành) ── */}
                    {o.orderStatus === 'COMPLETED' && (
                      <>
                        {o.dispute ? (
                          <button
                            onClick={() => setViewDisputeModal({ isOpen: true, order: o, dispute: o.dispute })}
                            className={`flex-1 sm:flex-none rounded-xl px-4 py-2.5 text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 ${
                              o.dispute.status === 'OPEN'
                                ? 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200'
                                : o.dispute.status === 'RESOLVED'
                                ? 'bg-blue-100 text-blue-900 border border-blue-300 hover:bg-blue-200'
                                : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
                            }`}
                            title="Xem chi tiết khiếu nại"
                          >
                            <ShieldAlert className="w-4 h-4 shrink-0" />
                            <span>
                              {o.dispute.status === 'OPEN' && '⚠️ Đang khiếu nại'}
                              {o.dispute.status === 'RESOLVED' && '💰 Khiếu nại được chấp thuận (Đã hoàn tiền)'}
                              {o.dispute.status === 'REJECTED' && '❌ Khiếu nại đã bị hủy'}
                            </span>
                          </button>
                        ) : (
                          <>
                            {disputeInfo.canDispute ? (
                              <button
                                onClick={() => handleOpenDispute(o)}
                                className="flex-1 sm:flex-none rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 px-4 py-2.5 text-xs font-bold text-amber-900 transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
                                title={`Chỉ được khiếu nại trong vòng 3 ngày sau khi hoàn thành. Thời hạn còn lại: ${disputeInfo.timeLabel}`}
                              >
                                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                                <span>Khiếu nại</span>
                                <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded-full font-medium">
                                  Còn {disputeInfo.timeLabel}
                                </span>
                              </button>
                            ) : (
                              <span className="text-xs text-gray-400 self-center hidden sm:inline italic">
                                (Hết hạn 3 ngày khiếu nại)
                              </span>
                            )}
                          </>
                        )}
                      </>
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

      {/* ────────────────────── DISPUTE FORM MODAL ─────────────────────────── */}
      {disputeOrder && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm" onClick={() => setDisputeOrder(null)}>
          <div
            className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-[fadeInScale_0.2s_ease]"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-5 bg-gradient-to-r from-amber-600 via-amber-700 to-orange-700 text-white flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5" />
                  Khiếu Nại Đơn Hàng #{disputeOrder.orderCode}
                </h2>
                <p className="text-xs text-amber-100 mt-0.5">
                  Thời hạn: Trong vòng 3 ngày sau khi hoàn thành đơn
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDisputeOrder(null)}
                className="p-1 hover:bg-white/10 rounded-lg transition text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitDispute} className="p-6 space-y-4 text-sm max-h-[80vh] overflow-y-auto">
              <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 space-y-1">
                <p className="font-bold text-amber-950 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Chính sách giải quyết khiếu nại:
                </p>
                <p>• Giá trị đơn hàng cần khiếu nại: <strong className="text-gray-900 font-semibold">{money(disputeOrder.totalAmount)}</strong></p>
                <p>• Vui lòng cung cấp lý do cụ thể và tải lên hình ảnh chụp thực tế rõ nét (hàng bị móp méo, bể vỡ, sai màu sắc hoặc kích thước...).</p>
                <p className="text-amber-800 pt-1">
                  💡 <strong>Quyền lợi của bạn:</strong> Nếu Admin chấp thuận khiếu nại, tiền đơn hàng sẽ được hoàn trả tự động vào <strong>Ví số dư</strong> của bạn và bạn có thể tạo yêu cầu rút về tài khoản ngân hàng bất kỳ lúc nào.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Lý do khiếu nại chi tiết <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={disputeReason}
                  onChange={e => setDisputeReason(e.target.value)}
                  placeholder="Mô tả chi tiết vấn đề bạn gặp phải với đơn hàng này..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-gray-900 resize-none text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Hình ảnh bằng chứng (Tối đa 5 ảnh)
                </label>
                
                <input
                  type="file"
                  ref={disputeFileInputRef}
                  onChange={handleDisputeFileChange}
                  multiple
                  accept="image/*"
                  className="hidden"
                />

                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5 mb-2">
                  {disputeFiles.map((fileObj, idx) => (
                    <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 group">
                      <img src={fileObj.preview} alt={`Evidence ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveDisputeFile(idx)}
                        className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-black/80 text-white rounded-full transition cursor-pointer"
                        title="Xoá ảnh này"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}

                  {disputeFiles.length < 5 && (
                    <button
                      type="button"
                      onClick={() => disputeFileInputRef.current?.click()}
                      className="aspect-square rounded-xl border-2 border-dashed border-gray-300 hover:border-amber-500 hover:bg-amber-50/50 flex flex-col items-center justify-center gap-1 text-gray-500 hover:text-amber-700 transition cursor-pointer"
                    >
                      <Upload className="w-5 h-5" />
                      <span className="text-[11px] font-medium">Tải ảnh</span>
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-gray-400">Hỗ trợ các định dạng JPG, PNG, WEBP (tối đa 5MB mỗi ảnh)</p>
              </div>

              <div className="flex gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setDisputeOrder(null)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 font-semibold hover:bg-gray-50 transition cursor-pointer"
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  disabled={disputeSubmitting || !disputeReason.trim()}
                  className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold transition flex items-center justify-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {disputeSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Đang gửi khiếu nại...</span>
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="w-4 h-4" />
                      <span>Gửi khiếu nại</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ────────────────────── VIEW DISPUTE DETAILS MODAL ──────────────────── */}
      {viewDisputeModal.isOpen && viewDisputeModal.dispute && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm" onClick={() => setViewDisputeModal({ isOpen: false, order: null, dispute: null })}>
          <div
            className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-[fadeInScale_0.2s_ease]"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-amber-600" />
                  Chi Tiết Khiếu Nại Đơn #{viewDisputeModal.order?.orderCode}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Ngày gửi: {new Date(viewDisputeModal.dispute.createdAt).toLocaleString('vi-VN')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewDisputeModal({ isOpen: false, order: null, dispute: null })}
                className="p-1 hover:bg-gray-100 rounded-lg transition text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-sm">
              {/* Status Banner */}
              <div className={`p-4 rounded-2xl border flex items-start gap-3 ${
                viewDisputeModal.dispute.status === 'OPEN'
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : viewDisputeModal.dispute.status === 'RESOLVED'
                  ? 'bg-blue-50 border-blue-200 text-blue-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}>
                <div className="mt-0.5 shrink-0">
                  {viewDisputeModal.dispute.status === 'OPEN' && <Clock className="w-5 h-5 text-amber-600" />}
                  {viewDisputeModal.dispute.status === 'RESOLVED' && <CheckCircle2 className="w-5 h-5 text-blue-600" />}
                  {viewDisputeModal.dispute.status === 'REJECTED' && <XCircle className="w-5 h-5 text-rose-600" />}
                </div>
                <div>
                  <h4 className="font-bold text-sm">
                    {viewDisputeModal.dispute.status === 'OPEN' && 'Khiếu nại đang chờ Admin xem xét'}
                    {viewDisputeModal.dispute.status === 'RESOLVED' && 'Khiếu nại đã được chấp thuận & Đã hoàn tiền'}
                    {viewDisputeModal.dispute.status === 'REJECTED' && 'Khiếu nại đã bị hủy'}
                  </h4>
                  <p className="text-xs mt-1 leading-relaxed opacity-90">
                    {viewDisputeModal.dispute.status === 'OPEN' && 'Admin đang xác minh lý do và hình ảnh bằng chứng. Kết quả sẽ được cập nhật trong vòng 24h.'}
                    {viewDisputeModal.dispute.status === 'RESOLVED' && `Số tiền ${money(viewDisputeModal.order?.totalAmount || 0)} đã được hoàn vào Ví số dư của bạn. Bạn có thể vào ví để rút về tài khoản ngân hàng bất cứ lúc nào.`}
                    {viewDisputeModal.dispute.status === 'REJECTED' && 'Khiếu nại đã bị Admin hủy do không đủ điều kiện xử lý hoặc không có vi phạm từ phía người bán.'}
                  </p>
                  {viewDisputeModal.dispute.status === 'RESOLVED' && (
                    <Link
                      to="/wallet"
                      className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition"
                    >
                      <Wallet className="w-3.5 h-3.5" />
                      Đi tới Ví & Rút tiền ngay ➔
                    </Link>
                  )}
                </div>
              </div>

              {/* Customer Reason */}
              <div>
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  Lý do khiếu nại của bạn:
                </span>
                <p className="text-xs bg-gray-50 p-3.5 rounded-xl border border-gray-100 text-gray-800 leading-relaxed whitespace-pre-wrap">
                  {viewDisputeModal.dispute.reason}
                </p>
              </div>

              {/* Uploaded Evidence Images */}
              {(() => {
                let images: string[] = [];
                try {
                  if (viewDisputeModal.dispute.evidenceImages) {
                    images = JSON.parse(viewDisputeModal.dispute.evidenceImages);
                  }
                } catch {}

                if (images.length === 0) return null;

                return (
                  <div>
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
                      Hình ảnh bằng chứng đã gửi ({images.length}):
                    </span>
                    <div className="flex gap-2 flex-wrap">
                      {images.map((imgUrl, i) => {
                        const fullUrl = imgUrl.startsWith('http') ? imgUrl : `http://localhost:5234${imgUrl.startsWith('/') ? '' : '/'}${imgUrl}`;
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setViewDisputeImageModal({
                              isOpen: true,
                              url: fullUrl,
                              title: `Ảnh bằng chứng #${i + 1} - Đơn #${viewDisputeModal.order?.orderCode}`
                            })}
                            className="w-16 h-16 rounded-xl overflow-hidden border border-gray-200 hover:opacity-80 transition cursor-pointer bg-gray-50 flex items-center justify-center"
                          >
                            <img src={fullUrl} alt={`Evidence ${i + 1}`} className="w-full h-full object-cover" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Admin Note if resolved or rejected */}
              {viewDisputeModal.dispute.adminNote && (
                <div>
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">
                    Ghi chú phản hồi từ Admin:
                  </span>
                  <p className="text-xs bg-gray-50 p-3.5 rounded-xl border border-gray-100 text-gray-700 italic leading-relaxed">
                    {viewDisputeModal.dispute.adminNote}
                  </p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end">
              <button
                type="button"
                onClick={() => setViewDisputeModal({ isOpen: false, order: null, dispute: null })}
                className="px-5 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────── DISPUTE IMAGE PREVIEW MODAL ────────────────── */}
      {viewDisputeImageModal.isOpen && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setViewDisputeImageModal({ isOpen: false, url: '', title: '' })}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden animate-[fadeInScale_0.2s_ease]" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-gray-900 text-sm truncate">{viewDisputeImageModal.title}</h3>
              <button
                type="button"
                onClick={() => setViewDisputeImageModal({ isOpen: false, url: '', title: '' })}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 bg-gray-50 flex items-center justify-center max-h-[75vh] overflow-auto">
              <img src={viewDisputeImageModal.url} alt="Evidence Preview" className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-sm" />
            </div>
            <div className="p-3 border-t border-gray-100 flex justify-between items-center">
              <a
                href={viewDisputeImageModal.url}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-emerald-600 hover:underline"
              >
                Mở ảnh gốc trong tab mới ↗
              </a>
              <button
                type="button"
                onClick={() => setViewDisputeImageModal({ isOpen: false, url: '', title: '' })}
                className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-semibold rounded-lg cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────── EDIT SHIPPING INFO MODAL ────────────────── */}
      {editShippingOrder && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm" onClick={() => setEditShippingOrder(null)}>
          <div
            className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-[fadeInScale_0.2s_ease]"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-emerald-600" />
                  <span>Cập nhật địa chỉ nhận hàng</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Đơn hàng: <strong className="font-mono text-gray-800">#{editShippingOrder.orderCode}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditShippingOrder(null)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveShipping} className="p-6 space-y-4">
              <div className="p-3 bg-cyan-50/70 border border-cyan-200/80 rounded-xl text-xs text-cyan-900 flex items-start gap-2">
                <Info className="w-4 h-4 text-cyan-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Đơn hàng đang ở bước <strong>chuẩn bị hàng</strong> (chưa bàn giao shipper). Bạn có thể đổi tên người nhận, số điện thoại hoặc địa chỉ nhận hàng.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Họ và tên người nhận <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editShippingName}
                  onChange={e => setEditShippingName(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Văn Khách"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Số điện thoại người nhận <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={editShippingPhone}
                  onChange={e => setEditShippingPhone(e.target.value)}
                  placeholder="Ví dụ: 0901234567"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Địa chỉ giao hàng chi tiết <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={editShippingAddress}
                  onChange={e => setEditShippingAddress(e.target.value)}
                  placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Ghi chú cho xưởng / shipper (tuỳ chọn)
                </label>
                <input
                  type="text"
                  value={editShippingNote}
                  onChange={e => setEditShippingNote(e.target.value)}
                  placeholder="Ví dụ: Giao giờ hành chính, gọi trước khi đến..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditShippingOrder(null)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-bold transition cursor-pointer"
                >
                  Huỷ bỏ
                </button>
                <button
                  type="submit"
                  disabled={editShippingSaving}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {editShippingSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <span>Lưu thông tin</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showConfirmDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" style={{ animation: 'fadeInScale 0.2s ease-out' }}>
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Dọn dẹp rác</h3>
              <p className="text-sm text-gray-500 mb-6">Bạn có chắc chắn muốn xóa tất cả các đơn hàng đã hủy không? Hành động này không thể hoàn tác.</p>
              
              <div className="flex items-center gap-3 w-full">
                <button
                  type="button"
                  onClick={() => setShowConfirmDelete(false)}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold transition disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => {
                    setIsDeleting(true);
                    api.delete('/orders/my/cancelled')
                      .then(() => {
                        setAlertModal({ type: 'success', title: 'Thành công', message: 'Đã xóa tất cả đơn hàng đã hủy.' });
                        fetchOrders();
                        setShowConfirmDelete(false);
                      })
                      .catch(e => {
                        setAlertModal({ type: 'error', title: 'Lỗi', message: e.response?.data?.message || 'Không thể xóa đơn hàng.' });
                      })
                      .finally(() => setIsDeleting(false));
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold transition flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm shadow-rose-200"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang xóa...</span>
                    </>
                  ) : (
                    <span>Xác nhận xóa</span>
                  )}
                </button>
              </div>
            </div>
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
