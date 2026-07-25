import React, { useState } from 'react';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { API_BASE_URL } from '../config';

export default function Cart({ cart, setPage, updateCartQuantity, removeFromCart }) {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuthenticator((context) => [context.user]);

  const total = cart.reduce((sum, item) => sum + (item.price * item.cartQuantity), 0);

  const handleProceedToCheckout = async () => {
    setIsLoading(true);
    try {
      const checkoutPayload = cart.map(item => ({
        product_id: item.id,
        quantity: item.cartQuantity
      }));

      // 1. Verify inventory pre-flight
      const response = await fetch(`${API_BASE_URL}/check-inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: checkoutPayload })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Inventory check failed');
      }

      // 2. Safely route to the checkout page view
      setPage('checkout');

    } catch (error) {
      console.error('Checkout error:', error);
      alert(`Cannot proceed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page visible">
      <section className="cart-hero">
        <div className="container">
          <div className="section-header">
            <span className="section-eyebrow">Shopping Suite</span>
            <h1 className="cart-title">Your Shopping <em>Cart</em></h1>
            <div className="section-rule"></div>
          </div>
        </div>
      </section>

      <section className="cart-section">
        <div className="container">
          {cart.length === 0 ? (
            <div className="empty-cart">
              <div className="empty-icon">🛒</div>
              <h2>Your cart is empty</h2>
              <p>Time to treat your chonky friend! Explore our premium selection of cat foods and treats.</p>
              <button className="btn-primary" onClick={() => setPage('products')}>
                Continue Shopping
              </button>
            </div>
          ) : (
            <div className="cart-layout">
              <div className="cart-items-column">
                <div className="items-header">
                  <h2>{cart.length} {cart.length === 1 ? 'Item' : 'Items'} in Cart</h2>
                </div>
                <div className="cart-items">
                  {cart.map((item, index) => (
                    <div key={item.id || index} className="cart-item-card">
                      <div className="item-image">{item.icon}</div>
                      
                      <div className="item-details">
                        <div className="item-name">{item.name}</div>
                        <div className="item-category">{item.category}</div>
                        
                        {item.cartQuantity >= item.current_stock ? (
                          <div style={{ color: '#e0a93c', fontSize: '0.75rem', marginTop: '5px', fontWeight: '600' }}>
                            ⚠️ Max warehouse stock reached ({item.current_stock} available)
                          </div>
                        ) : item.current_stock <= 10 ? (
                          <div style={{ color: '#ff6b6b', fontSize: '0.75rem', marginTop: '5px' }}>
                            🔥 Only {item.current_stock} left in stock!
                          </div>
                        ) : null}
                      </div>

                      <div className="item-quantity">
                        <div className="qty-controls">
                          <button className="qty-btn" onClick={() => updateCartQuantity(item.id, item.cartQuantity - 1)}>−</button>
                          <input 
                            type="number" 
                            className="qty-input" 
                            value={item.cartQuantity} 
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 1;
                              const cappedVal = Math.min(val, item.current_stock);
                              updateCartQuantity(item.id, cappedVal);
                            }} 
                            min="1"
                            max={item.current_stock}
                          />
                          <button 
                            className="qty-btn" 
                            onClick={() => updateCartQuantity(item.id, item.cartQuantity + 1)}
                            disabled={item.cartQuantity >= item.current_stock}
                            style={{ 
                              opacity: item.cartQuantity >= item.current_stock ? 0.3 : 1,
                              cursor: item.cartQuantity >= item.current_stock ? 'not-allowed' : 'pointer'
                            }}
                          >
                            +
                          </button>
                        </div>
                      </div>
                      
                      <div className="item-price">
                        <div className="price-each">${item.price.toFixed(2)}</div>
                        <div className="price-total">
                          ${(item.price * item.cartQuantity).toFixed(2)}
                        </div>
                      </div>
                      <button className="remove-btn" onClick={() => removeFromCart(item.id)}>✕</button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="summary-card">
                <h3>Order Summary</h3>
                <div className="auth-notice" style={{ fontSize: '0.85rem', marginBottom: '15px', padding: '10px', background: '#f9f9f9', borderRadius: '4px' }}>
                  {user ? (
                    <p style={{ margin: 0 }}>
                      Logged in as: <strong>{user?.signInDetails?.loginId}</strong>
                    </p>
                  ) : (
                    <p style={{ margin: 0 }}>
                      Checking out as guest.
                      <button 
                        onClick={() => setPage('login')} 
                        style={{ background: 'none', border: 'none', color: 'var(--primary)', textDecoration: 'underline', cursor: 'pointer', padding: 0, marginLeft: '5px' }}
                      >
                        Sign in
                      </button> to save your info!
                    </p>
                  )}
                </div>

                <div className="summary-row">
                  <span>Subtotal</span>
                  <span>${total.toFixed(2)}</span>
                </div>
                <div className="summary-row">
                  <span>Shipping</span>
                  <span className="shipping-free">FREE</span>
                </div>
                <div className="summary-row summary-tax">
                  <span>Tax (8%)</span>
                  <span>${(total * 0.08).toFixed(2)}</span>
                </div>
                <div className="summary-total">
                  <span>Total</span>
                  <span>${(total * 1.08).toFixed(2)}</span>
                </div>

                <button 
                  className="btn-primary" 
                  onClick={handleProceedToCheckout}
                  disabled={isLoading}
                  style={{ 
                    width: '100%', 
                    marginTop: '20px',
                    opacity: isLoading ? 0.7 : 1,
                    cursor: isLoading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isLoading ? 'Checking Stock... 🐾' : 'Proceed to Checkout'}
                </button>
                
                <button 
                  className="btn-outline" 
                  style={{ width: '100%', marginTop: '10px', color: 'var(--text)', borderColor: 'var(--border)' }} 
                  onClick={() => setPage('products')}
                  disabled={isLoading}
                >
                  Continue Shopping
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}