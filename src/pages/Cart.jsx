import React, { useState, useEffect } from 'react';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { cartApi } from '../utils/cartApi';
import { userApi } from '../utils/userApi';

const EMPTY_SHIPPING = { name: '', email: '', address1: '', city: '', province: '', postal_code: '', country: 'Canada' };

const shippingInputStyle = { padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', width: '100%', minWidth: 0 };

export default function Cart({ cart, cartOrderId, setPage, updateCartQuantity, removeFromCart }) {
  // Local states for processing checkout
  const [isValidating, setIsValidating] = useState(false);
  const [stockErrors, setStockErrors] = useState([]);
  const [shipping, setShipping] = useState(EMPTY_SHIPPING);

  const { user } = useAuthenticator((context) => [context.user]);

  // Pre-fill the email field once we know who's signed in — guests still
  // have to type theirs, since there's nothing to prefill it from.
  useEffect(() => {
    const loginId = user?.signInDetails?.loginId;
    if (loginId) {
      setShipping((prev) => (prev.email ? prev : { ...prev, email: loginId }));
    }
  }, [user]);

  // Pre-fill name + address from the shopper's saved profile — only
  // overwrites fields the shopper hasn't already typed into, same as the
  // email prefill above. Guests have no profile to pull from.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    userApi.getProfile()
      .then((profile) => {
        if (cancelled) return;
        const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ');
        const address = profile.address || {};
        setShipping((prev) => ({
          ...prev,
          name: prev.name || fullName,
          address1: prev.address1 || address.address1 || '',
          city: prev.city || address.city || '',
          province: prev.province || address.province || '',
          postal_code: prev.postal_code || address.postal_code || '',
          country: address.country || prev.country,
        }));
      })
      .catch(() => {
        // No saved profile (or not loadable) — the shopper just fills in
        // shipping manually, same as a guest checkout.
      });
    return () => { cancelled = true; };
  }, [user]);

  // price comes from the product API as a plain number (e.g. 24.99)
  const total = cart.reduce((sum, item) => sum + (item.price * item.cartQuantity), 0);

  const updateShippingField = (field) => (e) =>
    setShipping((prev) => ({ ...prev, [field]: e.target.value }));

  // Turns the open cart order into a real, payable order — required before
  // routing to /checkout, since that's what actually validates stock,
  // computes totals, and gives the order a "pending" status the payment
  // step can act on. Works identically for a guest or a logged-in shopper
  // (see lambdas/orders/identity.py on the backend).
  const handleProceedToCheckout = async () => {
    const missing = Object.entries(shipping).filter(([, value]) => !value.trim());
    if (missing.length > 0) {
      setStockErrors(['Please fill in your shipping details and email before checking out.']);
      return;
    }

    setIsValidating(true);
    setStockErrors([]);
    
    // Structure items to match backend property schema expectation
    const checkoutPayload = cart.map(item => ({
      productId: item.id,
      title: item.name, 
      requestedQuantity: item.cartQuantity 
    }));
    /*
    try {
      await cartApi.checkout(cartOrderId, {
        customer_email: shipping.email,
        shipping: {
          name: shipping.name,
          address1: shipping.address1,
          city: shipping.city,
          province: shipping.province,
          postal_code: shipping.postal_code,
          country: shipping.country,
        },
      });
    */
   
    try {
      // 1. Inventory Check (Your existing code)
      const response = await fetch('https://jvf4xoz10l.execute-api.us-east-1.amazonaws.com/Prod/check-inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: checkoutPayload })
      });
      const result = await response.json();

      if (!result.success) {
        setStockErrors(result.errors);
        setIsValidating(false);
        return; 
      }

      // --- ADD THIS NEW SECTION ---
      // 2. Create the Unpaid Order
      const orderResponse = await fetch('https://jvf4xoz10l.execute-api.us-east-1.amazonaws.com/Prod/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            items: checkoutPayload,
            totalAmount: total,
            userId: user ? user.signInDetails?.loginId : 'guest',
            status: 'UNPAID'
        })
      });

      const orderResult = await orderResponse.json();

      if (!orderResponse.ok) {
          throw new Error(orderResult.message || "Failed to generate order record.");
      }

      // 3. Save Order ID to global state
      setCurrentOrderId(orderResult.orderId); 
      // ----------------------------

      // 4. Route to payment screen
      setPage('checkout');
    } catch (error) {
      console.error('Checkout failed:', error);
      setStockErrors([error.message || 'Something went wrong while checking out. Please try again.']);
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="page visible">
      {/* CART HERO */}
      <section className="cart-hero">
        <div className="container">
          <div className="section-header">
            <span className="section-eyebrow">Checkout</span>
            <h1 className="cart-title">Your Shopping <em>Cart</em></h1>
            <div className="section-rule"></div>
          </div>
        </div>
      </section>

      {/* CART CONTENT */}
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
              {/* CART ITEMS */}
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
                        
                        {/* 🆕 Dynamic Inline Stock Alerts based on API current_stock */}
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
                              // Cap the manual input so it never bypasses current API stock
                              const cappedVal = Math.min(val, item.current_stock);
                              updateCartQuantity(item.id, cappedVal);
                            }} 
                            min="1"
                            max={item.current_stock}
                          />
                          {/* 🆕 Lock button out immediately if quantity matches current stock */}
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

              {/* CART SUMMARY */}
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

                {/* SHIPPING DETAILS — required before checkout works for a
                    guest, since there's no account to pull an address from */}
                <div className="shipping-form" style={{ marginBottom: '15px', display: 'grid', gap: '8px' }}>
                  <input type="text" placeholder="Full name" value={shipping.name} onChange={updateShippingField('name')} style={shippingInputStyle} />
                  <input type="email" placeholder="Email" value={shipping.email} onChange={updateShippingField('email')} style={shippingInputStyle} />
                  <input type="text" placeholder="Address" value={shipping.address1} onChange={updateShippingField('address1')} style={shippingInputStyle} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <input type="text" placeholder="City" value={shipping.city} onChange={updateShippingField('city')} style={shippingInputStyle} />
                    <input type="text" placeholder="Province" value={shipping.province} onChange={updateShippingField('province')} style={shippingInputStyle} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <input type="text" placeholder="Postal code" value={shipping.postal_code} onChange={updateShippingField('postal_code')} style={shippingInputStyle} />
                    <input type="text" placeholder="Country" value={shipping.country} onChange={updateShippingField('country')} style={shippingInputStyle} />
                  </div>
                </div>

                {/* CHECKOUT ERROR ALERTS INSERTED DIRECTLY ABOVE SUMMARY STATS */}
                {stockErrors.length > 0 && (
                  <div className="stock-error-notice" style={{
                    backgroundColor: '#fdf2f2',
                    border: '1px solid #f8b4b4',
                    borderRadius: '6px',
                    padding: '12px',
                    marginBottom: '15px',
                    color: '#9b1c1c',
                    fontSize: '0.85rem'
                  }}>
                    <strong style={{ display: 'block', marginBottom: '5px' }}>⚠️ Checkout Error:</strong>
                    <ul style={{ margin: 0, paddingLeft: '15px' }}>
                      {stockErrors.map((err, idx) => <li key={idx}>{err}</li>)}
                    </ul>
                  </div>
                )}

                <div className="summary-row">
                  <span>Subtotal</span>
                  <span>${total.toFixed(2)}</span>
                </div>
                <div className="summary-row">
                  <span>Shipping</span>
                  <span className="shipping-free">FREE</span>
                </div>
                <div className="summary-row summary-tax">
                  <span>Tax</span>
                  <span>${(total * 0.08).toFixed(2)}</span>
                </div>
                <div className="summary-total">
                  <span>Total</span>
                  <span>${(total * 1.08).toFixed(2)}</span>
                </div>

                {/* Interactive button state handlers mapped smoothly over existing style profiles */}
                <button 
                  className="btn-primary" 
                  onClick={handleProceedToCheckout}
                  disabled={isValidating}
                  style={{ 
                    width: '100%', 
                    marginTop: '20px',
                    opacity: isValidating ? 0.7 : 1,
                    cursor: isValidating ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isValidating ? 'Placing Your Order... 🐾' : 'Proceed to Checkout'}
                </button>
                
                <button 
                  className="btn-outline" 
                  style={{ width: '100%', marginTop: '10px', color: 'var(--text)', borderColor: 'var(--border)' }} 
                  onClick={() => setPage('products')}
                  disabled={isValidating}
                >
                  Continue Shopping
                </button>

                <div className="summary-note">
                  ✓ Free shipping on all orders<br/>
                  ✓ 30-day satisfaction guarantee<br/>
                  ✓ Premium chonk approved
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}