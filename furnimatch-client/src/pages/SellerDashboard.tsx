import { useEffect, useState } from 'react';
import api from '../utils/api';
import { Package, User, MapPin, Phone, CheckCircle, Clock, Truck, Hammer, XCircle, ClipboardList } from 'lucide-react';

const money = (n: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

const stateConfig: Record<string, { label: string, color: string, icon: any }> = {
  WAITING_PAYMENT: { label: 'Chờ thanh toán', color: 'bg-amber-100 text-amber-800', icon: Clock },
  CONFIRMED: { label: 'Đã xác nhận', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
  PREPARING: { label: 'Đang chuẩn bị hàng', color: 'bg-cyan-100 text-cyan-800', icon: ClipboardList },
  PRODUCING: { label: 'Đang sản xuất', color: 'bg-indigo-100 text-indigo-800', icon: Hammer },
  SHIPPED: { label: 'Đang giao hàng', color: 'bg-purple-100 text-purple-800', icon: Truck },
  COMPLETED: { label: 'Hoàn thành', color: 'bg-emerald-100 text-emerald-800', icon: Package },
  CANCELLED: { label: 'Đã huỷ', color: 'bg-rose-100 text-rose-800', icon: XCircle }
};

export default function SellerDashboard() {
  const [tab, setTab] = useState<'ORDERS' | 'QUOTES'>('ORDERS');
  const [orders, setOrders] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      if (tab === 'ORDERS') {
        const res = await api.get('/orders/seller');
        setOrders(res.data);
      } else {
        const res = await api.get('/quotationrequests');
        setRequests(res.data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [tab]);

  const update = async (id: number, status: string) => {
    await api.put(`/orders/${id}/status`, { status });
    load();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Bảng điều khiển xưởng</h1>
      
      <div className="flex gap-2 rounded-xl bg-gray-100 p-1 w-fit mb-8">
        <button 
          onClick={() => setTab('ORDERS')} 
          className={`rounded-lg px-5 py-2.5 text-sm font-semibold transition-all ${tab === 'ORDERS' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
        >
          📦 Quản lý đơn hàng
        </button>
        <button 
          onClick={() => setTab('QUOTES')} 
          className={`rounded-lg px-5 py-2.5 text-sm font-semibold transition-all ${tab === 'QUOTES' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
        >
          📄 Yêu cầu báo giá
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        </div>
      ) : tab === 'ORDERS' ? (
        <div className="space-y-6">
          {orders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
              <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500 font-medium">Chưa có đơn hàng nào.</p>
            </div>
          ) : (
            orders.map(o => {
              let lines: any[] = [];
              try { lines = JSON.parse(o.itemsJson); } catch {}
              const StatusIcon = stateConfig[o.orderStatus]?.icon || Package;

              return (
                <article key={o.orderId} className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  {/* Header */}
                  <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">Đơn hàng #{o.orderCode}</h2>
                      <p className="text-sm text-gray-500 mt-1">{new Date(o.createdAt).toLocaleString('vi-VN')}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${stateConfig[o.orderStatus]?.color || 'bg-gray-100 text-gray-800'}`}>
                        <StatusIcon className="w-4 h-4" />
                        {stateConfig[o.orderStatus]?.label || o.orderStatus}
                      </div>
                      <select 
                        value={o.orderStatus === 'CONFIRMED' ? 'PREPARING' : o.orderStatus} 
                        onChange={e => update(o.orderId, e.target.value)} 
                        disabled={o.orderStatus === 'CANCELLED' || o.orderStatus === 'WAITING_PAYMENT'} 
                        className="rounded-lg border-gray-300 shadow-sm text-sm font-medium focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                      >
                        <option value="WAITING_PAYMENT" disabled>Chờ thanh toán</option>
                        {o.orderStatus === 'CONFIRMED' && <option value="CONFIRMED" disabled>Đã xác nhận</option>}
                        <option value="PREPARING">Đang chuẩn bị hàng</option>
                        <option value="PRODUCING">Đang sản xuất</option>
                        <option value="SHIPPED">Đang giao hàng</option>
                        <option value="COMPLETED">Hoàn thành</option>
                        {o.orderStatus === 'CANCELLED' && <option value="CANCELLED" disabled>Đã huỷ</option>}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x border-gray-100">
                    {/* Customer Info */}
                    <div className="p-6">
                      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <User className="w-4 h-4 text-emerald-600" />
                        Thông tin khách hàng
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <User className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{o.recipientName}</p>
                            <p className="text-xs text-gray-500">Tên người nhận</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Phone className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{o.recipientPhone}</p>
                            <p className="text-xs text-gray-500">Số điện thoại</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <MapPin className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-900 leading-snug">{o.address}</p>
                            <p className="text-xs text-gray-500 mt-0.5">Địa chỉ giao hàng</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Order Details */}
                    <div className="p-6 bg-gray-50/30">
                      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Package className="w-4 h-4 text-emerald-600" />
                        Chi tiết đơn hàng
                      </h3>
                      <div className="space-y-4">
                        {lines.map((x, i) => {
                          const name = x.name || x.Name;
                          const sizeLabel = x.sizeLabel || x.SizeLabel;
                          const quantity = x.quantity || x.Quantity;
                          const price = x.price || x.Price;
                          const imageUrl = x.imageUrl || x.ImageUrl;
                          return (
                            <div key={i} className="flex gap-4">
                              <div className="h-16 w-16 shrink-0 rounded-lg border bg-white overflow-hidden">
                                {imageUrl ? <img src={imageUrl} className="h-full w-full object-cover" alt="" /> : <Package className="h-full w-full p-4 text-gray-200" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
                                <p className="text-xs text-gray-500 mt-1">{sizeLabel}</p>
                                <div className="flex items-center justify-between mt-1">
                                  <span className="text-sm font-medium text-gray-700">SL: {quantity}</span>
                                  <span className="text-sm font-semibold text-gray-900">{money(price)}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-6 pt-4 border-t border-gray-200 flex justify-between items-center">
                        <span className="font-medium text-gray-700">Tổng cộng:</span>
                        <span className="text-xl font-bold text-emerald-600">{money(o.totalAmount)}</span>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {requests.length ? (
            requests.map((r: any) => (
              <div key={r.quotationRequestId} className="rounded-xl border bg-white p-6 shadow-sm">
                <h3 className="font-bold text-lg text-gray-900">{r.productType}</h3>
                <p className="mt-2 text-gray-600">Số lượng: {r.quantity} · {r.description || 'Không có mô tả'}</p>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
              <p className="text-gray-500 font-medium">Chưa có yêu cầu báo giá.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
