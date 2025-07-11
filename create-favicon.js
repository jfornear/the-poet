const sharp = require('sharp');
const fs = require('fs');

async function createFavicon() {
  // Read the PNG file
  await sharp('src/assets/icons/icon-72x72.png')
    // Resize to 32x32 (standard favicon size)
    .resize(32, 32)
    // Ensure transparency is preserved
    .png()
    .toFile('src/favicon.png');

  // Now we need to convert the PNG to ICO
  // We'll use the PNG file as is, since modern browsers support PNG favicons
  // Just rename it to .ico
  fs.copyFileSync('src/favicon.png', 'src/favicon.ico');
  fs.unlinkSync('src/favicon.png'); // Clean up the temporary PNG
}

createFavicon().catch(console.error); 