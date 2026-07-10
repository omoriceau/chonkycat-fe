import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import CheckoutForm from '../components/CheckoutForm';
import { useAuthenticator } from '@aws-amplify/ui-react'; 

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

export default function Checkout({ cartItems, setPage, setCurrentOrderId }) {
  const { user } = useAuthenticator((context) => [context.user]);

  // Phase Management State
  const [checkoutPhase, setCheckoutPhase] = useState('shipping'); // 'shipping' | 'payment'
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  // Stripe State
  const [clientSecret, setClientSecret] = useState("");
  const [localOrderId, setLocalOrderId] = useState(null);

  // Shipping Form State
  const [shippingData, setShippingData] = useState({
    name: '',
    address1: '',
    city: 'Toronto', // Defaulting based on typical localized traffic
    province: 'ON',
    postal_code: '',
    country: 'Canada'
  });
  const [customerNotes, setCustomerNotes] = useState('');

  // Protect the route: Bounce back if cart is empty
  useEffect(() => {
    if (!cartItems || cartItems.length === 0) {
      setPage('cart');
    }
  }, [cartItems, setPage]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setShippingData(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    setError(null);

    // 1. Map frontend cart to backend schema expectation
    // NOTE: Passing item.id (UUID) directly. If backend strictly requires INT, 
    // this will fail until the API is updated.
    const itemsForBackend = cartItems.map(item => ({
      product_id: item.id, 
      quantity: item.cartQuantity
    }));

    const orderPayload = {
      user_id: user ? user.userId : null,
      customer_email: user ? user.signInDetails?.loginId : "guest@example.com",
      items: itemsForBackend,
      customer_notes: customerNotes,
      shipping: shippingData
    };

    try {
      // 2. Create the Order
      const orderResponse = await fetch('https://jvf4xoz10l.execute-api.us-east-1.amazonaws.com/Prod/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
      });

      const orderResult = await orderResponse.json();

      if (!orderResponse.ok) {
        throw new Error(orderResult.message || "Failed to create order record.");
      }

      const generatedOrderId = orderResult.orderId || orderResult.id;
      
      // Save ID locally for the next API call, and globally for the Success page
      setLocalOrderId(generatedOrderId);
      setCurrentOrderId(generatedOrderId); 

      // 3. Chain the Payment Intent Call immediately
      await fetchPaymentIntent(generatedOrderId, itemsForBackend);

    } catch (err) {
      console.error("Order Creation Error:", err);
      setError(err.message || "Network error occurred while creating your order.");
      setIsProcessing(false);
    }
  };

  const fetchPaymentIntent = async (orderId, formattedItems) => {
    try {
      const response = await fetch('https://jvf4xoz10l.execute-api.us-east-1.amazonaws.com/Prod/payments/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            items: formattedItems,
            orderId: orderId 
        })
      });

      const result = await response.json();

      if (response.ok && result.client_secret) {
        setClientSecret(result.client_secret);
        setCheckoutPhase('payment'); // Transition UI to show Stripe
      } else {
        setError(result.message || "Failed to initialize payment gateway.");
      }
    } catch (err) {
      console.error("Payment Intent Error:", err);
      setError("Network error occurred while connecting to Stripe.");
    } finally {
      setIsProcessing(false);
    }
  };

  const appearance = {
    theme: 'stripe',
    variables: { colorPrimary: '#333333', colorBackground: '#ffffff', colorText: '#30313d' },
  };

  return (
    <div className="page visible">
      <section className="checkout-section" style={{ padding: '40px 20px' }}>
        <div className="container" style={{ maxWidth: '800px', margin: '0 auto' }}>
          
          <h1 style={{ marginBottom: '30px' }}>Checkout</h1>

          {error && (
            <div className="error-banner" style={{ background: '#fdf2f2', color: '#9b1c1c', padding: '15px', borderRadius: '6px', marginBottom: '20px' }}>
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* PHASE 1: SHIPPING FORM */}
          <div className="shipping-card" style={{ background: '#fff', padding: '30px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', marginBottom: '30px', opacity: checkoutPhase === 'payment' ? 0.6 : 1 }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '20px' }}>Shipping Details</h2>
            
            <form onSubmit={handleCreateOrder}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                <input required type="text" name="name" placeholder="Full Name" value={shippingData.name} onChange={handleInputChange} disabled={checkoutPhase === 'payment'} style={{ gridColumn: 'span 2', padding: '10px' }} />
                <input required type="text" name="address1" placeholder="Street Address" value={shippingData.address1} onChange={handleInputChange} disabled={checkoutPhase === 'payment'} style={{ gridColumn: 'span 2', padding: '10px' }} />
                <input required type="text" name="city" placeholder="City" value={shippingData.city} onChange={handleInputChange} disabled={checkoutPhase === 'payment'} style={{ padding: '10px' }} />
                <input required type="text" name="province" placeholder="Province/State" value={shippingData.province} onChange={handleInputChange} disabled={checkoutPhase === 'payment'} style={{ padding: '10px' }} />
                <input required type="text" name="postal_code" placeholder="Postal Code" value={shippingData.postal_code} onChange={handleInputChange} disabled={checkoutPhase === 'payment'} style={{ padding: '10px' }} />
                <input required type="text" name="country" placeholder="Country" value={shippingData.country} onChange={handleInputChange} disabled={checkoutPhase === 'payment'} style={{ padding: '10px' }} />
                <input type="text" name="customerNotes" placeholder="Delivery Instructions (Optional)" value={customerNotes} onChange={(e) => setCustomerNotes(e.target.value)} disabled={checkoutPhase === 'payment'} style={{ gridColumn: 'span 2', padding: '10px' }} />
              </div>

              {checkoutPhase === 'shipping' && (
                <button type="submit" className="btn-primary" disabled={isProcessing} style={{ width: '100%', padding: '12px' }}>
                  {isProcessing ? 'Preparing Order...' : 'Continue to Payment'}
                </button>
              )}
            </form>
          </div>

          {/* PHASE 2: STRIPE PAYMENT */}
          {checkoutPhase === 'payment' && clientSecret && (
            <div className="payment-card" style={{ padding: '30px', background: '#fff', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '20px' }}>Secure Payment</h2>
              <Elements options={{ clientSecret, appearance }} stripe={stripePromise}>
                <CheckoutForm setPage={setPage} currentOrderId={localOrderId} />
              </Elements>
            </div>
          )}

        </div>
      </section>
    </div>
  );
}