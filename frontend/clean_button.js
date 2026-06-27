const fs = require('fs');
let content = fs.readFileSync('src/app/admin/page.js', 'utf8');
content = content.replace(/<button onClick=\{\(\) => payoutAgency[^\n]+/g, '');
fs.writeFileSync('src/app/admin/page.js', content);
