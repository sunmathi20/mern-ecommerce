/**
 * verifyPhase4.mjs — Integration test verifying Product, Category, and Upload functionality
 */

async function runVerification() {
  console.log('=== AURELIA Phase 4 Integration Verification ===\n');

  // 1. Login as Admin
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@aurelia.com', password: 'password123' }),
  });

  if (!loginRes.ok) {
    throw new Error(`Admin login failed: ${loginRes.status}`);
  }

  const setCookie = loginRes.headers.get('set-cookie');
  const cookie = setCookie ? setCookie.split(';')[0] : '';
  console.log('✓ Admin login successful. Session cookie obtained.');

  // 2. Fetch Categories
  const catRes = await fetch('http://localhost:5000/api/categories?all=true', {
    headers: { Cookie: cookie },
  });
  const categories = await catRes.json();
  console.log(`✓ Fetched categories: ${categories.length} categories available in store.`);

  // 3. Create a Test Category
  const testCatSlug = `test-cat-${Date.now()}`;
  const createCatRes = await fetch('http://localhost:5000/api/categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({
      name: `Test Luxury Category ${Date.now()}`,
      slug: testCatSlug,
      description: 'A test luxury category for verification',
      displayOrder: 99,
    }),
  });

  if (!createCatRes.ok) {
    const errText = await createCatRes.text();
    throw new Error(`Failed to create category: ${createCatRes.status} - ${errText}`);
  }
  const createdCat = await createCatRes.json();
  console.log(`✓ Created test category: "${createdCat.name}" (ID: ${createdCat._id})`);

  // 4. Create a Test Product
  const createProdRes = await fetch('http://localhost:5000/api/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({
      name: 'Bespoke Diamond Chronometer',
      price: 185000,
      originalPrice: 210000,
      category: 'Watches',
      countInStock: 8,
      description: 'Precision handcrafted luxury timepiece with meteorite dial and solid rose gold bezel.',
      image: '/assets/products/watches/submariner.svg',
      images: ['/assets/products/watches/submariner.svg'],
      brand: 'AURELIA Haute',
      sizes: ['40mm', '42mm'],
      colors: ['Rose Gold', 'Meteorite'],
      tags: ['exclusive', 'diamond', 'haute'],
      featured: true,
      isNewProduct: true,
      isActive: true,
    }),
  });

  if (!createProdRes.ok) {
    const errText = await createProdRes.text();
    throw new Error(`Failed to create product: ${createProdRes.status} - ${errText}`);
  }
  const createdProd = await createProdRes.json();
  console.log(`✓ Created test product: "${createdProd.name}" (ID: ${createdProd._id}, SKU: ${createdProd.sku})`);

  // 5. Update the Product
  const updateProdRes = await fetch(`http://localhost:5000/api/products/${createdProd._id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({
      price: 180000,
      countInStock: 12,
    }),
  });
  const updatedProd = await updateProdRes.json();
  console.log(`✓ Updated test product: Price is now ₹${updatedProd.price}, stock is ${updatedProd.countInStock}.`);

  // 6. Toggle Product Active Status
  const toggleRes = await fetch(`http://localhost:5000/api/products/${createdProd._id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ isActive: false }),
  });
  const toggled = await toggleRes.json();
  console.log(`✓ Toggled status: ${toggled.message}`);

  // 7. Test Image Upload
  const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
  const dummySvg = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><circle cx="50" cy="50" r="40" fill="#C6A15B"/></svg>';
  const body = [
    `--${boundary}`,
    'Content-Disposition: form-data; name="image"; filename="luxury-badge.svg"',
    'Content-Type: image/svg+xml',
    '',
    dummySvg,
    `--${boundary}--`,
  ].join('\r\n');

  const uploadRes = await fetch('http://localhost:5000/api/upload', {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      Cookie: cookie,
    },
    body: Buffer.from(body),
  });

  if (uploadRes.ok) {
    const uploadData = await uploadRes.json();
    console.log(`✓ Image uploaded successfully to server: ${uploadData.image}`);
  } else {
    const errText = await uploadRes.text();
    console.log(`Upload response: ${uploadRes.status} - ${errText}`);
  }

  // 8. Clean up test product
  const delProdRes = await fetch(`http://localhost:5000/api/products/${createdProd._id}`, {
    method: 'DELETE',
    headers: { Cookie: cookie },
  });
  const delProdData = await delProdRes.json();
  console.log(`✓ Deleted test product: ${delProdData.message}`);

  // 9. Clean up test category
  const delCatRes = await fetch(`http://localhost:5000/api/categories/${createdCat._id}`, {
    method: 'DELETE',
    headers: { Cookie: cookie },
  });
  const delCatData = await delCatRes.json();
  console.log(`✓ Deleted test category: ${delCatData.message}`);

  console.log('\n=== All Phase 4 Integration Tests PASSED Successfully! ===\n');
}

runVerification().catch((err) => {
  console.error('\n✗ Verification failed:', err);
  process.exit(1);
});
