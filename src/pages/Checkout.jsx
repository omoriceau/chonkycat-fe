import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import CheckoutForm from '../components/CheckoutForm';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// Added currentOrderId to props
export default function Checkout({ cartItems, setPage, currentOrderId }) {
  const [clientSecret, setClientSecret] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    // Prevent fetching if cart is empty or order hasn't been created
    if (!cartItems || cartItems.length === 0 || !currentOrderId) {
      setPage('cart');
      return;
    }

    const checkoutPayload = cartItems.map(item => ({
      productId: item.id,
      requestedQuantity: item.cartQuantity 
    }));

    const createPaymentIntent = async () => {
      try {
        const response = await fetch('https://jvf4xoz10l.execute-api.us-east-1.amazonaws.com/Prod/payments/create-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
              items: checkoutPayload,
              orderId: currentOrderId // Pass the ID so backend links it to Stripe Intent
          })
        });

        const result = await response.json();

        if (response.ok && result.client_secret) {
          setClientSecret(result.client_secret);
        } else {
          setError(result.message || "Failed to initialize payment. Please try again.");
        }
      } catch (err) {
        console.error("Payment Intent Error:", err);
        setError("Network error occurred while connecting to the payment server.");
      }
    };

    createPaymentIntent();
  }, [cartItems, setPage, currentOrderId]);

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
        {/* ... [Keep your existing Hero and HTML structure exactly the same] ... */}
          
          {clientSecret && (
            <div className="summary-card" style={{ padding: '30px', background: '#fff', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
              <Elements options={options} stripe={stripePromise}>
                {/* Pass currentOrderId down if your form needs to display it or use it */}
                <CheckoutForm setPage={setPage} currentOrderId={currentOrderId} />
              </Elements>
            </div>
          )}
        {/* ... */}
    </div>
  );
}