import React from 'react';
import { IMAGES_BASE_URL } from '../config';

export default function ProductCard({
  badge,
  badgeColor,
  icon,
  image_url,
  category,
  name, 
  tagline, 
  stars, 
  reviews, 
  price,
  onClick,
  onAddToCart 
}) {
  const handleAddClick = (e) => {
    e.stopPropagation(); 
    onAddToCart();
  };
  return (
    <div className="product-card" onClick={onClick} style={{ cursor: 'pointer' }}>
      
      {/* 1. Conditional Badge */}
      {badge && (
        <div className={`product-badge ${badgeColor === 'gold' ? 'gold' : ''}`}>
          {badge}
        </div>
      )}
      
      {/* 2. Product Image/Icon */}
    <div className="product-img" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
        {image_url ? (
          <img
            src={`${IMAGES_BASE_URL}/${image_url}`}
            alt={name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          // Graceful fallback to your original emoji system
          <span style={{ fontSize: '3rem' }}>{icon}</span>
        )}
      </div>
      {/* 3. Product Details */}
      <div className="product-info">
        <div className="product-category">{category}</div>
        <div className="product-name">{name}</div>
        
        {/* Some cards on the shop page don't have a tagline, so we make it optional */}
        {!!tagline && <div className="product-tagline">{tagline}</div>}
        
        {(stars !== undefined || reviews !== undefined) && (
            <div className="product-stars">
              {stars} {reviews !== undefined && <span className="product-reviews">({reviews})</span>}
            </div>
        )}
        
        <div className="product-footer">
          <div className="product-price">${price.toFixed(2)}</div>
        </div>
        
        {/* 4. Add to Cart Action */}
        <button 
          className="add-btn"
          onClick={handleAddClick} // Use our helper here
        >
          Add to Cart
        </button>
      </div>
    </div>
  );
}