const fs = require('fs');

const content = fs.readFileSync('src/pages/ManageProducts.tsx', 'utf-8');

// Find the duplicated form tag
const editFormStartPattern = /<div className="relative z-10 bg-white rounded-b-3xl p-6 sm:p-8 text-gray-900 max-h-\[80vh\] overflow-y-auto">\s*<form onSubmit=\{handleEditSubmit\} className="space-y-8">\s*<div className="relative z-10 bg-white rounded-2xl shadow-xl p-6 sm:p-8 text-gray-900 border border-white\/80">\s*<form onSubmit=\{handleSubmit\} className="space-y-8">/;

if (content.match(editFormStartPattern)) {
    const fixedStart = `<div className="relative z-10 bg-white rounded-b-3xl p-6 sm:p-8 text-gray-900 max-h-[80vh] overflow-y-auto">\s*<form onSubmit={handleEditSubmit} className="space-y-8">`;
    let newContent = content.replace(editFormStartPattern, fixedStart);
    
    fs.writeFileSync('src/pages/ManageProducts.tsx', newContent, 'utf-8');
    console.log("Fixed the duplicated form tag");
} else {
    console.log("Could not find the duplicated form tag");
}
