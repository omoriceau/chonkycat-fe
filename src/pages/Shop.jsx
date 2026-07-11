import ProductCard from '../components/ProductCard';

// src/pages/Shop.jsx
export default function Shop({ products, selectedCategory, setSelectedCategory, goToProduct, addToCart }) {
  const categories = [
    { name: 'Dry Food', icon: '🥣' },
    { name: 'Wet Food', icon: '🫙' },
    { name: 'Snacks', icon: '🐡' },
    { name: 'Bundle', icon: '📦' }
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
              onClick={() => setSelectedCategory(cat.name)}
              style={{
                padding: '8px 16px',
                cursor: 'pointer',
                background: selectedCategory === cat.name ? '#333' : '#f0f0f0',
                color: selectedCategory === cat.name ? '#fff' : '#000',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontWeight: selectedCategory === cat.name ? 'bold' : 'normal'
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