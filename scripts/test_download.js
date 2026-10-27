import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function test() {
  const targetDir = path.resolve(__dirname, '../../frontend/public/assets/products/jackets');
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const testUrl = 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&auto=format&fit=crop&q=80';
  console.log('Testing download from Unsplash...');
  const res = await fetch(testUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch: ${res.status} ${res.statusText}`);
  }
  const buffer = await res.arrayBuffer();
  const dest = path.join(targetDir, 'obsidian-atelier-jacket.webp');
  fs.writeFileSync(dest, Buffer.from(buffer));
  console.log(`Saved ${buffer.byteLength} bytes to ${dest}`);
}

test().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
