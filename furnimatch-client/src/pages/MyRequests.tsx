import { useEffect, useMemo, useState } from 'react';
import api from '../utils/api';
import RequestQuotation from './RequestQuotation';

const money = (value?: number) => value ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value) : 'Chưa có';
const statusText: Record<string, string> = { 
  OPEN: 'Đang tìm xưởng', 
  CLAIMED: 'Đã có xưởng nhận làm', 
  RECEIVING_QUOTES: 'Đang nhận báo giá', 
  SELLER_SELECTED: 'Đã chọn xưởng', 
  COMPLETED: 'Hoàn tất', 
  EXPIRED: 'Đã hết hạn', 
  CANCELLED: 'Đã hủy' 
};
const statusStyle: Record<string, string> = { 
  OPEN: 'bg-sky-100 text-sky-700', 
  CLAIMED: 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold', 
  RECEIVING_QUOTES: 'bg-violet-100 text-violet-700', 
  SELLER_SELECTED: 'bg-amber-100 text-amber-700', 
  COMPLETED: 'bg-emerald-100 text-emerald-700', 
  EXPIRED: 'bg-gray-100 text-gray-600', 
  CANCELLED: 'bg-rose-100 text-rose-700' 
};

const MyRequests = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const fetchRequests = () => {
    setLoading(true);
    api.get('/quotationrequests')
      .then(response => {
        setRequests(response.data);
        if (selected) {
          const updatedSelected = response.data.find((r: any) => r.quotationRequestId === selected.quotationRequestId);
          if (updatedSelected) setSelected(updatedSelected);
        }
      })
      .catch(() => setRequests([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { 
    fetchRequests(); 
  }, []);

  const handleAcceptQuotation = async (quotationId: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn chốt báo giá từ xưởng này để tiến hành gia công?')) return;
    try {
      await api.post(`/quotations/${quotationId}/accept`);
      alert('Đã xác nhận chốt xưởng thành công! Xưởng sẽ liên hệ để tiến hành sản xuất.');
      fetchRequests();
    } catch {
      alert('Có lỗi xảy ra khi xác nhận báo giá.');
    }
  };

  const visible = useMemo(() => filter === 'ALL' ? requests : requests.filter(item => item.status === filter), [requests, filter]);
  const quoteCount = requests.reduce((sum, item) => sum + (item.quotations?.length || 0), 0);
  const bestQuote = requests.flatMap(item => item.quotations || []).reduce((best: number | undefined, quote: any) => best === undefined || quote.price < best ? quote.price : best, undefined);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row justify-between gap-5">
        <div>
          <p className="text-sm font-semibold text-emerald-600 uppercase tracking-wider">Khu vực khách hàng</p>
          <h1 className="text-3xl font-bold text-gray-900 mt-1">Yêu cầu đặt làm của tôi</h1>
          <p className="text-gray-500 mt-2">Theo dõi phản hồi từ các xưởng mộc, nhận báo giá và thời gian hoàn thiện.</p>
        </div>
        <button 
          onClick={() => setShowForm(true)} 
          className="self-start rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-3 text-white font-bold shadow-md shadow-emerald-700/20 transition-all hover:scale-105 cursor-pointer flex items-center gap-2"
        >
          <span>🪵</span>
          <span>+ Tạo yêu cầu mới</span>
        </button>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mt-8">
        <div className="rounded-2xl bg-sky-50 p-5 border border-sky-100">
          <p className="text-sm font-medium text-sky-700">Yêu cầu đã gửi</p>
          <p className="text-2xl font-bold text-sky-900 mt-1">{requests.length}</p>
        </div>
        <div className="rounded-2xl bg-violet-50 p-5 border border-violet-100">
          <p className="text-sm font-medium text-violet-700">Xưởng đã tiếp nhận & báo giá</p>
          <p className="text-2xl font-bold text-violet-900 mt-1">{quoteCount}</p>
        </div>
        <div className="rounded-2xl bg-emerald-50 p-5 border border-emerald-100">
          <p className="text-sm font-medium text-emerald-700">Báo giá tốt nhất</p>
          <p className="text-2xl font-bold text-emerald-900 mt-1">{money(bestQuote)}</p>
        </div>
      </div>

      <div className="mt-8 grid lg:grid-cols-[1fr_400px] gap-7">
        <main>
          <div className="flex gap-2 overflow-x-auto pb-3">
            {[
              ['ALL', 'Tất cả'], 
              ['OPEN', 'Đang tìm xưởng'], 
              ['CLAIMED', 'Đã có xưởng nhận'], 
              ['COMPLETED', 'Hoàn tất']
            ].map(([value, label]) => (
              <button 
                key={value} 
                onClick={() => setFilter(value)} 
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all ${filter === value ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:border-emerald-300'}`}
              >
                {label}
              </button>
            ))}
          </div>
          
          {loading ? (
            <div className="py-16 text-center text-gray-500">Đang tải danh sách yêu cầu...</div>
          ) : visible.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center">
              <div className="text-4xl mb-4">📋</div>
              <p className="font-bold text-gray-800">Chưa có yêu cầu phù hợp</p>
              <button 
                onClick={() => setShowForm(true)} 
                className="inline-block mt-3 text-emerald-600 font-bold hover:text-emerald-700"
              >
                Tạo yêu cầu khảo giá đầu tiên
              </button>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {visible.map(request => { 
                const quotes = request.quotations || []; 
                const cheapest = quotes.length ? Math.min(...quotes.map((quote: any) => quote.price)) : undefined; 
                return (
                  <button 
                    key={request.quotationRequestId} 
                    onClick={() => setSelected(request)} 
                    className={`w-full text-left rounded-2xl border bg-white p-5 transition-all hover:shadow-md cursor-pointer ${selected?.quotationRequestId === request.quotationRequestId ? 'border-emerald-500 ring-2 ring-emerald-200 shadow-sm' : 'border-gray-100'}`}
                  >
                    <div className="flex justify-between gap-4">
                      <div>
                        <h2 className="font-bold text-gray-900 text-lg">{request.productType || 'Yêu cầu nội thất'}</h2>
                        <p className="mt-1 text-sm text-gray-500">{request.category?.name || 'Nội thất'} · {new Date(request.createdAt).toLocaleDateString('vi-VN')}</p>
                      </div>
                      <span className={`h-fit rounded-full px-3 py-1 text-xs font-semibold ${statusStyle[request.status] || 'bg-gray-100 text-gray-600'}`}>
                        {statusText[request.status] || request.status}
                      </span>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-gray-500">Kích thước</p>
                        <p className="font-semibold text-gray-800">{request.length} × {request.width} × {request.height} cm</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Phản hồi</p>
                        <p className="font-semibold text-gray-800">{quotes.length ? `${quotes.length} xưởng tiếp nhận` : 'Chờ xưởng nhận'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Báo giá</p>
                        <p className="font-bold text-emerald-600">{quotes.length ? money(cheapest) : 'Chưa có'}</p>
                      </div>
                    </div>
                  </button>
                ); 
              })}
            </div>
          )}
        </main>
        
        <aside className="rounded-2xl border border-gray-100 bg-white p-6 h-fit lg:sticky lg:top-24 shadow-sm">
          {selected ? (
            <>
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Chi tiết yêu cầu</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${statusStyle[selected.status] || 'bg-gray-100 text-gray-600'}`}>
                  {statusText[selected.status] || selected.status}
                </span>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mt-3">{selected.productType || 'Yêu cầu nội thất'}</h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">{selected.description || 'Không có mô tả thêm.'}</p>
              
              <div className="mt-4 rounded-xl bg-gray-50 p-4 text-xs sm:text-sm space-y-2">
                <p><span className="text-gray-500">Kích thước:</span> <strong>{selected.length} × {selected.width} × {selected.height} cm</strong></p>
                <p><span className="text-gray-500">Chất liệu:</span> <strong>{selected.material || 'Chưa chọn'}</strong></p>
                <p><span className="text-gray-500">Số lượng:</span> <strong>{selected.quantity || 1} cái/bộ</strong></p>
                <p><span className="text-gray-500">Ngân sách dự kiến:</span> <strong className="text-emerald-700">{money(selected.budgetMin)} – {money(selected.budgetMax)}</strong></p>
              </div>

              <h3 className="mt-6 font-bold text-gray-900 text-sm uppercase tracking-wider flex items-center gap-1.5">
                <span>🪵</span>
                <span>Phản hồi & Báo giá ({selected.quotations?.length || 0})</span>
              </h3>
              
              <div className="mt-3 space-y-4">
                {selected.quotations?.length ? selected.quotations.map((quote: any) => {
                  const seller = quote.seller;
                  const shopName = seller?.shopName || seller?.fullName || 'Xưởng mộc';
                  const isAccepted = quote.status === 'ACCEPTED' || selected.status === 'COMPLETED';

                  return (
                    <div key={quote.quotationId} className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/40 p-4 relative overflow-hidden">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <p className="font-bold text-gray-900 text-base">{shopName}</p>
                          <p className="text-xs text-gray-500 mt-0.5">Đã tiếp nhận yêu cầu đóng đồ của bạn</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Báo giá hoàn thiện</p>
                          <p className="text-lg font-extrabold text-emerald-700">{money(quote.price)}</p>
                        </div>
                      </div>

                      <div className="mt-3 p-3 bg-white rounded-xl border border-emerald-100 text-xs space-y-1.5">
                        <p className="text-gray-700">
                          ⏱️ Thời gian làm dự kiến: <strong className="text-gray-900">{quote.productionDays} ngày</strong>
                        </p>
                        {quote.note && (
                          <p className="text-gray-600">
                            📝 Cam kết xưởng: <span className="italic font-medium">{quote.note}</span>
                          </p>
                        )}
                        {seller?.phone && (
                          <p className="text-emerald-800 font-medium">
                            📞 Hotline xưởng: <a href={`tel:${seller.phone}`} className="font-bold underline text-emerald-700">{seller.phone}</a>
                          </p>
                        )}
                        {(seller?.addressDetail || seller?.province) && (
                          <p className="text-gray-500">
                            📍 Địa chỉ xưởng: {[seller?.addressDetail, seller?.ward, seller?.district, seller?.province].filter(Boolean).join(', ')}
                          </p>
                        )}
                      </div>

                      {selected.status !== 'COMPLETED' && (
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleAcceptQuotation(quote.quotationId)}
                            className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
                          >
                            ✓ Đồng Ý & Chốt Xưởng Này
                          </button>
                        </div>
                      )}

                      {isAccepted && (
                        <div className="mt-2 text-center text-xs font-bold text-emerald-800 bg-emerald-100/80 py-1.5 rounded-lg">
                          🎉 Đã chốt hợp đồng gia công với xưởng
                        </div>
                      )}
                    </div>
                  );
                }) : (
                  <div className="rounded-xl bg-gray-50 p-5 text-center text-gray-500 text-xs">
                    <p className="font-medium text-gray-700 mb-1">Đang chờ xưởng tiếp nhận</p>
                    <p>Hệ thống đã gửi yêu cầu tới các xưởng chuyên làm theo yêu cầu. Bạn sẽ nhận được email ngay khi có xưởng tiếp nhận!</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="py-20 text-center text-gray-500">
              <div className="text-4xl mb-3">🔎</div>
              <p className="text-sm">Chọn một yêu cầu để xem báo giá và thông tin xưởng chi tiết.</p>
            </div>
          )}
        </aside>
      </div>
      
      {/* Quotation Request Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/60 p-4 sm:p-6 flex justify-center items-center backdrop-blur-sm" onClick={() => setShowForm(false)}>
          <div className="relative w-full max-w-3xl bg-transparent animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="max-h-[90vh] overflow-y-auto rounded-xl scrollbar-hide">
              <RequestQuotation 
                onCancel={() => setShowForm(false)} 
                onSuccess={() => { setShowForm(false); fetchRequests(); }} 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyRequests;
