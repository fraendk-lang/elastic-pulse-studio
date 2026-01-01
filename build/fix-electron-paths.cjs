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

// Also fix absolute paths in JavaScript bundles for GitHub Pages
const distDir = path.join(__dirname, '../dist');
const assetsDir = path.join(distDir, 'assets');

if (fs.existsSync(assetsDir)) {
  const files = fs.readdirSync(assetsDir).filter(f => f.endsWith('.js'));
  files.forEach(f => {
    const filePath = path.join(assetsDir, f);
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Replace absolute paths to app-screenshot.png with relative paths
    if (content.includes('"/app-screenshot.png"')) {
      content = content.replace(/"\/app-screenshot\.png"/g, '"./app-screenshot.png"');
      modified = true;
    }
    if (content.includes("'/app-screenshot.png'")) {
      content = content.replace(/'\/app-screenshot\.png'/g, "'./app-screenshot.png'");
      modified = true;
    }
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed app-screenshot path in ${f}`);
    }
  });
}

