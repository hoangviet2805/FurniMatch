import { useEffect, useState, useCallback } from 'react';
import api from '../utils/api';
import { Package, User, MapPin, Phone, CheckCircle, Clock, Truck, Hammer, XCircle, ClipboardList } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const money = (n: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);

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
  const [tab, setTab] = useState<'ORDERS' | 'QUOTES' | 'REVENUE'>('ORDERS');
  const [orders, setOrders] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // ========== REVENUE STATE ==========
  const [revSummary, setRevSummary] = useState<any>(null);
  const [revChart, setRevChart] = useState<any[]>([]);
  const [revOrders, setRevOrders] = useState<any[]>([]);
  const [revOrdersTotal, setRevOrdersTotal] = useState(0);
  const [revOrdersPage, setRevOrdersPage] = useState(1);
  const [revChartPeriod, setRevChartPeriod] = useState<'monthly' | 'weekly'>('monthly');
  const [revChartYear, setRevChartYear] = useState(new Date().getFullYear());
  const [revLoading, setRevLoading] = useState(false);
  const [revFromDate, setRevFromDate] = useState('');
  const [revToDate, setRevToDate] = useState('');
  const REV_PAGE_SIZE = 15;

  const load = async () => {
    setLoading(true);
    try {
      if (tab === 'ORDERS') {
        const res = await api.get('/orders/seller');
        setOrders(res.data);
      } else if (tab === 'QUOTES') {
        const res = await api.get('/quotationrequests');
        setRequests(res.data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab !== 'REVENUE') {
      load();
      setCurrentPage(1);
    }
  }, [tab]);

  const update = async (id: number, status: string) => {
    await api.put(`/orders/${id}/status`, { status });
    load();
  };

  // ========== REVENUE LOGIC ==========
  const fetchRevSummary = useCallback(async () => {
    const params = new URLSearchParams();
    if (revFromDate) params.set('from', revFromDate);
    if (revToDate) params.set('to', revToDate);
    const res = await api.get(`/seller/revenue/summary?${params}`);
    setRevSummary(res.data);
  }, [revFromDate, revToDate]);

  const fetchRevChart = useCallback(async () => {
    const res = await api.get(`/seller/revenue/chart?period=${revChartPeriod}&year=${revChartYear}`);
    setRevChart(res.data);
  }, [revChartPeriod, revChartYear]);

  const fetchRevOrders = useCallback(async (page = 1) => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(REV_PAGE_SIZE) });
    if (revFromDate) params.set('from', revFromDate);
    if (revToDate) params.set('to', revToDate);
    const res = await api.get(`/seller/revenue/orders?${params}`);
    setRevOrders(res.data.data);
    setRevOrdersTotal(res.data.total);
    setRevOrdersPage(page);
  }, [revFromDate, revToDate]);

  const loadAllRevenue = useCallback(async () => {
    setRevLoading(true);
    try {
      await Promise.all([fetchRevSummary(), fetchRevChart(), fetchRevOrders(1)]);
    } finally {
      setRevLoading(false);
    }
  }, [fetchRevSummary, fetchRevChart, fetchRevOrders]);

  useEffect(() => {
    if (tab === 'REVENUE') loadAllRevenue();
  }, [tab]);

  useEffect(() => {
    if (tab === 'REVENUE') fetchRevChart();
  }, [revChartPeriod, revChartYear]);

  const revTotalOrderPages = Math.ceil(revOrdersTotal / REV_PAGE_SIZE);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Bảng điều khiển xưởng</h1>
      
      <div className="flex gap-2 rounded-xl bg-gray-100 p-1 w-fit mb-8 flex-wrap">
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
        <button 
          onClick={() => setTab('REVENUE')} 
          className={`rounded-lg px-5 py-2.5 text-sm font-semibold transition-all ${tab === 'REVENUE' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
        >
          📊 Doanh Thu Của Tôi
        </button>
      </div>

      {/* ===================== REVENUE TAB ===================== */}
      {tab === 'REVENUE' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Từ ngày</label>
              <input type="date" value={revFromDate} onChange={e => setRevFromDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Đến ngày</label>
              <input type="date" value={revToDate} onChange={e => setRevToDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <button onClick={loadAllRevenue}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
              🔍 Lọc
            </button>
            <button onClick={() => { setRevFromDate(''); setRevToDate(''); }}
              className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
              Xóa lọc
            </button>
          </div>

          {revLoading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div></div>
          ) : (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-5 text-white shadow-sm">
                  <p className="text-emerald-100 text-xs font-medium uppercase tracking-wide mb-1">Tổng Doanh Thu</p>
                  <p className="text-xl font-bold truncate">{money(revSummary?.totalGmv)}</p>
                  <p className="text-emerald-200 text-xs mt-1">Tiền hàng đã thanh toán</p>
                </div>
                <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-5 text-white shadow-sm">
                  <p className="text-amber-100 text-xs font-medium uppercase tracking-wide mb-1">Hoa Hồng Platform</p>
                  <p className="text-xl font-bold truncate">{money(revSummary?.totalCommission)}</p>
                  <p className="text-amber-200 text-xs mt-1">Tỷ lệ {revSummary?.commissionRate}%</p>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white shadow-sm">
                  <p className="text-blue-100 text-xs font-medium uppercase tracking-wide mb-1">Thực Nhận</p>
                  <p className="text-xl font-bold truncate">{money(revSummary?.netRevenue)}</p>
                  <p className="text-blue-200 text-xs mt-1">Sau khi trừ hoa hồng</p>
                </div>
                <div className="bg-gradient-to-br from-violet-500 to-violet-600 rounded-xl p-5 text-white shadow-sm">
                  <p className="text-violet-100 text-xs font-medium uppercase tracking-wide mb-1">Đơn Đã Thanh Toán</p>
                  <p className="text-xl font-bold">{revSummary?.totalPaidOrders ?? 0}</p>
                  <p className="text-violet-200 text-xs mt-1">Đơn hoàn tất thanh toán</p>
                </div>
              </div>

              {/* Chart */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
                  <h2 className="text-lg font-bold text-gray-900">📈 Biểu Đồ Doanh Thu</h2>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                      <button onClick={() => setRevChartPeriod('monthly')} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${revChartPeriod === 'monthly' ? 'bg-white text-emerald-700 shadow' : 'text-gray-500'}`}>Theo tháng</button>
                      <button onClick={() => setRevChartPeriod('weekly')} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${revChartPeriod === 'weekly' ? 'bg-white text-emerald-700 shadow' : 'text-gray-500'}`}>Theo tuần</button>
                    </div>
                    {revChartPeriod === 'monthly' && (
                      <select value={revChartYear} onChange={e => setRevChartYear(Number(e.target.value))}
                        className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm">
                        {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    )}
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={revChart} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6b7280' }} />
                    <YAxis tickFormatter={v => v >= 1000000 ? `${(v/1000000).toFixed(0)}M` : String(v)} tick={{ fontSize: 11, fill: '#6b7280' }} />
                    <Tooltip formatter={(val: any) => [money(val), '']} contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                    <Legend />
                    <Bar dataKey="gmv" name="Doanh thu (VND)" fill="#10b981" radius={[4,4,0,0]} />
                    <Bar dataKey="commission" name="Hoa hồng (VND)" fill="#f59e0b" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Orders Detail Table */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h2 className="text-lg font-bold text-gray-900">📋 Chi Tiết Đơn Hàng Đã Thanh Toán</h2>
                  <p className="text-sm text-gray-500 mt-1">Tổng cộng: {revOrdersTotal} đơn</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Mã Đơn</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Khách Hàng</th>
                        <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Tiền Hàng</th>
                        <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Hoa Hồng</th>
                        <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Thực Nhận</th>
                        <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Trạng Thái</th>
                        <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Ngày</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {revOrders.length === 0 ? (
                        <tr><td colSpan={7} className="px-5 py-8 text-center text-gray-400">Chưa có đơn hàng nào</td></tr>
                      ) : revOrders.map(o => (
                        <tr key={o.orderId} className="hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-3 text-sm font-mono text-gray-700">{o.orderCode}</td>
                          <td className="px-5 py-3 text-sm text-gray-700">{o.customerName}</td>
                          <td className="px-5 py-3 text-sm text-emerald-700 font-semibold text-right">{money(o.subtotal)}</td>
                          <td className="px-5 py-3 text-sm text-amber-600 font-medium text-right">-{money(o.commission)}</td>
                          <td className="px-5 py-3 text-sm text-blue-700 font-bold text-right">{money(o.netRevenue)}</td>
                          <td className="px-5 py-3 text-right">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${o.orderStatus === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                              {o.orderStatus === 'COMPLETED' ? 'Hoàn thành' : o.orderStatus === 'CONFIRMED' ? 'Đã xác nhận' : o.orderStatus}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-xs text-gray-500 text-right">{new Date(o.createdAt).toLocaleDateString('vi-VN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {revTotalOrderPages > 1 && (
                  <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
                    <p className="text-sm text-gray-500">Trang {revOrdersPage} / {revTotalOrderPages}</p>
                    <div className="flex gap-2">
                      <button disabled={revOrdersPage <= 1} onClick={() => fetchRevOrders(revOrdersPage - 1)}
                        className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors">← Trước</button>
                      <button disabled={revOrdersPage >= revTotalOrderPages} onClick={() => fetchRevOrders(revOrdersPage + 1)}
                        className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors">Tiếp →</button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ===================== ORDERS & QUOTES TABS ===================== */}
      {tab !== 'REVENUE' && (
        <>
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
                orders.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map(o => {
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
                            value={o.orderStatus} 
                            onChange={e => update(o.orderId, e.target.value)} 
                            disabled={o.orderStatus === 'CANCELLED' || o.orderStatus === 'WAITING_PAYMENT' || o.orderStatus === 'COMPLETED'} 
                            className="rounded-lg border-gray-300 shadow-sm text-sm font-medium focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                          >
                            <option value="WAITING_PAYMENT" disabled>Chờ thanh toán</option>
                            {o.orderStatus === 'CONFIRMED' && <option value="CONFIRMED" disabled>Đã xác nhận</option>}
                            <option value="PREPARING" disabled={!['CONFIRMED', 'PREPARING'].includes(o.orderStatus)}>Đang chuẩn bị hàng</option>
                            <option value="PRODUCING" disabled={!['PREPARING', 'PRODUCING'].includes(o.orderStatus)}>Đang sản xuất</option>
                            <option value="SHIPPED" disabled={!['PRODUCING', 'SHIPPED'].includes(o.orderStatus)}>Đang giao hàng</option>
                            <option value="COMPLETED" disabled={!['SHIPPED', 'COMPLETED'].includes(o.orderStatus)}>Hoàn thành</option>
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
                                    {imageUrl ? <img src={imageUrl.startsWith('http') ? imageUrl : `http://localhost:5234${imageUrl}`} className="h-full w-full object-cover" alt="" /> : <Package className="h-full w-full p-4 text-gray-200" />}
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
        </>
      )}
    </div>
  );
}
