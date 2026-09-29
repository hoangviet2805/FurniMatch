import { useEffect, useMemo, useState } from 'react';
import api from '../utils/api';
import RequestQuotation from './RequestQuotation';

const money = (value?: number) => value ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value) : 'Chưa có';

const statusText: Record<string, string> = { 
  OPEN: 'Đang tìm xưởng', 
  CLAIMED: 'Đã có xưởng nhận', 
  RECEIVING_QUOTES: 'Đang nhận báo giá', 
  SELLER_SELECTED: 'Đã chốt chọn xưởng', 
  COMPLETED: 'Hoàn tất', 
  EXPIRED: 'Đã hết hạn', 
  CANCELLED: 'Đã hủy' 
};

const statusStyle: Record<string, string> = { 
  OPEN: 'bg-sky-100 text-sky-700', 
  CLAIMED: 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold', 
  RECEIVING_QUOTES: 'bg-violet-100 text-violet-700 font-semibold', 
  SELLER_SELECTED: 'bg-emerald-600 text-white font-bold shadow-xs', 
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

  // Modern Toast State
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    quotationId: number | null;
    shopName: string;
    price: number;
    days: number;
    submitting: boolean;
  }>({
    isOpen: false,
    quotationId: null,
    shopName: '',
    price: 0,
    days: 0,
    submitting: false
  });

  // Image Zoom Modal
  const [previewImage, setPreviewImage] = useState<{ isOpen: boolean; url: string; title: string }>({
    isOpen: false,
    url: '',
    title: ''
  });

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

  const openConfirmModal = (quote: any) => {
    const shopName = quote.seller?.shopName || quote.seller?.fullName || 'Xưởng mộc';
    setConfirmModal({
      isOpen: true,
      quotationId: quote.quotationId,
      shopName,
      price: quote.price,
      days: quote.productionDays,
      submitting: false
    });
  };

  const handleConfirmAccept = async () => {
    if (!confirmModal.quotationId) return;
    setConfirmModal(m => ({ ...m, submitting: true }));

    try {
      await api.post(`/quotations/${confirmModal.quotationId}/accept`);
      setConfirmModal({ isOpen: false, quotationId: null, shopName: '', price: 0, days: 0, submitting: false });
      setToast({
        type: 'success',
        message: `🎉 Chúc mừng! Bạn đã chốt gia công với "${confirmModal.shopName}". Xưởng sẽ sớm liên hệ hotline của bạn để bắt đầu sản xuất!`
      });
      setTimeout(() => setToast(null), 8000);
      fetchRequests();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Có lỗi xảy ra khi xác nhận chốt xưởng.';
      setToast({ type: 'error', message: msg });
      setTimeout(() => setToast(null), 6000);
      setConfirmModal(m => ({ ...m, submitting: false }));
    }
  };

  const visible = useMemo(() => {
    if (filter === 'ALL') return requests;
    if (filter === 'OPEN') return requests.filter(r => r.status === 'OPEN' || r.status === 'RECEIVING_QUOTES');
    if (filter === 'SELLER_SELECTED') return requests.filter(r => r.status === 'SELLER_SELECTED' || r.status === 'CLAIMED');
    return requests.filter(item => item.status === filter);
  }, [requests, filter]);

  const quoteCount = requests.reduce((sum, item) => sum + (item.quotations?.length || 0), 0);
  const bestQuote = requests.flatMap(item => item.quotations || []).reduce((best: number | undefined, quote: any) => best === undefined || quote.price < best ? quote.price : best, undefined);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 p-4 rounded-2xl shadow-xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-200 max-w-md ${
          toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
        }`}>
          <span className="text-2xl">{toast.type === 'success' ? '🎉' : '⚠️'}</span>
          <p className="text-sm font-semibold flex-1 leading-snug">{toast.message}</p>
          <button onClick={() => setToast(null)} className="text-gray-400 hover:text-gray-700 text-lg font-bold p-1 cursor-pointer">✕</button>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between gap-5">
        <div>
          <p className="text-sm font-semibold text-emerald-600 uppercase tracking-wider">Khu vực khách hàng</p>
          <h1 className="text-3xl font-bold text-gray-900 mt-1">Yêu cầu đặt làm của tôi</h1>
          <p className="text-gray-500 mt-2">Theo dõi báo giá từ các xưởng mộc, so sánh và chọn xưởng gia công ưng ý nhất.</p>
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
          <p className="text-sm font-medium text-violet-700">Tổng báo giá nhận được</p>
          <p className="text-2xl font-bold text-violet-900 mt-1">{quoteCount}</p>
        </div>
        <div className="rounded-2xl bg-emerald-50 p-5 border border-emerald-100">
          <p className="text-sm font-medium text-emerald-700">Báo giá tốt nhất</p>
          <p className="text-2xl font-bold text-emerald-900 mt-1">{money(bestQuote)}</p>
        </div>
      </div>

      <div className="mt-8 grid lg:grid-cols-[1fr_420px] gap-7">
        <main>
          <div className="flex gap-2 overflow-x-auto pb-3">
            {[
              ['ALL', 'Tất cả'], 
              ['OPEN', 'Đang nhận báo giá'], 
              ['SELLER_SELECTED', 'Đã chốt xưởng'], 
              ['COMPLETED', 'Hoàn tất']
            ].map(([value, label]) => (
              <button 
                key={value} 
                onClick={() => setFilter(value)} 
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all cursor-pointer ${filter === value ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:border-emerald-300'}`}
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
                className="inline-block mt-3 text-emerald-600 font-bold hover:text-emerald-700 cursor-pointer"
              >
                Tạo yêu cầu khảo giá đầu tiên
              </button>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {visible.map(request => { 
                const quotes = request.quotations || []; 
                const cheapest = quotes.length ? Math.min(...quotes.map((quote: any) => quote.price)) : undefined; 
                const reqImage = request.imageUrl || request.pattern;
                const isSelected = selected?.quotationRequestId === request.quotationRequestId;

                return (
                  <div 
                    key={request.quotationRequestId} 
                    onClick={() => setSelected(request)} 
                    className={`w-full text-left rounded-2xl border bg-white p-5 transition-all hover:shadow-md cursor-pointer ${isSelected ? 'border-emerald-500 ring-2 ring-emerald-200 shadow-sm' : 'border-gray-100'}`}
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex items-start gap-3.5">
                        {reqImage ? (
                          <div 
                            onClick={(e) => { e.stopPropagation(); setPreviewImage({ isOpen: true, url: reqImage, title: request.productType }); }}
                            className="w-16 h-16 rounded-xl overflow-hidden border border-emerald-200 shrink-0 bg-gray-50 relative group"
                          >
                            <img src={reqImage} alt={request.productType} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold">
                              🔍
                            </div>
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-2xl shrink-0">
                            🪵
                          </div>
                        )}
                        <div>
                          <h2 className="font-bold text-gray-900 text-lg">{request.productType || 'Yêu cầu nội thất'}</h2>
                          <p className="mt-0.5 text-xs text-gray-500">{request.category?.name || 'Nội thất'} · {new Date(request.createdAt).toLocaleDateString('vi-VN')}</p>
                        </div>
                      </div>
                      <span className={`h-fit rounded-full px-3 py-1 text-xs font-semibold ${statusStyle[request.status] || 'bg-gray-100 text-gray-600'}`}>
                        {statusText[request.status] || request.status}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-3 text-sm pt-3 border-t border-gray-100">
                      <div>
                        <p className="text-xs text-gray-500">Kích thước</p>
                        <p className="font-semibold text-gray-800">{request.length} × {request.width} × {request.height} cm</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Phản hồi</p>
                        <p className="font-semibold text-gray-800">{quotes.length ? `${quotes.length} xưởng báo giá` : 'Chờ xưởng báo giá'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Báo giá từ</p>
                        <p className="font-bold text-emerald-600">{quotes.length ? money(cheapest) : 'Chưa có'}</p>
                      </div>
                    </div>
                  </div>
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

              {/* Ảnh mẫu của khách */}
              {(selected.imageUrl || selected.pattern) && (
                <div className="mt-4 rounded-xl overflow-hidden border border-emerald-100 relative group bg-gray-50">
                  <img 
                    src={selected.imageUrl || selected.pattern} 
                    alt={selected.productType} 
                    className="w-full max-h-48 object-cover cursor-pointer hover:scale-102 transition-transform"
                    onClick={() => setPreviewImage({ isOpen: true, url: selected.imageUrl || selected.pattern, title: selected.productType })}
                  />
                  <div className="p-2 text-[11px] text-gray-500 text-center bg-gray-50 border-t border-gray-100">
                    📸 Ảnh mẫu bạn đã gửi cho các xưởng (Nhấn để phóng to)
                  </div>
                </div>
              )}

              <h2 className="text-xl font-bold text-gray-900 mt-3">{selected.productType || 'Yêu cầu nội thất'}</h2>
              {selected.description && (
                <p className="mt-2 text-sm leading-relaxed text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <span className="font-semibold text-gray-700">Ghi chú của bạn: </span>{selected.description}
                </p>
              )}
              
              <div className="mt-4 rounded-xl bg-emerald-50/40 p-4 text-xs sm:text-sm space-y-2 border border-emerald-100">
                <p><span className="text-gray-500">Kích thước:</span> <strong>{selected.length} × {selected.width} × {selected.height} cm</strong></p>
                <p><span className="text-gray-500">Số lượng:</span> <strong>{selected.quantity || 1} cái/bộ</strong></p>
                <p><span className="text-gray-500">Ngân sách dự kiến:</span> <strong className="text-emerald-700">{money(selected.budgetMin)} – {money(selected.budgetMax)}</strong></p>
              </div>

              <h3 className="mt-6 font-bold text-gray-900 text-sm uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span>🪵</span>
                  <span>Báo Giá Từ Các Xưởng ({selected.quotations?.length || 0})</span>
                </span>
                {selected.status === 'SELLER_SELECTED' && (
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    Đã chốt xưởng
                  </span>
                )}
              </h3>
              
              <div className="mt-3 space-y-4">
                {selected.quotations?.length ? selected.quotations.map((quote: any) => {
                  const seller = quote.seller;
                  const shopName = seller?.shopName || seller?.fullName || 'Xưởng mộc';
                  const isAccepted = quote.status === 'ACCEPTED' || selected.status === 'SELLER_SELECTED';
                  const isRejected = quote.status === 'REJECTED';

                  return (
                    <div 
                      key={quote.quotationId} 
                      className={`rounded-2xl border-2 p-4 relative overflow-hidden transition-all ${
                        isAccepted 
                          ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-200' 
                          : isRejected 
                          ? 'border-gray-200 bg-gray-50 opacity-60' 
                          : 'border-emerald-200 bg-emerald-50/30'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <p className="font-bold text-gray-900 text-base">{shopName}</p>
                          <p className="text-xs text-gray-500 mt-0.5">Xưởng chuyên sản xuất theo yêu cầu</p>
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

                      {/* Nút chọn xưởng */}
                      {selected.status !== 'SELLER_SELECTED' && selected.status !== 'COMPLETED' && !isRejected && (
                        <div className="mt-3">
                          <button
                            type="button"
                            onClick={() => openConfirmModal(quote)}
                            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-700/20 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <span>✓</span>
                            <span>Đồng Ý & Chọn Xưởng Này Gia Công</span>
                          </button>
                        </div>
                      )}

                      {isAccepted && (
                        <div className="mt-3 text-center text-xs font-bold text-emerald-800 bg-emerald-100 py-2 rounded-xl flex items-center justify-center gap-1.5">
                          <span>🎉</span>
                          <span>Bạn đã chọn xưởng này gia công cho đơn hàng</span>
                        </div>
                      )}

                      {isRejected && (
                        <div className="mt-2 text-center text-xs text-gray-500 italic">
                          Đã từ chối (Bạn đã chọn xưởng khác)
                        </div>
                      )}
                    </div>
                  );
                }) : (
                  <div className="rounded-xl bg-gray-50 p-5 text-center text-gray-500 text-xs">
                    <p className="font-medium text-gray-700 mb-1">Đang chờ xưởng gửi báo giá</p>
                    <p>Hệ thống đã phát yêu cầu kèm ảnh mẫu tới các xưởng mộc. Bạn sẽ nhận được thông báo ngay khi có xưởng báo giá!</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="py-20 text-center text-gray-500">
              <div className="text-4xl mb-3">🔎</div>
              <p className="text-sm">Chọn một yêu cầu bên trái để xem báo giá từ các xưởng mộc.</p>
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

      {/* Confirmation Modal to Accept a Quote */}
      {confirmModal.isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150"
          onClick={() => !confirmModal.submitting && setConfirmModal(m => ({ ...m, isOpen: false }))}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-150 text-center"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-3xl mb-4">
              🪵
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Xác Nhận Chọn Xưởng Gia Công
            </h3>
            <p className="text-sm text-gray-600 mb-4 leading-relaxed">
              Bạn có chắc chắn muốn chọn xưởng <strong>{confirmModal.shopName}</strong> với mức giá <strong>{money(confirmModal.price)}</strong> và thời gian hoàn thành <strong>{confirmModal.days} ngày</strong>?
            </p>
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 text-left mb-5">
              💡 <strong>Lưu ý:</strong> Sau khi bạn xác nhận, yêu cầu này sẽ được chốt riêng cho xưởng và <strong>tự động ẩn khỏi tất cả các xưởng khác</strong>. Xưởng sẽ liên hệ để tiến hành sản xuất.
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                disabled={confirmModal.submitting}
                onClick={() => setConfirmModal(m => ({ ...m, isOpen: false }))}
                className="w-1/3 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={confirmModal.submitting}
                onClick={handleConfirmAccept}
                className="w-2/3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md shadow-emerald-700/20 active:scale-[0.99] transition-all cursor-pointer disabled:bg-gray-400"
              >
                {confirmModal.submitting ? 'Đang xử lý...' : '✓ Xác Nhận Chọn Xưởng'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImage.isOpen && (
        <div 
          className="fixed inset-0 z-[99] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150"
          onClick={() => setPreviewImage({ isOpen: false, url: '', title: '' })}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h4 className="font-bold text-gray-900 text-sm truncate">{previewImage.title || 'Ảnh mẫu sản phẩm'}</h4>
              <button 
                onClick={() => setPreviewImage({ isOpen: false, url: '', title: '' })} 
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="p-4 flex items-center justify-center overflow-auto bg-gray-900/10">
              <img src={previewImage.url} alt="Ảnh mẫu xem trước" className="max-h-[70vh] object-contain rounded-lg" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyRequests;
