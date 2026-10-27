const res = await fetch('http://localhost:5000/api/products?featured=true&limit=25');
const data = await res.json();
console.log('Featured count:', data.products.length);
console.log('Featured categories:', [...new Set(data.products.map(p => p.category))]);
console.log('Featured sample:', data.products.map(p => `${p.name} (${p.category})`));



