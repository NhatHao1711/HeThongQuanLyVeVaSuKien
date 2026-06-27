const fs = require('fs');
let content = fs.readFileSync('src/app/admin/page.js', 'utf8');

// Fix API endpoints for agencies
content = content.replace("apiRequest('/admin/agencies')", "apiRequest('/admin/organizers/requests')");
content = content.replace("apiRequest(`/admin/agencies/${id}/approve`", "apiRequest(`/admin/organizers/requests/${id}/approve`");
content = content.replace("apiRequest(`/admin/agencies/${id}/reject`", "apiRequest(`/admin/organizers/requests/${id}/reject`");

fs.writeFileSync('src/app/admin/page.js', content);
