const fs = require('fs');
const path = require('path');

const srcStylesDir = path.join(__dirname, '../src/styles');
const distStylesDir = path.join(__dirname, '../dist/styles');

// Create dist/styles directory
if (!fs.existsSync(distStylesDir)) {
  fs.mkdirSync(distStylesDir, { recursive: true });
}

// Copy all CSS files from src/styles to dist/styles
function copyFiles(src, dest) {
  const files = fs.readdirSync(src);

  for (const file of files) {
    const srcPath = path.join(src, file);
    const destPath = path.join(dest, file);
    const stat = fs.statSync(srcPath);

    if (stat.isDirectory()) {
      if (!fs.existsSync(destPath)) {
        fs.mkdirSync(destPath, { recursive: true });
      }
      copyFiles(srcPath, destPath);
    } else if (file.endsWith('.css')) {
      fs.copyFileSync(srcPath, destPath);
      console.log(`Copied ${file} to ${destPath}`);
    }
  }
}

copyFiles(srcStylesDir, distStylesDir);
console.log('✅ CSS files copied successfully');
