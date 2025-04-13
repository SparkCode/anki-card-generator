const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Check if ImageMagick is installed
try {
  execSync('convert -version', { stdio: 'ignore' });
} catch (error) {
  console.error('Error: ImageMagick is not installed. Please install it first.');
  console.error('On macOS: brew install imagemagick');
  console.error('On Ubuntu/Debian: sudo apt-get install imagemagick');
  process.exit(1);
}

const SVG_PATH = path.join(__dirname, 'public', 'anki-card-icon.svg');
const PUBLIC_DIR = path.join(__dirname, 'public');

// Define all the icons we need to generate
const ICONS = [
  { name: 'android-chrome-192x192.png', size: 192 },
  { name: 'android-chrome-512x512.png', size: 512 },
  { name: 'favicon-32x32.png', size: 32 },
  { name: 'favicon-16x16.png', size: 16 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'logo192.png', size: 192 },
  { name: 'logo512.png', size: 512 },
];

// Generate PNG icons from SVG
console.log('Generating PNG icons...');
ICONS.forEach(icon => {
  const outputPath = path.join(PUBLIC_DIR, icon.name);
  try {
    // Using a better scaling approach that maintains the entire icon
    // -density 1200: High resolution for better quality on downscaling
    // -resize WxH: Resize while maintaining aspect ratio
    // -background none: Transparent background
    // -gravity center: Center the icon
    // -extent WxH: Ensure the output has the exact dimensions we want
    execSync(`convert -background none -density 1200 ${SVG_PATH} -resize ${icon.size}x${icon.size} -gravity center -extent ${icon.size}x${icon.size} ${outputPath}`);
    console.log(`✅ Generated ${icon.name}`);
  } catch (error) {
    console.error(`❌ Failed to generate ${icon.name}:`, error.message);
  }
});

// Generate favicon.ico from the 16x16 and 32x32 PNGs
console.log('Generating favicon.ico...');
try {
  const favicon16Path = path.join(PUBLIC_DIR, 'favicon-16x16.png');
  const favicon32Path = path.join(PUBLIC_DIR, 'favicon-32x32.png');
  const faviconPath = path.join(PUBLIC_DIR, 'favicon.ico');
  
  // Create favicon.ico with multiple sizes (16x16 and 32x32)
  execSync(`convert ${favicon16Path} ${favicon32Path} ${faviconPath}`);
  console.log('✅ Generated favicon.ico');
} catch (error) {
  console.error('❌ Failed to generate favicon.ico:', error.message);
}

console.log('Icon generation complete! ✨'); 