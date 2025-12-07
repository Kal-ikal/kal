/**
 * Generate Placeholder Icons using Node.js
 * Alternative untuk yang tidak punya ImageMagick
 *
 * Install: npm install canvas
 * Run: node scripts/generate-icons-node.js
 */

const fs = require('fs');
const path = require('path');

// Check if canvas is installed
let Canvas;
try {
  Canvas = require('canvas');
} catch (err) {
  console.error('❌ Canvas module not installed!');
  console.error('Install: npm install canvas');
  console.error('');
  console.error('Or use online tools instead:');
  console.error('- https://icon.kitchen/');
  console.error('- https://www.appicon.co/');
  process.exit(1);
}

const { createCanvas } = Canvas;

// Ensure assets/images directory exists
const assetsDir = path.join(__dirname, '..', 'assets', 'images');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Helper function to create icon
function createIcon(width, height, bgColor, text, textColor, fileName) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background
  if (bgColor !== 'transparent') {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);
  }

  // Text
  if (text) {
    const fontSize = Math.floor(width * 0.4);
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, width / 2, height / 2);
  }

  // Save
  const buffer = canvas.toBuffer('image/png');
  const filePath = path.join(assetsDir, fileName);
  fs.writeFileSync(filePath, buffer);
  console.log(`✅ Created: ${fileName}`);
}

console.log('🎨 Generating placeholder icons...\n');

// 1. App Icon (1024x1024)
createIcon(1024, 1024, '#4A90E2', 'AB', 'white', 'icon2.png');

// 2. Splash Screen (1284x2778) - just logo in center
createIcon(1284, 2778, 'transparent', 'AB', 'white', 'splash-icon.png');

// 3. Notification Icon (96x96)
createIcon(96, 96, 'transparent', 'AB', 'white', 'notification-icon.png');

// 4. Android Adaptive Foreground (1024x1024)
createIcon(1024, 1024, 'transparent', 'AB', 'white', 'android-icon-foreground.png');

// 5. Android Adaptive Background (1024x1024)
createIcon(1024, 1024, '#E6F4FE', '', '', 'android-icon-background.png');

// 6. Android Monochrome (1024x1024)
createIcon(1024, 1024, 'transparent', 'AB', 'white', 'android-icon-monochrome.png');

console.log('\n✅ All placeholder icons generated!');
console.log('\n📁 Files created in: ./assets/images/');
console.log('   - icon2.png');
console.log('   - splash-icon.png');
console.log('   - notification-icon.png');
console.log('   - android-icon-foreground.png');
console.log('   - android-icon-background.png');
console.log('   - android-icon-monochrome.png');
console.log('\n⚠️  These are PLACEHOLDER icons with "AB" text.');
console.log('    Replace with final design from designer!\n');
