const fs = require('fs');

let content = fs.readFileSync('src/pages/ManageProducts.tsx', 'utf-8');

const targetStr = /form\.append\('existingImagesJson', JSON\.stringify\(editingExistingImages\.map\(img => img\.imageUrl\)\)\);/;

const replaceStr = `const existingUrls = editingExistingImages.map(img => img.imageUrl);
      if (!editingNewThumbnailImage && editingExistingThumbnailUrl) {
        existingUrls.push(editingExistingThumbnailUrl);
      }
      form.append('existingImagesJson', JSON.stringify(existingUrls));`;

content = content.replace(targetStr, replaceStr);

fs.writeFileSync('src/pages/ManageProducts.tsx', content, 'utf-8');
console.log('Fixed thumbnail issue successfully');
