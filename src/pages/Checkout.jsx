import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import CheckoutForm from '../components/CheckoutForm';
import { API_BASE_URL } from '../config';

// Initialize Stripe outside of the component render to avoid recreating the object
// Replace with your actual Stripe publishable key
const stripePromise = loadStripe('pk_test_YOUR_STRIPE_PUBLIC_KEY');

export default function Checkout({ cartItems, setPage }) {
  const [clientSecret, setClientSecret] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    // Prevent fetching if cart is empty
    if (!cartItems || cartItems.length === 0) {
      setPage('cart');
      return;
    }

    // Structure items exactly how your backend Lambda expects them
    const checkoutPayload = cartItems.map(item => ({
      productId: item.id,
      requestedQuantity: item.cartQuantity 
    }));

    const createPaymentIntent = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/payments/create-intent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: checkoutPayload })
        });

        const result = await response.json();

        if (response.ok && result.client_secret) {
          setClientSecret(result.client_secret);
        } else {
          // Handle backend validation failures (e.g., inventory changed right before checkout)
          setError(result.message || "Failed to initialize payment. Please try again.");
        }
      } catch (err) {
        console.error("Payment Intent Error:", err);
        setError("Network error occurred while connecting to the payment server.");
      }
    };

    createPaymentIntent();
  }, [cartItems, setPage]);

  // Stripe requires the appearance object if you want to customize the standard elements
  const appearance = {
    theme: 'stripe',
    variables: {
      colorPrimary: '#333333',
      colorBackground: '#ffffff',
      colorText: '#30313d',
    },
  };

  const options = {
    clientSecret,
    appearance,
  };

  return (
    <div className="page visible">
      <section className="cart-hero">
        <div className="container">
          <div className="section-header">
            <span className="section-eyebrow">Secure Checkout</span>
            <h1 className="cart-title">Complete Your <em>Order</em></h1>
            <div className="section-rule"></div>
          </div>
        </div>
      </section>

      <section className="checkout-section" style={{ padding: '40px 20px' }}>
        <div className="container" style={{ maxWidth: '600px', margin: '0 auto' }}>
          
          {error && (
            <div className="error-banner" style={{ backgroundColor: '#fdf2f2', border: '1px solid #f8b4b4', padding: '15px', color: '#9b1c1c', borderRadius: '6px', marginBottom: '20px' }}>
              <p><strong>⚠️ Checkout Error:</strong> {error}</p>
              <button className="btn-outline" onClick={() => setPage('cart')} style={{ marginTop: '10px' }}>Return to Cart</button>
            </div>
          )}

          {!clientSecret && !error && (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <p>Preparing secure payment gateway... 🐾</p>
            </div>
          )}

          {clientSecret && (
            <div className="summary-card" style={{ padding: '30px', background: '#fff', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
              <Elements options={options} stripe={stripePromise}>
                <CheckoutForm setPage={setPage} />
              </Elements>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}