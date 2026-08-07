import ProductCard from '../components/ProductCard';

// src/pages/Shop.jsx
export default function Shop({ products, selectedCategory, setSelectedCategory, goToProduct, addToCart }) {
  // `value` is the exact product.category string stored in the DB; `name`
  // is just the display label — kept separate since the DB uses the
  // singular "Treat", not "Snacks"/"Treats".
  const categories = [
    { name: 'Dry Food', value: 'Dry Food', icon: '🥣' },
    { name: 'Wet Food', value: 'Wet Food', icon: '🫙' },
    { name: 'Treats', value: 'Treat', icon: '🐡' },
  ];

  return (
    <div className="shop-page">
      <div className="container" style={{ paddingTop: '60px' }}>
        <div className="section-header">
          <span className="section-eyebrow">All Products</span>
          <h1 className="section-title">Chonky <em>Collection</em></h1>
          <div className="section-rule"></div>
        </div>
        
        {/* Category Filter Buttons */}
        <div style={{ marginBottom: '30px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button 
            onClick={() => setSelectedCategory(null)}
            style={{
              padding: '8px 16px',
              cursor: 'pointer',
              background: selectedCategory === null ? '#333' : '#f0f0f0',
              color: selectedCategory === null ? '#fff' : '#000',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontWeight: 'bold'
            }}
          >
            All Products
          </button>
          {categories.map((cat) => (
            <button
              key={cat.name}
              onClick={() => setSelectedCategory(cat.value)}
              style={{
                padding: '8px 16px',
                cursor: 'pointer',
                background: selectedCategory === cat.value ? '#333' : '#f0f0f0',
                color: selectedCategory === cat.value ? '#fff' : '#000',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontWeight: selectedCategory === cat.value ? 'bold' : 'normal'
              }}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>

        <div className="products-grid">
          {products.length > 0 ? (
            products.map((item) => (
          <ProductCard
              key={item.id}
              {...item}
              onClick={() => goToProduct(item)}
              onAddToCart={() => addToCart(item, 1)}
            />
            ))
            ) : (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px' }}>
              No products found in this category.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}