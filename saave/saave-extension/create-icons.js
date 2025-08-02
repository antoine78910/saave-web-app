// Script Node.js pour créer les icônes Saave
const fs = require('fs');
const path = require('path');

// Créer le dossier icons s'il n'existe pas
const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir);
}

// Fonction pour créer une icône SVG
function createSaaveIconSVG(size) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1d4ed8;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.2}" ry="${size * 0.2}" fill="url(#gradient)" />
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${size * 0.6}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">S</text>
</svg>`;
}

// Générer les icônes
const sizes = [16, 48, 128];

sizes.forEach(size => {
  const svg = createSaaveIconSVG(size);
  const filename = path.join(iconsDir, `icon${size}.svg`);
  
  fs.writeFileSync(filename, svg, 'utf8');
  console.log(`✅ Icône créée: icon${size}.svg`);
});

console.log('🎉 Toutes les icônes Saave ont été créées!');
console.log('📝 Note: Ces icônes SVG peuvent être converties en PNG si nécessaire.');
console.log('🔧 Pour utiliser: node create-icons.js');