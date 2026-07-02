const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'frontend/src/components/Footer.js',
  'frontend/src/app/my-tickets/page.js',
  'frontend/src/app/my-orders/page.js',
  'frontend/src/app/agency/page.js',
  'frontend/src/app/admin/page.js'
];

filesToUpdate.forEach(fileRel => {
  const filePath = path.join(__dirname, fileRel);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf-8');
    
    // Only proceed if file has 'alert('
    if (content.includes('alert(')) {
      // Replace all 'alert(' with 'showPopup('
      content = content.replace(/\balert\(/g, 'showPopup(');
      
      // Ensure the import exists
      if (!content.includes('import { showPopup } from')) {
        // Add import at the top (after use client if it exists, or just at very top)
        if (content.startsWith("'use client';") || content.startsWith('"use client";')) {
          content = content.replace(/^(["']use client["'];?)/, "$1\nimport { showPopup } from '@/components/GlobalPopup';");
        } else {
          content = "import { showPopup } from '@/components/GlobalPopup';\n" + content;
        }
      }
      
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log(`Updated ${fileRel}`);
    } else {
      console.log(`No alerts in ${fileRel}`);
    }
  } else {
    console.log(`File not found: ${fileRel}`);
  }
});
