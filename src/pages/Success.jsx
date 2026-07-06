import React, { useEffect } from 'react';

export default function Success({ setPage, currentOrderId }) {
  // Ensure the page loads at the top, especially coming from a checkout form
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="page visible">
      <section className="success-section" style={{ padding: '80px 20px', textAlign: 'center', minHeight: '60vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div className="container">
          
          <div style={{ fontSize: '5rem', marginBottom: '10px' }}>
            🎉🐾
          </div>
          
          <div className="section-header">
            <span className="section-eyebrow">Payment Complete</span>
            <h1 className="cart-title" style={{ marginBottom: '15px' }}>Order <em>Successful!</em></h1>
          </div>

          <p style={{ fontSize: '1.1rem', color: '#666', maxWidth: '500px', margin: '0 auto 25px' }}>
            Thank you for your purchase! We are preparing your order right now. Your chonky friend is going to love it.
          </p>

          {currentOrderId && (
            <div style={{ 
              background: '#f8f9fa', 
              border: '1px dashed #ccc',
              padding: '15px 30px', 
              borderRadius: '8px', 
              display: 'inline-block',
              marginBottom: '30px',
              color: '#333'
            }}>
              Order Reference: <strong style={{ userSelect: 'all' }}>{currentOrderId}</strong>
            </div>
          )}

          <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button 
              className="btn-primary" 
              onClick={() => setPage('products')}
              style={{ padding: '12px 30px' }}
            >
              Continue Shopping
            </button>
            
            <button 
              className="btn-outline" 
              onClick={() => setPage('home')}
              style={{ padding: '12px 30px', borderColor: 'var(--border)' }}
            >
              Return Home
            </button>
          </div>

        </div>
      </section>
    </div>
  );
}