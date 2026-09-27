const fs = require('fs');

const content = fs.readFileSync('src/pages/ManageProducts.tsx', 'utf-8');

const createMatch = content.match(/\{\/\* White Card Container for the Input Form \*\/\}([\s\S]*?)(?=\s*\{\/\* Form Action Buttons \*\/\})/);
if (!createMatch) {
    console.log("Could not find Create Form");
    process.exit(1);
}

let createBody = createMatch[1];

let editBody = createBody.replaceAll('formData.', 'editingFormData.');
editBody = editBody.replaceAll('setFormData(', 'setEditingFormData(');
editBody = editBody.replaceAll('variants.', 'editingVariants.');
editBody = editBody.replaceAll('variants.map', 'editingVariants.map');
editBody = editBody.replaceAll('variants.length', 'editingVariants.length');
editBody = editBody.replaceAll('addVariant', '() => setEditingVariants([...editingVariants, { id: Date.now(), sizeName: "", width: "", height: "", length: "", price: "", productionDays: "", stock: "" }])');
editBody = editBody.replaceAll('handleVariantChange', 'handleEditVariantChange');
editBody = editBody.replaceAll('removeVariant', 'removeEditVariant');
editBody = editBody.replaceAll('thumbnailImage', 'editingNewThumbnailImage');
editBody = editBody.replaceAll('setThumbnailImage', 'setEditingNewThumbnailImage');
editBody = editBody.replaceAll('handleThumbnailChange', 'handleEditThumbnailChange');
editBody = editBody.replaceAll('additionalImages', 'editingNewAdditionalImages');
editBody = editBody.replaceAll('removeAdditionalImage', 'removeEditAdditionalImage');
editBody = editBody.replaceAll('handleAdditionalImagesChange', 'handleEditAdditionalImagesChange');

const imgLoopPattern = /\{editingNewAdditionalImages\.map\(\(img, index\) => \(\s*<div key=\{index\}([\s\S]*?)<\/div>\s*\)\)\}/;
const imgLoopMatch = editBody.match(imgLoopPattern);
if (imgLoopMatch) {
    const existingImgsCode = `
                      {editingExistingImages.map((img, index) => (
                        <div key={\`existing-\${index}\`} className="relative border border-gray-200 rounded-xl overflow-hidden h-32 group shadow-xs">
                          <img src={\`http://localhost:5234\${img.imageUrl}\`} alt="Existing Additional" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-80" />
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
`;
    let newImgsCode = imgLoopMatch[0].replace('key={index}', 'key={`new-${index}`}');
    newImgsCode = newImgsCode.replace('</div>\n                      ))} ', '<div className="absolute bottom-0 left-0 right-0 bg-emerald-500 text-white text-[10px] py-1 text-center font-semibold">Ảnh mới</div>\n                        </div>\n                      ))} ');
    
    editBody = editBody.replace(imgLoopMatch[0], existingImgsCode + newImgsCode);
}

const thumbRenderPattern = /\{editingNewThumbnailImage \? \(([\s\S]*?)\) : \(\s*<label/;
const thumbRenderMatch = editBody.match(thumbRenderPattern);
if (thumbRenderMatch) {
    const newThumbRender = `
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
                        <img src={\`http://localhost:5234\${editingExistingThumbnailUrl}\`} alt="Existing Thumbnail" className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-300" />
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
                      <label`;
    editBody = editBody.replace(thumbRenderMatch[0], newThumbRender);
}

editBody = editBody.replace(/\{editingNewAdditionalImages\.length < 9 && \(/g, '{(editingExistingImages.length + editingNewAdditionalImages.length < 9) && (');
editBody = editBody.replace(/\{editingNewAdditionalImages\.length\}\/9 ảnh/g, '{editingExistingImages.length + editingNewAdditionalImages.length}/9 ảnh');
editBody = editBody.replace(/id="custom-size"/g, 'id="edit-custom-size"');
editBody = editBody.replace(/htmlFor="custom-size"/g, 'htmlFor="edit-custom-size"');


const editModalFull = `      {/* Edit Product Modal */}
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
                  className="text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 p-2 rounded-xl transition-all cursor-pointer flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  <span>Đóng form</span>
                </button>
              </div>

              {/* White Card Container for the Input Form */}
              <div className="relative z-10 bg-white rounded-b-3xl p-6 sm:p-8 text-gray-900 max-h-[80vh] overflow-y-auto">
                <form onSubmit={handleEditSubmit} className="space-y-8">
${editBody}              {/* Form Action Buttons */}
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
  )}`;

const origEditPattern = /\{\/\* Edit Product Modal \*\/\}\s*\{editingProduct && \(\s*<div className="fixed inset-0 bg-black bg-opacity-50 z-50([\s\S]*?)<\/form>\s*<\/div>\s*<\/div>\s*<\/div>\s*\)\}/;
const origEditMatch = content.match(origEditPattern);

if (origEditMatch) {
    const newContent = content.replace(origEditMatch[0], editModalFull);
    fs.writeFileSync('src/pages/ManageProducts.tsx', newContent, 'utf-8');
    console.log("Successfully updated Edit Form UI");
} else {
    console.log("Could not find Original Edit Form");
}
