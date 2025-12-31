const fs = require('fs');
const path = require('path');

// Fix paths in dist/index.html for Electron
const distHtmlPath = path.join(__dirname, '../dist/index.html');

if (fs.existsSync(distHtmlPath)) {
  let html = fs.readFileSync(distHtmlPath, 'utf8');
  
  // Replace absolute paths with relative paths (but keep external URLs like https://)
  // Match / at start of path but not // (which would be http:// or https://)
  html = html.replace(/(href|src)="\/(?!\/)/g, '$1="./');
  
  fs.writeFileSync(distHtmlPath, html, 'utf8');
  console.log('✅ Fixed paths in dist/index.html for Electron');
} else {
  console.error('❌ dist/index.html not found');
  process.exit(1);
}

