import { useState, useEffect } from 'react';
import api from '../utils/api';

const ManageProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Create form state
  const [showForm, setShowForm] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    categoryId: 1,
    description: ''
  });
  const [variants, setVariants] = useState([{ id: 1, sizeName: '', width: '', height: '', length: '', price: '', productionDays: '' }]);
  const [thumbnailImage, setThumbnailImage] = useState<{file: File, preview: string} | null>(null);
  const [additionalImages, setAdditionalImages] = useState<{file: File, preview: string}[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Custom Alert Modal State
  const [alertInfo, setAlertInfo] = useState<{isOpen: boolean, message: string, type: 'success' | 'error' | 'info'}>({isOpen: false, message: '', type: 'info'});

  // Product Details Modal State
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products/my-products');
      setProducts(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.get('/categories');
        setCategories(res.data);
        if (res.data.length > 0) {
          setFormData(prev => ({ ...prev, categoryId: res.data[0].categoryId }));
        }
      } catch (e) {
        console.error(e);
      }
    };
    if (showForm) {
      fetchCategories();
    }
  }, [showForm]);

  const handleVariantChange = (index: number, field: string, value: string) => {
    const newVariants = [...variants];
    newVariants[index] = { ...newVariants[index], [field]: value };
    setVariants(newVariants);
  };

  const addVariant = () => {
    setVariants([...variants, { id: Date.now(), sizeName: '', width: '', height: '', length: '', price: '', productionDays: '' }]);
  };

  const removeVariant = (index: number) => {
    if (variants.length <= 1) return alert('Sản phẩm phải có ít nhất 1 kích thước.');
    setVariants(variants.filter((_, i) => i !== index));
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setThumbnailImage({
        file,
        preview: URL.createObjectURL(file)
      });
    }
  };

  const handleAdditionalImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      if (additionalImages.length + newFiles.length > 9) {
        return alert('Chỉ được chọn tối đa 9 ảnh phụ!');
      }
      
      const newImages = newFiles.map(file => ({
        file,
        preview: URL.createObjectURL(file)
      }));
      setAdditionalImages([...additionalImages, ...newImages]);
    }
  };

  const removeAdditionalImage = (index: number) => {
    setAdditionalImages(additionalImages.filter((_, i) => i !== index));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!thumbnailImage) return setAlertInfo({isOpen: true, message: 'Vui lòng chọn ảnh đại diện cho sản phẩm.', type: 'error'});

    setSubmitting(true);
    try {
      // Create FormData for multipart submission
      const form = new FormData();
      form.append('name', formData.name);
      form.append('categoryId', formData.categoryId.toString());
      form.append('description', formData.description);

      form.append('variantsJson', JSON.stringify(variants.map(v => ({
        sizeName: v.sizeName,
        width: Number(v.width),
        height: Number(v.height),
        length: Number(v.length),
        price: Number(v.price),
        productionDays: Number(v.productionDays)
      }))));

      // Append thumbnail as the first image (index 0)
      form.append('images', thumbnailImage.file);
      form.append('thumbnailIndex', '0');

      // Append additional images
      additionalImages.forEach((img) => {
        form.append('images', img.file);
      });

      // Use native fetch to completely avoid Axios boundary/header stripping issues with FormData
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5234/api/products', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: form
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Lỗi từ server');
      }

      setAlertInfo({isOpen: true, message: 'Thêm sản phẩm thành công!', type: 'success'});

      setShowForm(false);
      setThumbnailImage(null);
      setAdditionalImages([]);
      fetchProducts();
    } catch (err: any) {
      console.error(err.response || err);
      setAlertInfo({isOpen: true, message: 'Lỗi khi thêm sản phẩm.', type: 'error'});
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa sản phẩm này không? Tất cả hình ảnh và kích thước liên quan sẽ bị xóa!')) return;
    
    try {
      await api.delete(`/products/${id}`);
      setAlertInfo({isOpen: true, message: 'Xóa sản phẩm thành công!', type: 'success'});
      fetchProducts();
    } catch (err) {
      console.error(err);
      setAlertInfo({isOpen: true, message: 'Lỗi khi xóa sản phẩm.', type: 'error'});
    }
  };

  const handleToggleStatus = async (id: number, currentStatus: string) => {
    const action = currentStatus === 'ACTIVE' ? 'tạm dừng' : 'kích hoạt';
    if (!window.confirm(`Bạn có chắc chắn muốn ${action} sản phẩm này?`)) return;

    try {
      await api.patch(`/products/${id}/status`);
      setAlertInfo({isOpen: true, message: `Đã ${action} sản phẩm thành công!`, type: 'success'});
      fetchProducts();
    } catch (err) {
      console.error(err);
      setAlertInfo({isOpen: true, message: `Lỗi khi ${action} sản phẩm.`, type: 'error'});
    }
  };

  if (loading) return <div className="text-center py-20">Đang tải sản phẩm...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Quản Lý Sản Phẩm</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-sm"
        >
          {showForm ? 'Đóng form' : '+ Thêm Sản Phẩm Mới'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8 w-full max-w-5xl mx-auto">
          <h2 className="text-xl font-bold text-gray-900 mb-6 border-b pb-2">Thêm Sản Phẩm Mới</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên sản phẩm *</label>
                <input
                  name="name"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                  value={formData.name}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Danh mục *</label>
                <select
                  name="categoryId"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                  value={formData.categoryId}
                  onChange={(e) => setFormData(prev => ({ ...prev, categoryId: e.target.value }))}
                >
                  {categories.map(c => (
                    <option key={c.categoryId} value={c.categoryId}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
              <textarea
                name="description"
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                value={formData.description}
                onChange={handleChange}
              />
            </div>
            {/* Variants Section */}
            <div className="mt-8">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-1">Cấu hình kích thước & Giá</h3>
                <button type="button" onClick={addVariant} className="text-sm bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-md font-medium hover:bg-emerald-200">
                  + Thêm kích thước
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-600 text-sm">
                      <th className="p-2 border">Tên phân loại (VD: 60x90cm) *</th>
                      <th className="p-2 border">Kích thước D x R x C (cm)</th>
                      <th className="p-2 border">Giá bán (VNĐ) *</th>
                      <th className="p-2 border">T.gian thi công (Ngày)*</th>
                      <th className="p-2 border text-center">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {variants.map((v, index) => (
                      <tr key={v.id} className="border-b">
                        <td className="p-2 border">
                          <input required placeholder="VD: Tranh khổ lớn" className="w-full p-2 border rounded" value={v.sizeName} onChange={(e) => handleVariantChange(index, 'sizeName', e.target.value)} />
                        </td>
                        <td className="p-2 border flex space-x-1">
                          <input placeholder="Dài" className="w-16 p-2 border rounded" value={v.length} onChange={(e) => handleVariantChange(index, 'length', e.target.value)} />
                          <input placeholder="Rộng" className="w-16 p-2 border rounded" value={v.width} onChange={(e) => handleVariantChange(index, 'width', e.target.value)} />
                          <input placeholder="Cao" className="w-16 p-2 border rounded" value={v.height} onChange={(e) => handleVariantChange(index, 'height', e.target.value)} />
                        </td>
                        <td className="p-2 border">
                          <input type="number" required placeholder="1000000" className="w-full p-2 border rounded" value={v.price} onChange={(e) => handleVariantChange(index, 'price', e.target.value)} />
                        </td>
                        <td className="p-2 border">
                          <input type="number" required placeholder="5" className="w-full p-2 border rounded" value={v.productionDays} onChange={(e) => handleVariantChange(index, 'productionDays', e.target.value)} />
                        </td>
                        <td className="p-2 border text-center">
                          <button type="button" onClick={() => removeVariant(index)} className="text-red-500 hover:text-red-700 font-bold p-2">✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Images Section */}
            <div className="mt-8 border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-1 mb-4">Hình ảnh sản phẩm</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                
                {/* Thumbnail Upload */}
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ảnh Đại Diện (Bắt buộc) *</label>
                  {thumbnailImage ? (
                    <div className="relative border-2 border-emerald-500 rounded-lg overflow-hidden h-40 shadow-md">
                      <img src={thumbnailImage.preview} alt="Thumbnail preview" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => setThumbnailImage(null)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600">✕</button>
                      <div className="absolute bottom-0 left-0 right-0 bg-emerald-500 text-white text-xs py-1 text-center font-semibold">Ảnh Đại Diện</div>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-gray-300 rounded-lg h-40 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 hover:border-emerald-500 transition-colors">
                      <span className="text-3xl text-gray-400">+</span>
                      <span className="text-sm text-gray-500 mt-2 font-medium">Tải ảnh đại diện</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleThumbnailChange} />
                    </label>
                  )}
                </div>

                {/* Additional Images Upload */}
                <div className="col-span-1 md:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ảnh khác (Tối đa 9 ảnh phụ)</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {additionalImages.map((img, index) => (
                      <div key={index} className="relative border border-gray-200 rounded-lg overflow-hidden h-28">
                        <img src={img.preview} alt="Additional preview" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => removeAdditionalImage(index)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600">✕</button>
                      </div>
                    ))}
                    
                    {additionalImages.length < 9 && (
                      <label className="border-2 border-dashed border-gray-300 rounded-lg h-28 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 hover:border-emerald-500 transition-colors">
                        <span className="text-2xl text-gray-400">+</span>
                        <span className="text-xs text-gray-500 mt-1">Thêm ảnh phụ</span>
                        <input type="file" multiple accept="image/*" className="hidden" onChange={handleAdditionalImagesChange} />
                      </label>
                    )}
                  </div>
                </div>

              </div>
            </div>

            <div className="pt-4 flex justify-end space-x-3 border-t border-gray-100 mt-6">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors shadow-md disabled:bg-gray-400"
              >
                {submitting ? 'Đang lưu...' : 'Lưu Sản Phẩm'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên Sản Phẩm</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng Thái</th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Chi Tiết</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Hành động</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {products.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center text-sm text-gray-500">
                  Chưa có sản phẩm nào. Hãy tạo sản phẩm đầu tiên!
                </td>
              </tr>
            ) : (
              products.map((product: any) => (
                <tr key={product.productId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${product.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {product.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                    <button onClick={() => setSelectedProduct(product)} className="text-blue-600 hover:text-blue-900 underline">Xem chi tiết</button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <button 
                      onClick={() => handleToggleStatus(product.productId, product.status)}
                      className={`${product.status === 'ACTIVE' ? 'text-yellow-600 hover:text-yellow-900 bg-yellow-50 hover:bg-yellow-100' : 'text-green-600 hover:text-green-900 bg-green-50 hover:bg-green-100'} px-3 py-1 rounded-md transition-colors`}
                    >
                      {product.status === 'ACTIVE' ? 'Tạm Dừng' : 'Kích Hoạt'}
                    </button>
                    <button 
                      onClick={() => handleDelete(product.productId)}
                      className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-md transition-colors"
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {/* Alert Modal */}
      {alertInfo.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full text-center">
            <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4 ${
              alertInfo.type === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
            }`}>
              {alertInfo.type === 'success' ? '✓' : '!'}
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Thông báo</h3>
            <p className="text-sm text-gray-500 mb-6">{alertInfo.message}</p>
            <button
              onClick={() => setAlertInfo({ ...alertInfo, isOpen: false })}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-emerald-600 text-base font-medium text-white hover:bg-emerald-700 focus:outline-none sm:text-sm"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* Product Details Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-2xl font-bold text-gray-900">Chi tiết sản phẩm</h3>
              <button onClick={() => setSelectedProduct(null)} className="text-gray-400 hover:text-gray-600 text-2xl font-bold">&times;</button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  {selectedProduct.productImages && selectedProduct.productImages.length > 0 ? (
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold text-gray-500 uppercase mb-3">Hình ảnh</h4>
                      <div className="flex gap-4 overflow-x-auto pb-4">
                        {selectedProduct.productImages.sort((a: any, b: any) => a.displayOrder - b.displayOrder).map((img: any) => (
                          <div key={img.productImageId} className="flex-shrink-0 relative">
                            <img 
                              src={`http://localhost:5234${img.imageUrl}`} 
                              alt="Product" 
                              className={`h-32 w-32 object-cover rounded-lg border-2 ${img.isThumbnail ? 'border-emerald-500' : 'border-transparent'}`}
                            />
                            {img.isThumbnail && (
                              <span className="absolute top-1 right-1 bg-emerald-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                                ẢNH BÌA
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <h4 className="text-sm font-semibold text-gray-500 uppercase mb-1">Tên sản phẩm</h4>
                  <p className="text-lg text-gray-900 font-medium mb-4">{selectedProduct.name}</p>
                  
                  <h4 className="text-sm font-semibold text-gray-500 uppercase mb-1">Mô tả</h4>
                  <p className="text-gray-700 whitespace-pre-wrap mb-4">{selectedProduct.description || 'Không có mô tả'}</p>
                  
                  <h4 className="text-sm font-semibold text-gray-500 uppercase mb-1">Trạng thái</h4>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${selectedProduct.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {selectedProduct.status}
                  </span>
                </div>
                
                <div>
                  <h4 className="text-sm font-semibold text-gray-500 uppercase mb-3">Các phân loại kích thước</h4>
                  {selectedProduct.productVariants && selectedProduct.productVariants.length > 0 ? (
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 space-y-3">
                      {selectedProduct.productVariants.map((v: any) => (
                        <div key={v.variantId} className="flex justify-between items-center border-b border-gray-200 pb-2 last:border-0 last:pb-0">
                          <div>
                            <span className="font-medium text-gray-900 block">{v.sizeName || `${v.width}x${v.length}`}</span>
                            <span className="text-xs text-gray-500">Thi công: {v.productionDays} ngày</span>
                          </div>
                          <span className="font-bold text-emerald-600">
                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v.price)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 italic">Chưa có phân loại nào.</p>
                  )}
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end rounded-b-xl">
              <button
                onClick={() => setSelectedProduct(null)}
                className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md font-medium hover:bg-gray-300 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageProducts;
