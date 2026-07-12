import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { IMAGES_BASE_URL } from '../config';
import { slugify } from '../utils/slug';

export default function ProductDetails({ products, addToCart }) {
  const { slug } = useParams();
  const navigate = useNavigate();
  const product = products.find((p) => slugify(p.name) === slug);

  const [quantity, setQuantity] = useState(1);

  const handleQtyChange = (delta) => {
    setQuantity(prev => Math.max(1, prev + delta));
  };

  if (!product) return (
    <div className="container" style={{ textAlign: 'center', padding: '50px' }}>
      <h2>No product selected!</h2>
      <button onClick={() => navigate('/shop')} className="btn-primary">
        Return to Shop
      </button>
    </div>
  );

  return (
    <div className="page visible">
      <div className="container pdp-section">
        <div className="pdp-grid">
          
          {/* GALLERY */}
          <div>
            <div className="pdp-gallery-main" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
              {product.image_url ? (
                <img
                  src={`${IMAGES_BASE_URL}/${product.image_url}`}
                  alt={product.name}
                  style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain' }}
                />
              ) : (
                <span style={{ fontSize: '6rem' }}>{product.icon}</span>
              )}
            </div>
          </div>

          {/* INFO */}
          <div>
            <div className="pdp-breadcrumb">Shop / {product.category} / <span>{product.name}</span></div>
            <h1 className="pdp-title">{product.name}</h1>
            <div className="pdp-price">${product.price.toFixed(2)}</div>
            <p className="pdp-desc">
                {product.description}
            </p>

            <div className="pdp-qty-label">Quantity</div>
            <div className="pdp-qty">
              <button className="qty-btn" onClick={() => handleQtyChange(-1)}>−</button>
              <input className="qty-num" type="number" value={quantity} readOnly />
              <button className="qty-btn" onClick={() => handleQtyChange(1)}>+</button>
            </div>

            <button 
                className="btn-primary pdp-atc" 
                onClick={() => addToCart(product, quantity)}
            >
                🛒 Add to Cart
            </button>

            {/* INGREDIENTS */}
            <div className="pdp-tabs">
              <div className="pdp-qty-label">Ingredients</div>
              <ul className="ingredients-list">
                {product.ingredients.split(',').map((ingredient) => (
                  <li key={ingredient} className="ingredient-chip">{ingredient.trim()}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}