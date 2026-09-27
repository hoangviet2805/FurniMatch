const fs = require('fs');
let content = fs.readFileSync('src/pages/ManageProducts.tsx', 'utf-8');

// Add Edit to lucide-react imports
content = content.replace(
    /import \{ PauseCircle, PlayCircle, Trash2, AlertTriangle, CheckCircle, Info, PackagePlus, Plus, X, UploadCloud \} from 'lucide-react';/,
    "import { PauseCircle, PlayCircle, Trash2, AlertTriangle, CheckCircle, Info, PackagePlus, Plus, X, UploadCloud, Edit } from 'lucide-react';"
);

// Add missing functions
const functionsToAdd = `
  const handleEditVariantChange = (index: number, field: string, value: string) => {
    const newVariants = [...editingVariants];
    (newVariants[index] as any)[field] = value;
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
`;

content = content.replace(
    /const removeAdditionalImage = \(index: number\) => \{\s*setAdditionalImages\(additionalImages\.filter\(\(_, i\) => i !== index\)\);\s*\};/,
    "const removeAdditionalImage = (index: number) => {\n    setAdditionalImages(additionalImages.filter((_, i) => i !== index));\n  };\n" + functionsToAdd
);

fs.writeFileSync('src/pages/ManageProducts.tsx', content, 'utf-8');
console.log("Functions added");
