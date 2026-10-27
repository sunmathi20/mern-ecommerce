/**
 * AURELIA — Product Image Generator
 * 
 * Creates premium-looking product placeholder images using Node.js Canvas.
 * Each image shows a category icon/silhouette on a dark gradient background
 * with luxury accent colors. These serve as professional placeholders
 * while real product photography is being sourced.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ASSETS_ROOT = path.resolve(__dirname, '../../frontend/public/assets/products');

// Category image definitions
const categories = {
  jackets: {
    items: [
      'obsidian-atelier', 'midnight-rover', 'cognac-aviator', 'noir-moto',
      'charcoal-blazer', 'olive-field', 'burgundy-bomber', 'slate-overcoat'
    ],
    baseColor: [60, 40, 30],
  },
  hoodies: {
    items: [
      'shadow-essential', 'graphite-luxe', 'onyx-oversized', 'storm-tech',
      'midnight-zip', 'charcoal-fleece', 'slate-pullover', 'noir-heritage'
    ],
    baseColor: [35, 35, 40],
  },
  shirts: {
    items: [
      'ivory-atelier', 'noir-structure', 'midnight-oxford', 'pearl-slim',
      'charcoal-mandarin', 'slate-poplin', 'cream-linen', 'obsidian-twill'
    ],
    baseColor: [200, 195, 185],
  },
  tshirts: {
    items: [
      'onyx-essential', 'ivory-pima', 'charcoal-crew', 'midnight-v',
      'slate-fitted', 'pearl-longline', 'graphite-pocket', 'noir-premium'
    ],
    baseColor: [45, 42, 40],
  },
  trousers: {
    items: [
      'charcoal-tailored', 'noir-slim', 'ivory-form', 'midnight-chino',
      'slate-pleated', 'cognac-cord', 'graphite-wool', 'obsidian-stretch'
    ],
    baseColor: [50, 48, 45],
  },
  dresses: {
    items: [
      'noir-evening', 'midnight-silk', 'ivory-sheath', 'burgundy-wrap',
      'emerald-gala', 'pearl-cocktail', 'charcoal-shift', 'gold-drape'
    ],
    baseColor: [30, 25, 35],
  },
  footwear: {
    items: [
      'shadow-runner', 'obsidian-oxford', 'cognac-derby', 'noir-chelsea',
      'midnight-loafer', 'charcoal-sneaker', 'burgundy-brogue', 'slate-boot'
    ],
    baseColor: [40, 35, 30],
  },
  bags: {
    items: [
      'eclipse-tote', 'noir-shoulder', 'cognac-weekender', 'midnight-clutch',
      'charcoal-backpack', 'ivory-crossbody', 'burgundy-satchel', 'obsidian-briefcase'
    ],
    baseColor: [35, 30, 28],
  },
  watches: {
    items: [
      'monarch-chrono', 'silverline-minimal', 'obsidian-automatic', 'midnight-diver',
      'gold-heritage', 'noir-sport', 'platinum-dress', 'bronze-pilot'
    ],
    baseColor: [25, 25, 30],
  },
  accessories: {
    items: [
      'noir-silk-scarf', 'leather-card-holder', 'obsidian-belt', 'silver-cufflinks',
      'cashmere-beanie', 'leather-gloves', 'silk-pocket-square', 'titanium-sunglasses'
    ],
    baseColor: [40, 38, 42],
  },
};

/**
 * Create a minimal SVG product image with luxury dark gradient background.
 * Saves as a proper JPEG-like format using a PPM->conversion or just SVG.
 * Actually, we'll create simple HTML-canvas-rendered images.
 * 
 * Since we can't use canvas without npm packages, let's create elegant SVG files
 * and convert them. Actually simpler: create properly formatted PPM images
 * or just make high quality SVGs that the browser can render.
 * 
 * For production use, we'll create SVG images as .svg files.
 */

function createProductSVG(categoryName, productName, [r, g, b], width = 800, height = 1000) {
  // Create slight color variations for each product
  const hash = productName.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const rVar = Math.max(0, Math.min(255, r + (hash % 40) - 20));
  const gVar = Math.max(0, Math.min(255, g + ((hash * 7) % 30) - 15));
  const bVar = Math.max(0, Math.min(255, b + ((hash * 13) % 35) - 17));

  // Accent color
  const accents = [
    [180, 150, 100], // gold
    [160, 130, 90],  // warm gold
    [140, 120, 100], // bronze
    [170, 160, 150], // silver
    [150, 100, 80],  // copper
  ];
  const accent = accents[hash % accents.length];

  const displayName = productName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const categoryDisplay = categoryName.charAt(0).toUpperCase() + categoryName.slice(1);

  // Category icon paths
  const iconPaths = {
    jackets: `<path d="M400 250 L300 300 L280 500 L320 520 L340 380 L360 360 L400 350 L440 360 L460 380 L480 520 L520 500 L500 300 Z" fill="none" stroke="rgba(${accent[0]},${accent[1]},${accent[2]},0.3)" stroke-width="2"/>`,
    hoodies: `<path d="M350 280 L360 260 L400 240 L440 260 L450 280 L470 500 L330 500 Z M380 240 L400 220 L420 240" fill="none" stroke="rgba(${accent[0]},${accent[1]},${accent[2]},0.3)" stroke-width="2"/>`,
    shirts: `<path d="M350 280 L380 260 L400 270 L420 260 L450 280 L440 300 L460 500 L340 500 L360 300 Z" fill="none" stroke="rgba(${accent[0]},${accent[1]},${accent[2]},0.3)" stroke-width="2"/>`,
    tshirts: `<path d="M340 280 L380 260 L400 270 L420 260 L460 280 L450 320 L440 320 L440 500 L360 500 L360 320 L350 320 Z" fill="none" stroke="rgba(${accent[0]},${accent[1]},${accent[2]},0.3)" stroke-width="2"/>`,
    trousers: `<path d="M360 280 L440 280 L445 400 L460 520 L420 520 L400 420 L380 520 L340 520 L355 400 Z" fill="none" stroke="rgba(${accent[0]},${accent[1]},${accent[2]},0.3)" stroke-width="2"/>`,
    dresses: `<path d="M370 260 L400 250 L430 260 L440 300 L470 520 L330 520 L360 300 Z" fill="none" stroke="rgba(${accent[0]},${accent[1]},${accent[2]},0.3)" stroke-width="2"/>`,
    footwear: `<path d="M340 400 L360 360 L440 360 L460 400 L480 420 L480 440 L320 440 L320 420 Z" fill="none" stroke="rgba(${accent[0]},${accent[1]},${accent[2]},0.3)" stroke-width="2"/>`,
    bags: `<rect x="340" y="300" width="120" height="160" rx="8" fill="none" stroke="rgba(${accent[0]},${accent[1]},${accent[2]},0.3)" stroke-width="2"/><path d="M370 300 L370 270 Q370 250 400 250 Q430 250 430 270 L430 300" fill="none" stroke="rgba(${accent[0]},${accent[1]},${accent[2]},0.3)" stroke-width="2"/>`,
    watches: `<circle cx="400" cy="400" r="80" fill="none" stroke="rgba(${accent[0]},${accent[1]},${accent[2]},0.3)" stroke-width="2"/><circle cx="400" cy="400" r="60" fill="none" stroke="rgba(${accent[0]},${accent[1]},${accent[2]},0.15)" stroke-width="1"/><line x1="400" y1="400" x2="400" y2="355" stroke="rgba(${accent[0]},${accent[1]},${accent[2]},0.4)" stroke-width="2"/><line x1="400" y1="400" x2="430" y2="410" stroke="rgba(${accent[0]},${accent[1]},${accent[2]},0.3)" stroke-width="1.5"/>`,
    accessories: `<circle cx="400" cy="380" r="60" fill="none" stroke="rgba(${accent[0]},${accent[1]},${accent[2]},0.3)" stroke-width="2"/><path d="M360 440 L440 440 L450 460 L350 460 Z" fill="none" stroke="rgba(${accent[0]},${accent[1]},${accent[2]},0.2)" stroke-width="1.5"/>`,
  };

  const icon = iconPaths[categoryName] || iconPaths.accessories;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <radialGradient id="bg" cx="50%" cy="40%" r="70%">
      <stop offset="0%" style="stop-color:rgb(${rVar+15},${gVar+12},${bVar+10})"/>
      <stop offset="50%" style="stop-color:rgb(${Math.floor(rVar/2)},${Math.floor(gVar/2)},${Math.floor(bVar/2)})"/>
      <stop offset="100%" style="stop-color:rgb(10,10,12)"/>
    </radialGradient>
    <radialGradient id="glow" cx="50%" cy="45%" r="35%">
      <stop offset="0%" style="stop-color:rgba(${accent[0]},${accent[1]},${accent[2]},0.08)"/>
      <stop offset="100%" style="stop-color:rgba(0,0,0,0)"/>
    </radialGradient>
    <linearGradient id="textFade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" style="stop-color:rgba(${accent[0]},${accent[1]},${accent[2]},0.7)"/>
      <stop offset="100%" style="stop-color:rgba(${accent[0]},${accent[1]},${accent[2]},0.3)"/>
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <rect width="100%" height="100%" fill="url(#glow)"/>
  
  <!-- Subtle grid pattern -->
  <g opacity="0.03">
    ${Array.from({length: 20}, (_, i) => `<line x1="0" y1="${i*50}" x2="${width}" y2="${i*50}" stroke="white" stroke-width="0.5"/>`).join('\n    ')}
    ${Array.from({length: 16}, (_, i) => `<line x1="${i*50}" y1="0" x2="${i*50}" y2="${height}" stroke="white" stroke-width="0.5"/>`).join('\n    ')}
  </g>
  
  <!-- Category icon/silhouette -->
  <g transform="scale(1.5) translate(-135, -100)">
    ${icon}
  </g>
  
  <!-- AURELIA branding -->
  <text x="400" y="160" text-anchor="middle" font-family="Georgia, serif" font-size="14" letter-spacing="6" fill="rgba(${accent[0]},${accent[1]},${accent[2]},0.4)">AURELIA</text>
  
  <!-- Product name -->
  <text x="400" y="720" text-anchor="middle" font-family="Georgia, serif" font-size="28" letter-spacing="2" fill="url(#textFade)">${displayName}</text>
  
  <!-- Category label -->
  <text x="400" y="760" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" letter-spacing="4" fill="rgba(${accent[0]},${accent[1]},${accent[2]},0.3)">${categoryDisplay.toUpperCase()}</text>
  
  <!-- Decorative lines -->
  <line x1="300" y1="690" x2="500" y2="690" stroke="rgba(${accent[0]},${accent[1]},${accent[2]},0.15)" stroke-width="0.5"/>
  <line x1="300" y1="790" x2="500" y2="790" stroke="rgba(${accent[0]},${accent[1]},${accent[2]},0.15)" stroke-width="0.5"/>
  
  <!-- Corner accents -->
  <path d="M30 30 L80 30 M30 30 L30 80" stroke="rgba(${accent[0]},${accent[1]},${accent[2]},0.15)" stroke-width="0.5" fill="none"/>
  <path d="M${width-30} 30 L${width-80} 30 M${width-30} 30 L${width-30} 80" stroke="rgba(${accent[0]},${accent[1]},${accent[2]},0.15)" stroke-width="0.5" fill="none"/>
  <path d="M30 ${height-30} L80 ${height-30} M30 ${height-30} L30 ${height-80}" stroke="rgba(${accent[0]},${accent[1]},${accent[2]},0.15)" stroke-width="0.5" fill="none"/>
  <path d="M${width-30} ${height-30} L${width-80} ${height-30} M${width-30} ${height-30} L${width-30} ${height-80}" stroke="rgba(${accent[0]},${accent[1]},${accent[2]},0.15)" stroke-width="0.5" fill="none"/>
</svg>`;
}

// Generate all product images
let totalCreated = 0;
for (const [category, config] of Object.entries(categories)) {
  const categoryDir = path.join(ASSETS_ROOT, category);
  if (!fs.existsSync(categoryDir)) {
    fs.mkdirSync(categoryDir, { recursive: true });
  }

  for (const item of config.items) {
    const filename = `${item}.svg`;
    const filepath = path.join(categoryDir, filename);
    
    // Don't overwrite existing real images
    if (fs.existsSync(filepath)) {
      console.log(`  Skipping (exists): ${category}/${filename}`);
      continue;
    }

    const svg = createProductSVG(category, item, config.baseColor);
    fs.writeFileSync(filepath, svg, 'utf-8');
    totalCreated++;
  }
  console.log(`✓ ${category}: ${config.items.length} images`);
}

console.log(`\nTotal images created: ${totalCreated}`);
console.log('Done!');
