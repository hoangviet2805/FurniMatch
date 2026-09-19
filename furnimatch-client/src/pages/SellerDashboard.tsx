import { useState, useEffect } from 'react';
import api from '../utils/api';

const SellerDashboard = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  
  // Quotation form state
  const [price, setPrice] = useState('');
  const [productionDays, setProductionDays] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await api.get('/quotationrequests');
      setRequests(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/quotations', {
        quotationRequestId: selectedRequest.quotationRequestId,
        price: Number(price),
        productionDays: Number(productionDays),
        note
      });
      alert('Gửi báo giá thành công!');
      setSelectedRequest(null);
      fetchRequests(); // Refresh list
    } catch (err) {
      console.error(err);
      alert('Gửi báo giá thất bại.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-center py-20">Đang tải yêu cầu...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Bảng Điều Khiển Xưởng (Seller)</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left side: List of requests */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">Danh Sách Khách Hàng Yêu Cầu Khảo Giá</h2>
          {requests.length === 0 ? (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-gray-500 text-center">
              Hiện tại chưa có yêu cầu khảo giá nào.
            </div>
          ) : (
            requests.map((req: any) => (
              <div 
                key={req.quotationRequestId} 
                className={`bg-white p-6 rounded-xl shadow-sm border transition-colors cursor-pointer hover:border-emerald-500 
                  ${selectedRequest?.quotationRequestId === req.quotationRequestId ? 'border-emerald-500 ring-1 ring-emerald-500' : 'border-gray-200'}`}
                onClick={() => setSelectedRequest(req)}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Sản phẩm: {req.productType || 'Không xác định'}</h3>
                    <p className="text-sm text-gray-500">Ngày yêu cầu: {new Date(req.createdAt).toLocaleDateString('vi-VN')}</p>
                  </div>
                  <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                    {req.status === 'OPEN' ? 'Đang Mở' : req.status}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="block text-gray-500">Chất Liệu</span>
                    <span className="font-medium text-gray-900">{req.material || 'N/A'}</span>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="block text-gray-500">Rộng (cm)</span>
                    <span className="font-medium text-gray-900">{req.width}</span>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="block text-gray-500">Cao (cm)</span>
                    <span className="font-medium text-gray-900">{req.height}</span>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="block text-gray-500">Số Lượng</span>
                    <span className="font-medium text-gray-900">{req.quantity}</span>
                  </div>
                </div>

                <p className="text-gray-700 text-sm mt-2"><span className="font-semibold">Mô tả thêm:</span> {req.description || 'Không có mô tả'}</p>
              </div>
            ))
          )}
        </div>

        {/* Right side: Submit Quotation Form */}
        <div>
          {selectedRequest ? (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-emerald-200 sticky top-24">
              <h2 className="text-xl font-bold text-gray-900 mb-6 border-b pb-2">
                Gửi Báo Giá
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                Đang báo giá cho yêu cầu: <span className="font-semibold text-gray-900">#{selectedRequest.quotationRequestId} - {selectedRequest.productType}</span>
              </p>
              
              <form onSubmit={handleSubmitQuote} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Giá đề xuất (VNĐ)</label>
                  <input
                    type="number"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    placeholder="VD: 5000000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Thời gian sản xuất (Ngày)</label>
                  <input
                    type="number"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                    value={productionDays}
                    onChange={e => setProductionDays(e.target.value)}
                    placeholder="VD: 14"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú cho khách hàng</label>
                  <textarea
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="VD: Giá đã bao gồm phí vận chuyển và lắp đặt tại nội thành."
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors shadow-md disabled:bg-gray-400"
                >
                  {submitting ? 'Đang gửi...' : 'Xác Nhận Báo Giá'}
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 text-center text-gray-500 h-64 flex items-center justify-center">
              Vui lòng chọn một yêu cầu bên trái để tiến hành báo giá.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SellerDashboard;
