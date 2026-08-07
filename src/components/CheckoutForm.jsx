import React, { useState } from 'react';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

export default function CheckoutForm({ setPage, clearCart }) {
  const stripe = useStripe();
  const elements = useElements();

  const [message, setMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js hasn't yet loaded.
      return;
    }

    setIsLoading(true);
    setMessage(null);

    // 1. Trigger the payment confirmation
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // Stripe still requires a fallback URL for payment types that DEMAND a redirect (like 3D Secure bank auth)
        return_url: `${window.location.origin}/`,
      },
      redirect: 'if_required',
    });

    // 2. Evaluate the outcome immediately without leaving the page
    if (error) {
      if (error.type === "card_error" || error.type === "validation_error") {
        setMessage(error.message);
      } else {
        setMessage("An unexpected error occurred while processing your payment.");
      }
    } else if (paymentIntent && paymentIntent.status === "succeeded") {
      // 3. SUCCESS STATE: The card went through instantly!
      // You can trigger your state change here to show a confirmation screen or route them back to the shop
      if (clearCart) clearCart();
      setPage('success');
    }

    setIsLoading(false);
  };

  return (
    <form id="payment-form" onSubmit={handleSubmit}>
      <PaymentElement id="payment-element" />
      
      <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button 
          disabled={isLoading || !stripe || !elements} 
          id="submit" 
          className="btn-primary"
          style={{ 
            width: '100%', 
            opacity: (isLoading || !stripe || !elements) ? 0.7 : 1,
            cursor: (isLoading || !stripe || !elements) ? 'not-allowed' : 'pointer'
          }}
        >
          <span id="button-text">
            {isLoading ? "Processing..." : "Pay Now"}
          </span>
        </button>
        
        <button 
          type="button" 
          className="btn-outline" 
          onClick={() => setPage('cart')}
          disabled={isLoading}
          style={{ width: '100%', borderColor: 'var(--border)' }}
        >
          Back to Cart
        </button>
      </div>

      {message && (
        <div id="payment-message" style={{ marginTop: '15px', color: '#ff6b6b', fontSize: '0.9rem', textAlign: 'center' }}>
          {message}
        </div>
      )}
    </form>
  );
}