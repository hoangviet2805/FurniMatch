import re

with open('src/pages/ManageProducts.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Extract the body of Create Product Form
create_match = re.search(r'\{/\* White Card Container for the Input Form \*/\}(.*?)(?=\s*\{/\* Form Action Buttons \*/\})', content, re.DOTALL)
if not create_match:
    print("Could not find Create Form")
    exit(1)

create_body = create_match.group(1)

# Modify it to match Edit Form state variables
edit_body = create_body.replace('formData.', 'editingFormData.')
edit_body = edit_body.replace('setFormData(', 'setEditingFormData(')
edit_body = edit_body.replace('variants.', 'editingVariants.')
edit_body = edit_body.replace('variants.map', 'editingVariants.map')
edit_body = edit_body.replace('variants.length', 'editingVariants.length')
edit_body = edit_body.replace('addVariant', '() => setEditingVariants([...editingVariants, { id: Date.now(), sizeName: "", width: "", height: "", length: "", price: "", productionDays: "", stock: "" }])')
edit_body = edit_body.replace('handleVariantChange', 'handleEditVariantChange')
edit_body = edit_body.replace('removeVariant', 'removeEditVariant')
edit_body = edit_body.replace('thumbnailImage', 'editingNewThumbnailImage')
edit_body = edit_body.replace('setThumbnailImage', 'setEditingNewThumbnailImage')
edit_body = edit_body.replace('handleThumbnailChange', 'handleEditThumbnailChange')
edit_body = edit_body.replace('additionalImages', 'editingNewAdditionalImages')
edit_body = edit_body.replace('removeAdditionalImage', 'removeEditAdditionalImage')
edit_body = edit_body.replace('handleAdditionalImagesChange', 'handleEditAdditionalImagesChange')

# Now handle the images section which has both Existing and New images in Edit Form
# We will inject the existing images into the images section of edit_body.
img_loop_pattern = r'\{editingNewAdditionalImages\.map\(\(img, index\) => \(\s*<div key=\{index\}(.*?)</div>\s*\)\)}'
img_loop_match = re.search(img_loop_pattern, edit_body, re.DOTALL)
if img_loop_match:
    # Build the existing images rendering part using the same styling
    existing_imgs_code = """
                      {editingExistingImages.map((img, index) => (
                        <div key={`existing-${index}`} className="relative border border-gray-200 rounded-xl overflow-hidden h-32 group shadow-xs">
                          <img src={`http://localhost:5234${img.imageUrl}`} alt="Existing Additional" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-80" />
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
"""
    new_imgs_code = img_loop_match.group(0).replace('key={index}', 'key={`new-${index}`}')
    new_imgs_code = new_imgs_code.replace('</div>\n                      ))} ', '<div className="absolute bottom-0 left-0 right-0 bg-emerald-500 text-white text-[10px] py-1 text-center font-semibold">Ảnh mới</div>\n                        </div>\n                      ))} ')
    
    edit_body = edit_body.replace(img_loop_match.group(0), existing_imgs_code + new_imgs_code)

# Fix thumbnail image rendering to show existing thumbnail
thumb_render_pattern = r'\{editingNewThumbnailImage \? \((.*?)\) : \(\s*<label'
thumb_render_match = re.search(thumb_render_pattern, edit_body, re.DOTALL)
if thumb_render_match:
    new_thumb_render = """
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
                        <img src={`http://localhost:5234${editingExistingThumbnailUrl}`} alt="Existing Thumbnail" className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-300" />
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
                      <label"""
    edit_body = edit_body.replace(thumb_render_match.group(0), new_thumb_render)

add_btn_pattern = r'\{editingNewAdditionalImages\.length < 9 && \('
edit_body = edit_body.replace(add_btn_pattern, '{(editingExistingImages.length + editingNewAdditionalImages.length < 9) && (')
edit_body = edit_body.replace('{editingNewAdditionalImages.length}/9 ảnh', '{editingExistingImages.length + editingNewAdditionalImages.length}/9 ảnh')

# Construct the full modal
edit_modal_full = """      {/* Edit Product Modal */}
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
""" + edit_body + """              {/* Form Action Buttons */}
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
  )}"""

orig_edit_pattern = r'\{\/\* Edit Product Modal \*\/\}\s*\{editingProduct && \(\s*<div className="fixed inset-0 bg-black bg-opacity-50 z-50(.*?)</form>\s*</div>\s*</div>\s*</div>\s*\)\}'
orig_edit_match = re.search(orig_edit_pattern, content, re.DOTALL)
if orig_edit_match:
    new_content = content.replace(orig_edit_match.group(0), edit_modal_full)
    with open('src/pages/ManageProducts.tsx', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Successfully updated Edit Form UI")
else:
    print("Could not find Original Edit Form")
