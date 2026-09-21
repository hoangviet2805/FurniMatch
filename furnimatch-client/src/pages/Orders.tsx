import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { CheckCircle2, Clock, XCircle, Package, Truck, Hammer, ClipboardList, Store } from 'lucide-react';

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

export default function Orders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [trackingOrder, setTrackingOrder] = useState<any | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  const fetchOrders = () => {
    setLoading(true);
    setCurrentPage(1);
    api.get('/orders/my')
      .then(r => setOrders(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleCancel = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn huỷ đơn hàng này?')) return;
    try {
      await api.patch(`/orders/${id}/cancel`);
      fetchOrders();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Không thể huỷ đơn hàng.');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-8">Đơn mua của tôi</h1>
      
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
      ) : (
        <div className="space-y-6">
          {orders.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map(o => {
            let items: any[] = [];
            try { items = JSON.parse(o.itemsJson); } catch {}
            const StatusIcon = statusConfig[o.orderStatus]?.icon || Clock;
            
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
                    <p className="text-sm text-gray-500 mt-1">{new Date(o.createdAt).toLocaleString('vi-VN', { dateStyle: 'full', timeStyle: 'short' })}</p>
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
                          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border bg-gray-50">
                            {imageUrl ? <img src={imageUrl.startsWith('http') ? imageUrl : `http://localhost:5234${imageUrl}`} alt={name} className="h-full w-full object-cover" /> : <Package className="h-full w-full p-4 text-gray-300" />}
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
                
                <div className="flex flex-col sm:flex-row justify-between items-end sm:items-center border-t border-gray-100 pt-5 gap-4">
                  <div className="flex flex-wrap gap-3 w-full sm:w-auto">
                    <button 
                      onClick={() => setTrackingOrder(o)}
                      className="flex-1 sm:flex-none rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 transition-colors shadow-sm"
                    >
                      Theo dõi đơn hàng
                    </button>
                    {o.orderStatus === 'WAITING_PAYMENT' && (
                      <button 
                        onClick={() => handleCancel(o.orderId)}
                        className="flex-1 sm:flex-none rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 transition-colors shadow-sm"
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

          {orders.length > 0 && (
            <div className="flex justify-center items-center gap-4 mt-8">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1 || Math.ceil(orders.length / ITEMS_PER_PAGE) <= 1}
                className="px-5 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-emerald-600 disabled:opacity-50 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed font-semibold shadow-sm transition-all"
              >
                Trước
              </button>
              <div className="flex items-center justify-center min-w-[80px] px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 text-gray-700 font-medium">
                {currentPage} / {Math.max(1, Math.ceil(orders.length / ITEMS_PER_PAGE))}
              </div>
              <button 
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(orders.length / ITEMS_PER_PAGE), p + 1))}
                disabled={currentPage === Math.ceil(orders.length / ITEMS_PER_PAGE) || Math.ceil(orders.length / ITEMS_PER_PAGE) <= 1}
                className="px-5 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-emerald-600 disabled:opacity-50 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed font-semibold shadow-sm transition-all"
              >
                Sau
              </button>
            </div>
          )}
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
    </div>
  );
}
