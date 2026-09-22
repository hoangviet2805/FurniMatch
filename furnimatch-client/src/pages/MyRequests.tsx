import { useEffect, useMemo, useState } from 'react';
import api from '../utils/api';
import RequestQuotation from './RequestQuotation';

const money = (value?: number) => value ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value) : 'Chưa có';
const statusText: Record<string, string> = { OPEN: 'Đang tìm xưởng', RECEIVING_QUOTES: 'Đang nhận báo giá', SELLER_SELECTED: 'Đã chọn xưởng', COMPLETED: 'Hoàn tất', EXPIRED: 'Đã hết hạn', CANCELLED: 'Đã hủy' };
const statusStyle: Record<string, string> = { OPEN: 'bg-sky-100 text-sky-700', RECEIVING_QUOTES: 'bg-violet-100 text-violet-700', SELLER_SELECTED: 'bg-amber-100 text-amber-700', COMPLETED: 'bg-emerald-100 text-emerald-700', EXPIRED: 'bg-gray-100 text-gray-600', CANCELLED: 'bg-rose-100 text-rose-700' };

const MyRequests = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const fetchRequests = () => {
    setLoading(true);
    api.get('/quotationrequests')
      .then(response => setRequests(response.data))
      .catch(() => setRequests([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { 
    fetchRequests(); 
  }, []);

  const visible = useMemo(() => filter === 'ALL' ? requests : requests.filter(item => item.status === filter), [requests, filter]);
  const quoteCount = requests.reduce((sum, item) => sum + (item.quotations?.length || 0), 0);
  const bestQuote = requests.flatMap(item => item.quotations || []).reduce((best: number | undefined, quote: any) => best === undefined || quote.price < best ? quote.price : best, undefined);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row justify-between gap-5">
        <div>
          <p className="text-sm font-semibold text-emerald-600 uppercase tracking-wider">Khu vực khách hàng</p>
          <h1 className="text-3xl font-bold text-gray-900 mt-1">Yêu cầu của tôi</h1>
          <p className="text-gray-500 mt-2">Theo dõi phản hồi từ các xưởng và chọn báo giá phù hợp.</p>
        </div>
        <button 
          onClick={() => setShowForm(true)} 
          className="self-start rounded-lg bg-emerald-600 hover:bg-emerald-700 px-5 py-3 text-white font-semibold shadow-sm transition-colors"
        >
          + Tạo yêu cầu mới
        </button>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mt-8">
        <div className="rounded-xl bg-sky-50 p-5">
          <p className="text-sm text-sky-700">Yêu cầu đã tạo</p>
          <p className="text-2xl font-bold text-sky-900 mt-1">{requests.length}</p>
        </div>
        <div className="rounded-xl bg-violet-50 p-5">
          <p className="text-sm text-violet-700">Báo giá nhận được</p>
          <p className="text-2xl font-bold text-violet-900 mt-1">{quoteCount}</p>
        </div>
        <div className="rounded-xl bg-emerald-50 p-5">
          <p className="text-sm text-emerald-700">Giá tốt nhất</p>
          <p className="text-2xl font-bold text-emerald-900 mt-1">{money(bestQuote)}</p>
        </div>
      </div>

      <div className="mt-8 grid lg:grid-cols-[1fr_380px] gap-7">
        <main>
          <div className="flex gap-2 overflow-x-auto pb-3">
            {[['ALL', 'Tất cả'], ['OPEN', 'Đang mở'], ['RECEIVING_QUOTES', 'Có báo giá'], ['COMPLETED', 'Hoàn tất']].map(([value, label]) => (
              <button 
                key={value} 
                onClick={() => setFilter(value)} 
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium ${filter === value ? 'bg-emerald-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-emerald-300'}`}
              >
                {label}
              </button>
            ))}
          </div>
          
          {loading ? (
            <div className="py-16 text-center text-gray-500">Đang tải yêu cầu...</div>
          ) : visible.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center">
              <div className="text-4xl mb-4">📋</div>
              <p className="font-semibold text-gray-800">Chưa có yêu cầu phù hợp</p>
              <button 
                onClick={() => setShowForm(true)} 
                className="inline-block mt-3 text-emerald-600 font-medium hover:text-emerald-700"
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
                    className={`w-full text-left rounded-2xl border bg-white p-5 transition-shadow hover:shadow-md ${selected?.quotationRequestId === request.quotationRequestId ? 'border-emerald-500 ring-1 ring-emerald-200' : 'border-gray-100'}`}
                  >
                    <div className="flex justify-between gap-4">
                      <div>
                        <h2 className="font-bold text-gray-900">{request.productType || 'Yêu cầu nội thất'}</h2>
                        <p className="mt-1 text-sm text-gray-500">{request.category?.name || 'Nội thất'} · {new Date(request.createdAt).toLocaleDateString('vi-VN')}</p>
                      </div>
                      <span className={`h-fit rounded-full px-3 py-1 text-xs font-semibold ${statusStyle[request.status] || 'bg-gray-100 text-gray-600'}`}>
                        {statusText[request.status] || request.status}
                      </span>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="text-gray-500">Kích thước</p>
                        <p className="font-medium">{request.length} × {request.width} × {request.height}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Báo giá</p>
                        <p className="font-medium">{quotes.length} xưởng</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Tốt nhất</p>
                        <p className="font-medium text-emerald-600">{money(cheapest)}</p>
                      </div>
                    </div>
                  </button>
                ); 
              })}
            </div>
          )}
        </main>
        
        <aside className="rounded-2xl border border-gray-100 bg-white p-6 h-fit lg:sticky lg:top-24">
          {selected ? (
            <>
              <p className="text-sm text-emerald-600 font-semibold">CHI TIẾT YÊU CẦU</p>
              <h2 className="text-xl font-bold text-gray-900 mt-1">{selected.productType || 'Yêu cầu nội thất'}</h2>
              <p className="mt-3 text-sm leading-6 text-gray-600">{selected.description || 'Không có mô tả thêm.'}</p>
              <div className="mt-5 rounded-xl bg-gray-50 p-4 text-sm">
                <p><span className="text-gray-500">Chất liệu:</span> <strong>{selected.material || 'Chưa chọn'}</strong></p>
                <p className="mt-2"><span className="text-gray-500">Ngân sách:</span> <strong>{money(selected.budgetMin)} – {money(selected.budgetMax)}</strong></p>
              </div>
              <h3 className="mt-6 font-bold text-gray-900">Báo giá từ xưởng ({selected.quotations?.length || 0})</h3>
              <div className="mt-3 space-y-3">
                {selected.quotations?.length ? selected.quotations.map((quote: any) => (
                  <div key={quote.quotationId} className="rounded-xl border border-gray-100 p-3">
                    <div className="flex justify-between">
                      <span className="font-semibold">{quote.seller?.shopName || 'Xưởng sản xuất'}</span>
                      <span className="font-bold text-emerald-600">{money(quote.price)}</span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">{quote.productionDays} ngày sản xuất</p>
                    {quote.note && <p className="mt-2 text-sm text-gray-600">{quote.note}</p>}
                  </div>
                )) : (
                  <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-500">Chưa có xưởng gửi báo giá. Bạn sẽ thấy phản hồi tại đây.</p>
                )}
              </div>
            </>
          ) : (
            <div className="py-20 text-center text-gray-500">
              <div className="text-4xl mb-3">🔎</div>
              <p className="text-sm">Chọn một yêu cầu để xem báo giá chi tiết.</p>
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
