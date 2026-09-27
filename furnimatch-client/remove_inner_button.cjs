const fs = require('fs');

let content = fs.readFileSync('src/pages/ManageProducts.tsx', 'utf-8');

const targetPattern = /<button\s+type="button"\s+onClick=\{\(\) => setShowForm\(false\)\}\s+className="self-start sm:self-auto px-4 py-2 rounded-xl bg-white\/10 hover:bg-white\/20 text-white border border-white\/20 text-xs sm:text-sm font-semibold backdrop-blur-sm transition-all flex items-center gap-1\.5 cursor-pointer"\s*>\s*<X className="w-4 h-4" \/>\s*<span>Đóng form<\/span>\s*<\/button>/;

content = content.replace(targetPattern, '');

fs.writeFileSync('src/pages/ManageProducts.tsx', content, 'utf-8');
console.log('Removed inner button');
