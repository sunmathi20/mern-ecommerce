// Admin API integration test using fetch (Node 18+)

async function test() {
  console.log('=== AURELIA Admin API Test ===\n');

  // 1. Login as admin
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@aurelia.com', password: 'password123' }),
  });
  const loginData = await loginRes.json();
  console.log('Login status:', loginRes.status);
  console.log('User:', loginData.name, '| Role:', loginData.role);

  // Extract cookie
  const setCookie = loginRes.headers.getSetCookie?.() || [];
  const jwtCookie = setCookie.find(c => c.startsWith('jwt='));
  if (!jwtCookie) { console.log('ERROR: No JWT cookie!'); process.exit(1); }
  const cookie = jwtCookie.split(';')[0];
  console.log('Cookie obtained ✓\n');

  // 2. Fetch dashboard
  const dashRes = await fetch('http://localhost:5000/api/admin/dashboard', {
    headers: { Cookie: cookie },
  });
  const d = await dashRes.json();
  console.log('Dashboard status:', dashRes.status);
  console.log('Products: total=' + d.products?.total + ', active=' + d.products?.active + ', outOfStock=' + d.products?.outOfStock);
  console.log('Orders: total=' + d.orders?.total + ', pending=' + d.orders?.pending + ', delivered=' + d.orders?.delivered);
  console.log('Revenue:', d.revenue);
  console.log('Customers:', d.customers);
  console.log('Low Stock Products:', d.lowStockProducts?.length);
  console.log('Recent Orders:', d.recentOrders?.length);
  console.log('Categories:', d.categoryCounts?.map(c => c._id + '(' + c.count + ')').join(', '));

  // 3. Security test - non-admin should be blocked
  console.log('\n--- Security Test ---');
  const noAuthRes = await fetch('http://localhost:5000/api/admin/dashboard');
  console.log('No auth access:', noAuthRes.status === 401 ? 'BLOCKED (401) ✓' : 'UNEXPECTED ' + noAuthRes.status + ' ✗');

  console.log('\n=== All admin API tests complete ===');
}

test().catch(err => { console.error('Test error:', err.message); process.exit(1); });
