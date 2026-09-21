export const demoProducts = [
  { productId: -1, name: 'Sofa Linen Mây', category: { name: 'Sofa' }, seller: { shopName: 'Mộc An Home' }, price: 12500000, customSizeSupported: true, productImages: [{ imageUrl: '/uploads/products/2229db78-3cdb-4c3c-8e89-8db720b55ed3_image1.jpg' }], productVariants: [{ price: 12500000, length: 220, width: 90, height: 85, productionDays: 12 }] },
  { productId: -2, name: 'Bàn Trà Gỗ Sồi', category: { name: 'Bàn Trà' }, seller: { shopName: 'Xưởng Gỗ Việt' }, price: 3200000, customSizeSupported: true, productImages: [{ imageUrl: '/uploads/products/26241b00-641c-4f39-88e8-3cd71c660a86_images.jpg' }], productVariants: [{ price: 3200000, length: 120, width: 60, height: 45, productionDays: 7 }] },
  { productId: -3, name: 'Giường Ngủ Nordic', category: { name: 'Giường Ngủ' }, seller: { shopName: 'Nội Thất Mây' }, price: 8900000, customSizeSupported: true, productImages: [{ imageUrl: '/uploads/products/9ab7e6c5-98de-49a7-9fcb-f6f95cdbd727_giuong.png' }], productVariants: [{ price: 8900000, length: 200, width: 160, height: 100, productionDays: 14 }] },
  { productId: -4, name: 'Tủ Trang Trí Kính', category: { name: 'Tủ Bếp' }, seller: { shopName: 'Furni Studio' }, price: 5400000, customSizeSupported: false, productImages: [{ imageUrl: '/uploads/products/627040a4-0c2c-4aa8-8150-3fb65555a4a2_image3.jpg' }], productVariants: [{ price: 5400000, length: 100, width: 40, height: 180, productionDays: 10 }] }
];

export const productImageUrl = (url?: string) => url?.startsWith('http') ? url : `http://localhost:5234${url}`;
