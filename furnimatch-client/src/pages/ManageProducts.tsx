import { useState, useEffect } from 'react';
import api, { API_BASE_URL } from '../utils/api';
import { PauseCircle, PlayCircle, Trash2, AlertTriangle, CheckCircle, Info, PackagePlus, Plus, X, UploadCloud, Edit } from 'lucide-react';

const ManageProducts = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Create form state
  const [showForm, setShowForm] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    categoryId: 1,
    description: ''
  });
  const [materials, setMaterials] = useState(['']);
  const [variants, setVariants] = useState([{ id: 1, sizeName: '', materialName: '', width: '', height: '', length: '', price: '', productionDays: '', stock: '' }]);
  const [thumbnailImage, setThumbnailImage] = useState<{file: File, preview: string} | null>(null);
  const [additionalImages, setAdditionalImages] = useState<{file: File, preview: string}[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Custom Alert Modal State
  const [alertInfo, setAlertInfo] = useState<{isOpen: boolean, message: string, type: 'success' | 'error' | 'info'}>({isOpen: false, message: '', type: 'info'});

  // Custom Confirm Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    productName: string;
    message: string;
    confirmText: string;
    cancelText?: string;
    type: 'pause' | 'activate' | 'delete';
    onConfirm: () => Promise<void> | void;
  }>({
    isOpen: false,
    title: '',
    productName: '',
    message: '',
    confirmText: 'Xác nhận',
    cancelText: 'Hủy',
    type: 'pause',
    onConfirm: () => {}
  });

  // Product Details Modal State
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  // Edit Product State
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [editingFormData, setEditingFormData] = useState({
    name: '',
    categoryId: 1,
    description: '',
    customSizeSupported: false
  });
  const [editingMaterials, setEditingMaterials] = useState(['']);
  const [editingVariants, setEditingVariants] = useState<any[]>([]);
  const [editingExistingImages, setEditingExistingImages] = useState<any[]>([]);
  const [editingExistingThumbnailUrl, setEditingExistingThumbnailUrl] = useState<string | null>(null);
  const [editingNewThumbnailImage, setEditingNewThumbnailImage] = useState<{file: File, preview: string} | null>(null);
  const [editingNewAdditionalImages, setEditingNewAdditionalImages] = useState<{file: File, preview: string}[]>([]);

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
    setVariants([...variants, { id: Date.now(), sizeName: '', materialName: '', width: '', height: '', length: '', price: '', productionDays: '', stock: '' }]);
  };

  const removeVariant = (index: number) => {
    if (variants.length <= 1) return setAlertInfo({ isOpen: true, message: 'Sản phẩm phải có ít nhất 1 kích thước.', type: 'error' });
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
        return setAlertInfo({ isOpen: true, message: 'Chỉ được chọn tối đa 9 ảnh phụ!', type: 'error' });
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

  const handleEditVariantChange = (index: number, field: string, value: string) => {
    const newVariants = [...editingVariants];
    newVariants[index] = { ...newVariants[index], [field]: value };
    setEditingVariants(newVariants);
  };

  const removeEditVariant = (index: number) => {
    if (editingVariants.length <= 1) {
      setAlertInfo({ isOpen: true, message: 'Sản phẩm phải có ít nhất 1 kích thước.', type: 'error' });
      return;
    }
    setEditingVariants(editingVariants.filter((_, i) => i !== index));
  };

  const handleEditThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setEditingNewThumbnailImage({ file, preview: URL.createObjectURL(file) });
    }
  };

  const removeEditAdditionalImage = (index: number) => {
    setEditingNewAdditionalImages(editingNewAdditionalImages.filter((_, i) => i !== index));
  };

  const handleEditAdditionalImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      if (editingExistingImages.length + editingNewAdditionalImages.length + newFiles.length > 9) {
        setAlertInfo({ isOpen: true, message: 'Chỉ được chọn tối đa 9 ảnh phụ!', type: 'error' });
        return;
      }
      const newImages = newFiles.map(file => ({ file, preview: URL.createObjectURL(file) }));
      setEditingNewAdditionalImages([...editingNewAdditionalImages, ...newImages]);
    }
  };


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!thumbnailImage) return setAlertInfo({isOpen: true, message: 'Vui lòng chọn ảnh đại diện cho sản phẩm.', type: 'error'});

    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];
      const l = Number(v.length);
      const w = Number(v.width);
      const h = Number(v.height);
      const p = Number(v.price);
      const d = Number(v.productionDays);
      const s = Number(v.stock);

      if (v.length === '' || v.length === null || v.length === undefined || isNaN(l) || l <= 0) return setAlertInfo({isOpen: true, message: `Chiều dài phân loại "${v.sizeName}" phải là số lớn hơn 0.`, type: 'error'});
      if (v.width === '' || v.width === null || v.width === undefined || isNaN(w) || w <= 0) return setAlertInfo({isOpen: true, message: `Chiều rộng phân loại "${v.sizeName}" phải là số lớn hơn 0.`, type: 'error'});
      if (v.height === '' || v.height === null || v.height === undefined || isNaN(h) || h <= 0) return setAlertInfo({isOpen: true, message: `Chiều cao phân loại "${v.sizeName}" phải là số lớn hơn 0.`, type: 'error'});
      if (v.price === '' || v.price === null || v.price === undefined || isNaN(p) || p <= 0) return setAlertInfo({isOpen: true, message: `Giá bán phân loại "${v.sizeName}" phải là số lớn hơn 0.`, type: 'error'});
      if (v.productionDays === '' || v.productionDays === null || v.productionDays === undefined || isNaN(d) || d <= 0) return setAlertInfo({isOpen: true, message: `Thời gian thi công phân loại "${v.sizeName}" phải là số lớn hơn 0.`, type: 'error'});
      if (v.stock === '' || v.stock === null || v.stock === undefined || isNaN(s) || s < 0) return setAlertInfo({isOpen: true, message: `Số lượng kho phân loại "${v.sizeName}" phải là số lớn hoặc bằng 0.`, type: 'error'});
    }

    setSubmitting(true);
    try {
      // Create FormData for multipart submission
      const form = new FormData();
      form.append('name', formData.name);
      form.append('categoryId', formData.categoryId.toString());
      form.append('description', formData.description);
      form.append('material', JSON.stringify(materials.filter(m => m.trim() !== '')));

      form.append('variantsJson', JSON.stringify(variants.map(v => ({
        sizeName: v.sizeName, materialName: v.materialName,
        width: Number(v.width),
        height: Number(v.height),
        length: Number(v.length),
        price: Number(v.price),
        productionDays: Number(v.productionDays),
        stock: Number(v.stock)
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
      const response = await fetch(`${API_BASE_URL}/api/products`, {
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

  const checkIfHasChanges = () => {
    if (!editingProduct) return false;

    // 1. Kiểm tra thông tin cơ bản
    if (editingFormData.name.trim() !== (editingProduct.name || '').trim()) return true;
    if (Number(editingFormData.categoryId) !== Number(editingProduct.categoryId)) return true;
    if ((editingFormData.description || '').trim() !== (editingProduct.description || '').trim()) return true;
    if (Boolean(editingFormData.customSizeSupported) !== Boolean(editingProduct.customSizeSupported)) return true;

    // 1.5. Kiểm tra chất liệu
    const currentMaterials = JSON.stringify(editingMaterials.filter(m => m.trim() !== ''));
    let origMaterials = '[]';
    if (editingProduct.material) {
      try {
        const parsed = JSON.parse(editingProduct.material);
        origMaterials = JSON.stringify(Array.isArray(parsed) ? parsed.filter((m: any) => typeof m === 'string' && m.trim() !== '') : [editingProduct.material]);
      } catch {
        origMaterials = JSON.stringify([editingProduct.material]);
      }
    }
    if (currentMaterials !== origMaterials) return true;

    // 2. Kiểm tra có chọn ảnh đại diện mới hoặc ảnh phụ mới không
    if (editingNewThumbnailImage !== null) return true;
    if (editingNewAdditionalImages.length > 0) return true;

    // 3. Kiểm tra ảnh đại diện hoặc ảnh phụ cũ có bị xóa không
    const originalImages = editingProduct.productImages || [];
    const origThumb = originalImages.find((i: any) => i.isThumbnail);
    const origThumbUrl = origThumb ? origThumb.imageUrl : null;
    if (editingExistingThumbnailUrl !== origThumbUrl) return true;

    const origAdditionals = originalImages.filter((i: any) => !i.isThumbnail);
    if (editingExistingImages.length !== origAdditionals.length) return true;

    for (let i = 0; i < origAdditionals.length; i++) {
      if (origAdditionals[i].imageUrl !== editingExistingImages[i]?.imageUrl) return true;
    }

    // 4. Kiểm tra danh sách phân loại kích thước, giá, ngày thi công
    const origVariants = editingProduct.productVariants || [];
    if (editingVariants.length !== origVariants.length) return true;

    for (let i = 0; i < origVariants.length; i++) {
      const orig = origVariants[i];
      const curr = editingVariants[i];
      if (!curr) return true;

      if ((curr.sizeName || '').trim() !== (orig.sizeName || '').trim()) return true;
      if (Number(curr.width || 0) !== Number(orig.width || 0)) return true;
      if (Number(curr.height || 0) !== Number(orig.height || 0)) return true;
      if (Number(curr.length || 0) !== Number(orig.length || 0)) return true;
      if (Number(curr.price || 0) !== Number(orig.price || 0)) return true;
      if (Number(curr.productionDays || 0) !== Number(orig.productionDays || 0)) return true;
      if (Number(curr.stock || 0) !== Number(orig.stock || 0)) return true;
    }

    return false;
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    for (let i = 0; i < editingVariants.length; i++) {
      const v = editingVariants[i];
      const l = Number(v.length);
      const w = Number(v.width);
      const h = Number(v.height);
      const p = Number(v.price);
      const d = Number(v.productionDays);
      const s = Number(v.stock);

      if (v.length === '' || v.length === null || v.length === undefined || isNaN(l) || l <= 0) return setAlertInfo({isOpen: true, message: `Chiều dài phân loại "${v.sizeName}" phải là số lớn hơn 0.`, type: 'error'});
      if (v.width === '' || v.width === null || v.width === undefined || isNaN(w) || w <= 0) return setAlertInfo({isOpen: true, message: `Chiều rộng phân loại "${v.sizeName}" phải là số lớn hơn 0.`, type: 'error'});
      if (v.height === '' || v.height === null || v.height === undefined || isNaN(h) || h <= 0) return setAlertInfo({isOpen: true, message: `Chiều cao phân loại "${v.sizeName}" phải là số lớn hơn 0.`, type: 'error'});
      if (v.price === '' || v.price === null || v.price === undefined || isNaN(p) || p <= 0) return setAlertInfo({isOpen: true, message: `Giá bán phân loại "${v.sizeName}" phải là số lớn hơn 0.`, type: 'error'});
      if (v.productionDays === '' || v.productionDays === null || v.productionDays === undefined || isNaN(d) || d <= 0) return setAlertInfo({isOpen: true, message: `Thời gian thi công phân loại "${v.sizeName}" phải là số lớn hơn 0.`, type: 'error'});
      if (v.stock === '' || v.stock === null || v.stock === undefined || isNaN(s) || s < 0) return setAlertInfo({isOpen: true, message: `Số lượng kho phân loại "${v.sizeName}" phải là số lớn hoặc bằng 0.`, type: 'error'});
    }

    // Nếu không có bất kỳ thay đổi nào, không thực hiện thay đổi gì và đóng modal
    if (!checkIfHasChanges()) {
      setAlertInfo({
        isOpen: true,
        message: 'Không có thông tin nào được thay đổi.',
        type: 'info'
      });
      setEditingProduct(null);
      return;
    }

    if (!editingExistingThumbnailUrl && !editingNewThumbnailImage) return setAlertInfo({isOpen: true, message: 'Vui lòng chọn ảnh đại diện cho sản phẩm.', type: 'error'});

    setSubmitting(true);
    try {
      const form = new FormData();
      form.append('name', editingFormData.name);
      form.append('categoryId', editingFormData.categoryId.toString());
      form.append('description', editingFormData.description);
      form.append('material', JSON.stringify(editingMaterials.filter(m => m.trim() !== '')));
      form.append('customSizeSupported', editingFormData.customSizeSupported ? 'true' : 'false');

      form.append('variantsJson', JSON.stringify(editingVariants.map(v => ({
        sizeName: v.sizeName, materialName: v.materialName,
        width: Number(v.width),
        height: Number(v.height),
        length: Number(v.length),
        price: Number(v.price),
        productionDays: Number(v.productionDays),
        stock: Number(v.stock)
      }))));

      // Append ExistingImagesJson
      const existingUrls = editingExistingImages.map(img => img.imageUrl);
      if (!editingNewThumbnailImage && editingExistingThumbnailUrl) {
        existingUrls.push(editingExistingThumbnailUrl);
      }
      form.append('existingImagesJson', JSON.stringify(existingUrls));

      if (!editingNewThumbnailImage && editingExistingThumbnailUrl) {
        form.append('thumbnailImageUrl', editingExistingThumbnailUrl);
      }

      let newIndexCounter = 0;
      if (editingNewThumbnailImage) {
        form.append('newImages', editingNewThumbnailImage.file);
        form.append('newThumbnailIndex', newIndexCounter.toString());
        newIndexCounter++;
      }

      editingNewAdditionalImages.forEach(img => {
        form.append('newImages', img.file);
        newIndexCounter++;
      });

      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/products/${editingProduct.productId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: form
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Lỗi từ server');
      }

      setAlertInfo({isOpen: true, message: 'Cập nhật sản phẩm thành công!', type: 'success'});
      setEditingProduct(null);
      fetchProducts();
    } catch (err: any) {
      console.error(err.response || err);
      setAlertInfo({isOpen: true, message: 'Lỗi khi cập nhật sản phẩm.', type: 'error'});
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (product: any) => {
    setConfirmModal({
      isOpen: true,
      type: 'delete',
      title: 'Xác Nhận Xóa Sản Phẩm',
      productName: product.name,
      message: 'Bạn có chắc chắn muốn xóa sản phẩm này không? Tất cả hình ảnh và kích thước liên quan sẽ bị xóa vĩnh viễn!',
      confirmText: 'Xóa sản phẩm',
      cancelText: 'Hủy bỏ',
      onConfirm: async () => {
        try {
          await api.delete(`/products/${product.productId}`);
          setAlertInfo({ isOpen: true, message: 'Xóa sản phẩm thành công!', type: 'success' });
          fetchProducts();
        } catch (err) {
          console.error(err);
          setAlertInfo({ isOpen: true, message: 'Lỗi khi xóa sản phẩm.', type: 'error' });
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleToggleStatus = (product: any) => {
    const isPausing = product.status === 'ACTIVE';
    const actionText = isPausing ? 'Tạm dừng' : 'Kích hoạt';
    setConfirmModal({
      isOpen: true,
      type: isPausing ? 'pause' : 'activate',
      title: isPausing ? 'Tạm Dừng Kinh Doanh' : 'Kích Hoạt Sản Phẩm',
      productName: product.name,
      message: isPausing 
        ? 'Bạn có chắc chắn muốn tạm dừng sản phẩm này? Khi tạm dừng, sản phẩm sẽ tạm ẩn khỏi gian hàng và khách hàng không thể tìm kiếm hoặc đặt hàng.'
        : 'Bạn có chắc chắn muốn kích hoạt lại sản phẩm này? Sản phẩm sẽ được hiển thị công khai trên gian hàng để khách hàng có thể mua.',
      confirmText: isPausing ? 'Tạm Dừng' : 'Kích Hoạt',
      cancelText: 'Hủy bỏ',
      onConfirm: async () => {
        try {
          await api.patch(`/products/${product.productId}/status`);
          setAlertInfo({ isOpen: true, message: `Đã ${actionText.toLowerCase()} sản phẩm thành công!`, type: 'success' });
          fetchProducts();
        } catch (err) {
          console.error(err);
          setAlertInfo({ isOpen: true, message: `Lỗi khi ${actionText.toLowerCase()} sản phẩm.`, type: 'error' });
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  if (loading) return <div className="text-center py-20">Đang tải sản phẩm...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Quản Lý Sản Phẩm</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-semibold transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer"
        >
          {showForm ? (
            <>
              <X className="w-5 h-5" />
              <span>Đóng form</span>
            </>
          ) : (
            <>
              <Plus className="w-5 h-5" />
              <span>Thêm Sản Phẩm Mới</span>
            </>
          )}
        </button>
      </div>

      {showForm && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 p-6 sm:p-10 mb-10 shadow-2xl shadow-emerald-950/25 text-white animate-in fade-in zoom-in-95 duration-200">
          {/* Decorative Background Orbs */}
          <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-emerald-400/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-teal-300/20 blur-3xl pointer-events-none" />
          <div className="absolute top-1/2 left-1/3 w-64 h-64 rounded-full bg-emerald-300/10 blur-2xl pointer-events-none" />

          {/* Section Header */}
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-13 h-13 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-inner flex-shrink-0">
                <PackagePlus className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Thêm Sản Phẩm Mới</h2>
                <p className="text-emerald-100/90 text-xs sm:text-sm mt-0.5">Nhập đầy đủ thông tin, kích thước và hình ảnh để đăng bán sản phẩm lên gian hàng</p>
              </div>
            </div>
            
          </div>

          {/* White Card Container for the Input Form */}
          <div className="relative z-10 bg-white rounded-2xl shadow-xl p-6 sm:p-8 text-gray-900 border border-white/80">
            <form onSubmit={handleSubmit} className="space-y-8">
              
              {/* Part 1: Basic Information */}
              <div>
                <div className="flex items-center gap-2.5 mb-5 pb-2.5 border-b border-gray-100">
                  <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center">1</span>
                  <h3 className="text-base font-bold text-gray-900">Thông tin cơ bản</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                      Tên sản phẩm <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="name"
                      required
                      placeholder="Ví dụ: Tủ quần áo gỗ sồi Bắc Âu 4 cánh..."
                      className="w-full px-4 py-2.5 bg-gray-50/60 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white transition-all outline-none"
                      value={formData.name}
                      onChange={handleChange}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                      Danh mục <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="categoryId"
                      required
                      className="w-full px-4 py-2.5 bg-gray-50/60 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white transition-all outline-none"
                      value={formData.categoryId}
                      onChange={(e) => setFormData(prev => ({ ...prev, categoryId: Number(e.target.value) }))}
                    >
                      {categories.map(c => (
                        <option key={c.categoryId} value={c.categoryId}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                    Mô tả sản phẩm
                  </label>
                  <textarea
                    name="description"
                    rows={4}
                    placeholder="Mô tả chi tiết về kiểu dáng, chất liệu gỗ, phong cách, đặc điểm nổi bật của sản phẩm..."
                    className="w-full px-4 py-2.5 bg-gray-50/60 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white transition-all outline-none leading-relaxed"
                    value={formData.description}
                    onChange={handleChange}
                  />
                </div>

                <div className="mt-5 hidden">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                      Chất liệu sản phẩm
                    </label>
                    <button
                      type="button"
                      onClick={() => setMaterials(prev => [...prev, ''])}
                      className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg transition-all"
                    >
                      + Thêm chất liệu
                    </button>
                  </div>
                  <div className="space-y-2">
                    {materials.map((mat, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center shrink-0">{idx + 1}</span>
                        <input
                          type="text"
                          placeholder="Ví dụ: Gỗ sồi, Gỗ óc chó, Vải nhung..."
                          value={mat}
                          onChange={(e) => { const m = [...materials]; m[idx] = e.target.value; setMaterials(m); }}
                          className="flex-1 px-3 py-2 bg-gray-50/60 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white transition-all outline-none"
                        />
                        {materials.length > 1 && (
                          <button type="button" onClick={() => setMaterials(materials.filter((_, i) => i !== idx))} className="text-rose-400 hover:text-rose-600 text-xl font-bold w-7 h-7 flex items-center justify-center shrink-0 rounded-full hover:bg-rose-50">×</button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Part 2: Variants */}
              <div>
                <div className="flex items-center justify-between mb-4 pb-2.5 border-b border-gray-100">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center">2</span>
                    <h3 className="text-base font-bold text-gray-900">Cấu hình kích thước & Giá bán</h3>
                  </div>
                  <button
                    type="button"
                    onClick={addVariant}
                    className="text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm kích thước</span>
                  </button>
                </div>

                <div className="overflow-x-auto rounded-xl border border-gray-200 bg-gray-50/40">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-100/70 text-gray-600 text-xs font-semibold uppercase tracking-wider">
                        <th className="p-3 border-b border-gray-200">Tên phân loại (VD: 1m6 x 2m) *</th>
                        <th className="p-3 border-b border-gray-200">Chất liệu *</th>
                        <th className="p-3 border-b border-gray-200">Kích thước D x R x C (cm)</th>
                        <th className="p-3 border-b border-gray-200">Giá bán (VNĐ) *</th>
                        <th className="p-3 border-b border-gray-200">Thời gian thi công (Ngày) *</th>
                        <th className="p-3 border-b border-gray-200">Kho (SL) *</th>
                        <th className="p-3 border-b border-gray-200 text-center">Xóa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {variants.map((v, index) => (
                        <tr key={v.id} className="hover:bg-emerald-50/30 transition-colors">
                          <td className="p-3">
                            <input
                              required
                              placeholder="VD: Khổ tiêu chuẩn"
                              className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none"
                              value={v.sizeName}
                              onChange={(e) => handleVariantChange(index, 'sizeName', e.target.value)}
                            />
                          </td>
                          <td className="p-3">
                            <input
                              required
                              placeholder="VD: Gỗ, Da"
                              className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none"
                              value={v.materialName || ''}
                              onChange={(e) => handleVariantChange(index, 'materialName', e.target.value)}
                            />
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5">
                              <input
                                placeholder="Dài"
                                className="w-16 p-2 border border-gray-200 rounded-lg text-sm text-center focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none"
                                value={v.length}
                                onChange={(e) => handleVariantChange(index, 'length', e.target.value)}
                              />
                              <span className="text-gray-400 text-xs">×</span>
                              <input
                                placeholder="Rộng"
                                className="w-16 p-2 border border-gray-200 rounded-lg text-sm text-center focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none"
                                value={v.width}
                                onChange={(e) => handleVariantChange(index, 'width', e.target.value)}
                              />
                              <span className="text-gray-400 text-xs">×</span>
                              <input
                                placeholder="Cao"
                                className="w-16 p-2 border border-gray-200 rounded-lg text-sm text-center focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none"
                                value={v.height}
                                onChange={(e) => handleVariantChange(index, 'height', e.target.value)}
                              />
                            </div>
                          </td>
                          <td className="p-3">
                            <input
                              type="number"
                              required
                              placeholder="1000000"
                              className="w-full p-2 border border-gray-200 rounded-lg text-sm font-semibold text-emerald-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none"
                              value={v.price}
                              onChange={(e) => handleVariantChange(index, 'price', e.target.value)}
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="number"
                              required
                              placeholder="5"
                              className="w-full p-2 border border-gray-200 rounded-lg text-sm text-center focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none"
                              value={v.productionDays}
                              onChange={(e) => handleVariantChange(index, 'productionDays', e.target.value)}
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="number"
                              required
                              placeholder="100"
                              className="w-full p-2 border border-gray-200 rounded-lg text-sm text-center focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none"
                              value={v.stock}
                              onChange={(e) => handleVariantChange(index, 'stock', e.target.value)}
                            />
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => removeVariant(index)}
                              className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors cursor-pointer"
                              title="Xóa kích thước này"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Part 3: Images */}
              <div>
                <div className="flex items-center gap-2.5 mb-4 pb-2.5 border-b border-gray-100">
                  <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center">3</span>
                  <h3 className="text-base font-bold text-gray-900">Hình ảnh sản phẩm</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {/* Thumbnail */}
                  <div className="col-span-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                      Ảnh Đại Diện <span className="text-red-500">*</span>
                    </label>
                    {thumbnailImage ? (
                      <div className="relative border-2 border-emerald-500 rounded-2xl overflow-hidden h-44 shadow-md group">
                        <img src={thumbnailImage.preview} alt="Thumbnail preview" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        <button
                          type="button"
                          onClick={() => setThumbnailImage(null)}
                          className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs shadow-md transition-all cursor-pointer"
                        >
                          ✕
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent text-white text-xs py-2 text-center font-bold tracking-wider">
                          ẢNH ĐẠI DIỆN
                        </div>
                      </div>
                    ) : (
                      <label className="border-2 border-dashed border-gray-300 hover:border-emerald-500 hover:bg-emerald-50/20 rounded-2xl h-44 flex flex-col items-center justify-center cursor-pointer transition-all group">
                        <div className="w-12 h-12 rounded-full bg-emerald-50 group-hover:bg-emerald-100 flex items-center justify-center text-emerald-600 mb-2 transition-colors">
                          <UploadCloud className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-bold text-gray-700 group-hover:text-emerald-700">Tải ảnh đại diện</span>
                        <span className="text-[11px] text-gray-400 mt-0.5">PNG, JPG tối đa 5MB</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleThumbnailChange} />
                      </label>
                    )}
                  </div>

                  {/* Additional Images */}
                  <div className="col-span-1 md:col-span-3">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                      Ảnh Chi Tiết Phụ (Tối đa 9 ảnh)
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {additionalImages.map((img, index) => (
                        <div key={index} className="relative border border-gray-200 rounded-xl overflow-hidden h-32 group shadow-xs">
                          <img src={img.preview} alt="Additional preview" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          <button
                            type="button"
                            onClick={() => removeAdditionalImage(index)}
                            className="absolute top-1.5 right-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-md transition-all cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      
                      {additionalImages.length < 9 && (
                        <label className="border-2 border-dashed border-gray-300 hover:border-emerald-500 hover:bg-emerald-50/20 rounded-xl h-32 flex flex-col items-center justify-center cursor-pointer transition-all group">
                          <div className="w-9 h-9 rounded-full bg-gray-100 group-hover:bg-emerald-100 flex items-center justify-center text-gray-400 group-hover:text-emerald-600 mb-1.5 transition-colors">
                            <Plus className="w-5 h-5" />
                          </div>
                          <span className="text-xs font-semibold text-gray-600 group-hover:text-emerald-700">Thêm ảnh phụ</span>
                          <span className="text-[10px] text-gray-400 mt-0.5">{additionalImages.length}/9 ảnh</span>
                          <input type="file" multiple accept="image/*" className="hidden" onChange={handleAdditionalImagesChange} />
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="pt-6 flex justify-end items-center gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-8 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-600/30 hover:shadow-xl transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {submitting ? 'Đang lưu sản phẩm...' : 'Đăng Bán Sản Phẩm'}
                </button>
              </div>
            </form>
          </div>
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
              products.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((product: any) => (
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
                      onClick={() => handleToggleStatus(product)}
                      className={`${product.status === 'ACTIVE' ? 'text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200' : 'text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'} px-3 py-1 rounded-lg text-xs font-semibold transition-all shadow-xs`}
                    >
                      {product.status === 'ACTIVE' ? 'Tạm Dừng' : 'Kích Hoạt'}
                    </button>
                    <button 
                      onClick={() => {
                        setEditingProduct(product);
                        setEditingFormData({
                          name: product.name,
                          categoryId: product.categoryId,
                          description: product.description || '',
                          customSizeSupported: product.customSizeSupported || false
                        });
                        setEditingVariants(product.productVariants || []);
                        try { const mats = JSON.parse(product.material || '[""]'); setEditingMaterials(Array.isArray(mats) && mats.length > 0 ? mats : ['']); } catch { setEditingMaterials(product.material ? [product.material] : ['']); }
                        const allImages = product.productImages || [];
                        const existingThumb = allImages.find((i:any) => i.isThumbnail);
                        const existingOthers = allImages.filter((i:any) => !i.isThumbnail);
                        setEditingExistingThumbnailUrl(existingThumb ? existingThumb.imageUrl : null);
                        setEditingExistingImages(existingOthers);
                        setEditingNewThumbnailImage(null);
                        setEditingNewAdditionalImages([]);

                        // Fetch categories if not already loaded
                        if (categories.length === 0) {
                          api.get('/categories').then(res => setCategories(res.data));
                        }
                      }}
                      className="text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1 rounded-lg text-xs font-semibold transition-all shadow-xs"
                    >
                      Sửa
                    </button>
                    <button 
                      onClick={() => handleDelete(product)}
                      className="text-red-700 hover:text-red-900 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1 rounded-lg text-xs font-semibold transition-all shadow-xs"
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

      {products.length > 0 && (
        <div className="flex justify-center items-center gap-4 mt-8">
          <button 
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1 || Math.ceil(products.length / ITEMS_PER_PAGE) <= 1}
            className="px-5 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-emerald-600 disabled:opacity-50 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed font-semibold shadow-sm transition-all"
          >
            Trước
          </button>
          <div className="flex items-center justify-center min-w-[80px] px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 text-gray-700 font-medium">
            {currentPage} / {Math.max(1, Math.ceil(products.length / ITEMS_PER_PAGE))}
          </div>
          <button 
            onClick={() => setCurrentPage(p => Math.min(Math.ceil(products.length / ITEMS_PER_PAGE), p + 1))}
            disabled={currentPage === Math.ceil(products.length / ITEMS_PER_PAGE) || Math.ceil(products.length / ITEMS_PER_PAGE) <= 1}
            className="px-5 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-emerald-600 disabled:opacity-50 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed font-semibold shadow-sm transition-all"
          >
            Sau
          </button>
        </div>
      )}
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

            {/* Edit Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="relative w-full max-w-5xl my-auto animate-in fade-in zoom-in-95 duration-300">
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-emerald-500 rounded-full mix-blend-multiply filter blur-2xl opacity-20"></div>
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-teal-500 rounded-full mix-blend-multiply filter blur-2xl opacity-20"></div>

            <div className="relative bg-white/95 backdrop-blur-md shadow-2xl rounded-3xl border border-white/60 overflow-hidden">
              {/* Modal Header */}
              <div className="px-6 py-4 flex justify-between items-center border-b border-gray-100 bg-white/50">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600">
                    <Edit className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 tracking-wide">Sửa Thông Tin Sản Phẩm</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 p-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 font-medium"
                >
                  <X className="w-4 h-4" />
                  <span>Đóng form</span>
                </button>
              </div>

              {/* White Card Container for the Input Form */}
              <div className="relative z-10 bg-white rounded-b-3xl p-6 sm:p-8 text-gray-900 max-h-[80vh] overflow-y-auto">
              <form onSubmit={handleEditSubmit} className="space-y-8">
              
              {/* Part 1: Basic Information */}
              <div>
                <div className="flex items-center gap-2.5 mb-5 pb-2.5 border-b border-gray-100">
                  <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center">1</span>
                  <h3 className="text-base font-bold text-gray-900">Thông tin cơ bản</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                      Tên sản phẩm <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="name"
                      required
                      placeholder="Ví dụ: Tủ quần áo gỗ sồi Bắc Âu 4 cánh..."
                      className="w-full px-4 py-2.5 bg-gray-50/60 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white transition-all outline-none"
                      value={editingFormData.name}
                      onChange={(e) => setEditingFormData(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                      Danh mục <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="categoryId"
                      required
                      className="w-full px-4 py-2.5 bg-gray-50/60 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white transition-all outline-none"
                      value={editingFormData.categoryId}
                      onChange={(e) => setEditingFormData(prev => ({ ...prev, categoryId: Number(e.target.value) }))}
                    >
                      {categories.map(c => (
                        <option key={c.categoryId} value={c.categoryId}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                    Mô tả sản phẩm
                  </label>
                  <textarea
                    name="description"
                    rows={4}
                    placeholder="Mô tả chi tiết về kiểu dáng, chất liệu gỗ, phong cách, đặc điểm nổi bật của sản phẩm..."
                    className="w-full px-4 py-2.5 bg-gray-50/60 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white transition-all outline-none leading-relaxed"
                    value={editingFormData.description}
                    onChange={(e) => setEditingFormData(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>

                <div className="mt-5 hidden">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                      Chất liệu sản phẩm
                    </label>
                    <button
                      type="button"
                      onClick={() => setEditingMaterials(prev => [...prev, ''])}
                      className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg transition-all"
                    >
                      + Thêm chất liệu
                    </button>
                  </div>
                  <div className="space-y-2">
                    {editingMaterials.map((mat, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center shrink-0">{idx + 1}</span>
                        <input
                          type="text"
                          placeholder="Ví dụ: Gỗ sồi, Gỗ óc chó, Vải nhung..."
                          value={mat}
                          onChange={(e) => { const m = [...editingMaterials]; m[idx] = e.target.value; setEditingMaterials(m); }}
                          className="flex-1 px-3 py-2 bg-gray-50/60 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white transition-all outline-none"
                        />
                        {editingMaterials.length > 1 && (
                          <button type="button" onClick={() => setEditingMaterials(editingMaterials.filter((_, i) => i !== idx))} className="text-rose-400 hover:text-rose-600 text-xl font-bold w-7 h-7 flex items-center justify-center shrink-0 rounded-full hover:bg-rose-50">×</button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Part 2: Variants */}
              <div>
                <div className="flex items-center justify-between mb-4 pb-2.5 border-b border-gray-100">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center">2</span>
                    <h3 className="text-base font-bold text-gray-900">Cấu hình kích thước & Giá bán</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingVariants([...editingVariants, { id: Date.now(), sizeName: "", width: "", height: "", length: "", price: "", productionDays: "", stock: "" }])}
                    className="text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm kích thước</span>
                  </button>
                </div>

                <div className="overflow-x-auto rounded-xl border border-gray-200 bg-gray-50/40">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-100/70 text-gray-600 text-xs font-semibold uppercase tracking-wider">
                        <th className="p-3 border-b border-gray-200">Tên phân loại (VD: 1m6 x 2m) *</th>
                        <th className="p-3 border-b border-gray-200">Chất liệu *</th>
                        <th className="p-3 border-b border-gray-200">Kích thước D x R x C (cm)</th>
                        <th className="p-3 border-b border-gray-200">Giá bán (VNĐ) *</th>
                        <th className="p-3 border-b border-gray-200">Thời gian thi công (Ngày) *</th>
                        <th className="p-3 border-b border-gray-200">Kho (SL) *</th>
                        <th className="p-3 border-b border-gray-200 text-center">Xóa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {editingVariants.map((v, index) => (
                        <tr key={v.id} className="hover:bg-emerald-50/30 transition-colors">
                          <td className="p-3">
                            <input
                              required
                              placeholder="VD: Khổ tiêu chuẩn"
                              className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none"
                              value={v.sizeName}
                              onChange={(e) => handleEditVariantChange(index, 'sizeName', e.target.value)}
                            />
                          </td>
                          <td className="p-3">
                            <input
                              required
                              placeholder="VD: Gỗ, Da"
                              className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none"
                              value={v.materialName || ''}
                              onChange={(e) => handleEditVariantChange(index, 'materialName', e.target.value)}
                            />
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5">
                              <input
                                placeholder="Dài"
                                className="w-16 p-2 border border-gray-200 rounded-lg text-sm text-center focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none"
                                value={v.length}
                                onChange={(e) => handleEditVariantChange(index, 'length', e.target.value)}
                              />
                              <span className="text-gray-400 text-xs">×</span>
                              <input
                                placeholder="Rộng"
                                className="w-16 p-2 border border-gray-200 rounded-lg text-sm text-center focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none"
                                value={v.width}
                                onChange={(e) => handleEditVariantChange(index, 'width', e.target.value)}
                              />
                              <span className="text-gray-400 text-xs">×</span>
                              <input
                                placeholder="Cao"
                                className="w-16 p-2 border border-gray-200 rounded-lg text-sm text-center focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none"
                                value={v.height}
                                onChange={(e) => handleEditVariantChange(index, 'height', e.target.value)}
                              />
                            </div>
                          </td>
                          <td className="p-3">
                            <input
                              type="number"
                              required
                              placeholder="1000000"
                              className="w-full p-2 border border-gray-200 rounded-lg text-sm font-semibold text-emerald-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none"
                              value={v.price}
                              onChange={(e) => handleEditVariantChange(index, 'price', e.target.value)}
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="number"
                              required
                              placeholder="5"
                              className="w-full p-2 border border-gray-200 rounded-lg text-sm text-center focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none"
                              value={v.productionDays}
                              onChange={(e) => handleEditVariantChange(index, 'productionDays', e.target.value)}
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="number"
                              required
                              placeholder="100"
                              className="w-full p-2 border border-gray-200 rounded-lg text-sm text-center focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none"
                              value={v.stock}
                              onChange={(e) => handleEditVariantChange(index, 'stock', e.target.value)}
                            />
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => removeEditVariant(index)}
                              className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors cursor-pointer"
                              title="Xóa kích thước này"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Part 3: Images */}
              <div>
                <div className="flex items-center gap-2.5 mb-4 pb-2.5 border-b border-gray-100">
                  <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center">3</span>
                  <h3 className="text-base font-bold text-gray-900">Hình ảnh sản phẩm</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {/* Thumbnail */}
                  <div className="col-span-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                      Ảnh Đại Diện <span className="text-red-500">*</span>
                    </label>
                    
                    {editingNewThumbnailImage ? (
                      <div className="relative border-2 border-emerald-500 rounded-2xl overflow-hidden h-44 shadow-md group">
                        <img src={editingNewThumbnailImage.preview} alt="New Thumbnail preview" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        <button
                          type="button"
                          onClick={() => setEditingNewThumbnailImage(null)}
                          className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs shadow-md transition-all cursor-pointer"
                        >
                          ✕
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 bg-emerald-500 text-white text-xs py-2 text-center font-bold tracking-wider">
                          ẢNH MỚI
                        </div>
                      </div>
                    ) : editingExistingThumbnailUrl ? (
                      <div className="relative border-2 border-emerald-500 rounded-2xl overflow-hidden h-44 shadow-md group">
                        <img src={editingExistingThumbnailUrl?.startsWith('http') ? editingExistingThumbnailUrl : `${API_BASE_URL}${editingExistingThumbnailUrl}`} alt="Existing Thumbnail" className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-300" />
                        <button
                          type="button"
                          onClick={() => setEditingExistingThumbnailUrl(null)}
                          className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs shadow-md transition-all cursor-pointer"
                        >
                          ✕
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 bg-gray-800 text-white text-xs py-2 text-center font-bold tracking-wider">
                          ẢNH HIỆN TẠI
                        </div>
                      </div>
                    ) : (
                      <label className="border-2 border-dashed border-gray-300 hover:border-emerald-500 hover:bg-emerald-50/20 rounded-2xl h-44 flex flex-col items-center justify-center cursor-pointer transition-all group">
                        <div className="w-12 h-12 rounded-full bg-emerald-50 group-hover:bg-emerald-100 flex items-center justify-center text-emerald-600 mb-2 transition-colors">
                          <UploadCloud className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-bold text-gray-700 group-hover:text-emerald-700">Tải ảnh đại diện</span>
                        <span className="text-[11px] text-gray-400 mt-0.5">PNG, JPG tối đa 5MB</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleEditThumbnailChange} />
                      </label>
                    )}
                  </div>

                  {/* Additional Images */}
                  <div className="col-span-1 md:col-span-3">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                      Ảnh Chi Tiết Phụ (Tối đa 9 ảnh)
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      
                      {editingExistingImages.map((img, index) => (
                        <div key={`existing-${index}`} className="relative border border-gray-200 rounded-xl overflow-hidden h-32 group shadow-xs">
                          <img src={img.imageUrl?.startsWith('http') ? img.imageUrl : `${API_BASE_URL}${img.imageUrl}`} alt="Existing Additional" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-80" />
                          <button
                            type="button"
                            onClick={() => setEditingExistingImages(editingExistingImages.filter((_, i) => i !== index))}
                            className="absolute top-1.5 right-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-md transition-all cursor-pointer"
                          >
                            ✕
                          </button>
                          <div className="absolute bottom-0 left-0 right-0 bg-gray-800 bg-opacity-75 text-white text-[10px] py-1 text-center font-semibold">Ảnh cũ</div>
                        </div>
                      ))}
{editingNewAdditionalImages.map((img, index) => (
                        <div key={`new-${index}`} className="relative border border-gray-200 rounded-xl overflow-hidden h-32 group shadow-xs">
                          <img src={img.preview} alt="Additional preview" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          <button
                            type="button"
                            onClick={() => removeEditAdditionalImage(index)}
                            className="absolute top-1.5 right-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-md transition-all cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      
                      {(editingExistingImages.length + editingNewAdditionalImages.length < 9) && (
                        <label className="border-2 border-dashed border-gray-300 hover:border-emerald-500 hover:bg-emerald-50/20 rounded-xl h-32 flex flex-col items-center justify-center cursor-pointer transition-all group">
                          <div className="w-9 h-9 rounded-full bg-gray-100 group-hover:bg-emerald-100 flex items-center justify-center text-gray-400 group-hover:text-emerald-600 mb-1.5 transition-colors">
                            <Plus className="w-5 h-5" />
                          </div>
                          <span className="text-xs font-semibold text-gray-600 group-hover:text-emerald-700">Thêm ảnh phụ</span>
                          <span className="text-[10px] text-gray-400 mt-0.5">{editingExistingImages.length + editingNewAdditionalImages.length}/9 ảnh</span>
                          <input type="file" multiple accept="image/*" className="hidden" onChange={handleEditAdditionalImagesChange} />
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              </div>              {/* Form Action Buttons */}
              <div className="pt-6 flex justify-end items-center gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-8 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-600/30 hover:shadow-xl transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {submitting ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
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
                              src={img.imageUrl?.startsWith('http') ? img.imageUrl : `${API_BASE_URL}${img.imageUrl}`} 
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

      {/* Custom Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100 transform transition-all">
            <div className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${
                  confirmModal.type === 'delete' ? 'bg-red-50 text-red-600 border border-red-100' :
                  confirmModal.type === 'pause' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                  'bg-emerald-50 text-emerald-600 border border-emerald-100'
                }`}>
                  {confirmModal.type === 'delete' && <Trash2 className="w-6 h-6" />}
                  {confirmModal.type === 'pause' && <PauseCircle className="w-6 h-6" />}
                  {confirmModal.type === 'activate' && <PlayCircle className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 leading-snug">{confirmModal.title}</h3>
                  <span className="text-xs text-gray-400 font-medium">Hành động quản lý sản phẩm</span>
                </div>
              </div>

              {confirmModal.productName && (
                <div className="mb-4 bg-gray-50 border border-gray-100 rounded-xl p-3.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Sản phẩm</span>
                  <p className="text-sm font-semibold text-gray-800 line-clamp-2">{confirmModal.productName}</p>
                </div>
              )}

              <p className="text-sm text-gray-600 leading-relaxed mb-6">
                {confirmModal.message}
              </p>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2.5 text-sm font-semibold text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
                >
                  {confirmModal.cancelText || 'Hủy bỏ'}
                </button>
                <button
                  type="button"
                  onClick={() => confirmModal.onConfirm()}
                  className={`px-5 py-2.5 text-sm font-semibold text-white rounded-xl transition-all shadow-md cursor-pointer ${
                    confirmModal.type === 'delete'
                      ? 'bg-red-600 hover:bg-red-700 shadow-red-200'
                      : confirmModal.type === 'pause'
                      ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-200'
                      : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                  }`}
                >
                  {confirmModal.confirmText}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Alert/Notification Modal */}
      {alertInfo.isOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center border border-gray-100">
            <div className={`w-14 h-14 mx-auto rounded-full flex items-center justify-center mb-4 ${
              alertInfo.type === 'success' ? 'bg-emerald-100 text-emerald-600' :
              alertInfo.type === 'error' ? 'bg-red-100 text-red-600' :
              'bg-blue-100 text-blue-600'
            }`}>
              {alertInfo.type === 'success' && <CheckCircle className="w-8 h-8" />}
              {alertInfo.type === 'error' && <AlertTriangle className="w-8 h-8" />}
              {alertInfo.type === 'info' && <Info className="w-8 h-8" />}
            </div>
            <h4 className="text-lg font-bold text-gray-900 mb-2">
              {alertInfo.type === 'success' ? 'Thành Công' : alertInfo.type === 'error' ? 'Có Lỗi Xảy Ra' : 'Thông Báo'}
            </h4>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              {alertInfo.message}
            </p>
            <button
              onClick={() => setAlertInfo({ isOpen: false, message: '', type: 'info' })}
              className={`w-full py-2.5 px-4 rounded-xl text-white font-semibold text-sm transition-all shadow-md cursor-pointer ${
                alertInfo.type === 'success' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' :
                alertInfo.type === 'error' ? 'bg-red-600 hover:bg-red-700 shadow-red-200' :
                'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
              }`}
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageProducts;



