import React, { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import CheckoutForm from "../components/CheckoutForm";
import { API_BASE_URL } from "../config";
import { useAuthenticator } from "@aws-amplify/ui-react";
import { getOrCreateGuestId } from "../utils/guestId";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

export default function Checkout({ cartItems, setPage, setCurrentOrderId }) {
  const { user } = useAuthenticator((context) => [context.user]);
  const loginEmail = user?.signInDetails?.loginId || "";

  // Phase Management State
  const [checkoutPhase, setCheckoutPhase] = useState("shipping"); // 'shipping' | 'payment'
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  // Stripe State
  const [clientSecret, setClientSecret] = useState("");
  const [localOrderId, setLocalOrderId] = useState(null);

  // Shipping Form State
  const [shippingData, setShippingData] = useState({
    name: "",
    address1: "",
    city: "Toronto",
    province: "ON",
    postal_code: "",
    country: "Canada",
  });
  const [customerNotes, setCustomerNotes] = useState("");
  const [email, setEmail] = useState(loginEmail);

  // Keep the email field in sync once the signed-in user's session resolves
  // (it isn't available yet on first render).
  useEffect(() => {
    if (loginEmail) {
      setEmail(loginEmail);
    }
  }, [loginEmail]);

  // Protect the route: Bounce back if cart is empty
  useEffect(() => {
    if (!cartItems || cartItems.length === 0) {
      setPage("cart");
    }
  }, [cartItems, setPage]);

  // Helper calculation formulas
  const calculateSubtotal = () => {
    return cartItems.reduce(
      (sum, item) => sum + item.price * item.cartQuantity,
      0,
    );
  };

  const calculateTotal = () => {
    return calculateSubtotal() * 1.08; // Subtotal + 8% Tax
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setShippingData((prev) => ({ ...prev, [name]: value }));
  };

  // Orchestrates Form Submission
  const handleSubmitShipping = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    setError(null);

    try {
      // 1. Create order records inside the DB
      const orderData = await handleCreateOrder();

      if (orderData && orderData.id) {
        setLocalOrderId(orderData.id);
        if (setCurrentOrderId) setCurrentOrderId(orderData.id);

        // 2. Request a client_secret from Stripe for this order
        await fetchPaymentIntent(orderData.id);
      } else {
        throw new Error("Invalid response received from the database cluster.");
      }
    } catch (err) {
      setError(err.message || "Failed processing shipping configuration.");
      setIsProcessing(false);
    }
  };

  const handleCreateOrder = async () => {
    const userId = user?.userId || `guest_${getOrCreateGuestId()}`;

    const orderPayload = {
      user_id: userId,
      customer_email: email,
      items: cartItems.map((item) => ({
        product_id: item.id,
        quantity: item.cartQuantity,
        unit_price: item.price,
        name_snapshot: item.name,
      })),
      shipping: { ...shippingData, notes: customerNotes },
      subtotal: calculateSubtotal(),
      total_amount: calculateTotal(),
    };

    const orderResponse = await fetch(`${API_BASE_URL}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderPayload),
    });

    if (!orderResponse.ok) {
      const errRes = await orderResponse.json().catch(() => ({}));
      throw new Error(errRes.error || "Failed to create order in database");
    }

    return await orderResponse.json();
  };

  const fetchPaymentIntent = async (orderId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: orderId,
        }),
      });

      const result = await response.json();

      if (response.ok && result.client_secret) {
        setClientSecret(result.client_secret);
        setCheckoutPhase("payment"); // Safe transition to reveal the Stripe Element frame
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
    theme: "stripe",
    variables: {
      colorPrimary: "#333333",
      colorBackground: "#ffffff",
      colorText: "#30313d",
    },
  };

  return (
    <div className="page visible">
      <section className="checkout-section" style={{ padding: "40px 20px" }}>
        <div
          className="container"
          style={{ maxWidth: "800px", margin: "0 auto" }}
        >
          <h1 style={{ marginBottom: "30px" }}>Checkout</h1>

          {error && (
            <div
              className="error-banner"
              style={{
                background: "#fdf2f2",
                color: "#9b1c1c",
                padding: "15px",
                borderRadius: "6px",
                marginBottom: "20px",
              }}
            >
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* PHASE 1: SHIPPING FORM */}
          <div
            className="shipping-card"
            style={{
              background: "#fff",
              padding: "30px",
              borderRadius: "8px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
              marginBottom: "30px",
              opacity: checkoutPhase === "payment" ? 0.6 : 1,
            }}
          >
            <h2 style={{ fontSize: "1.5rem", marginBottom: "20px" }}>
              Shipping Details
            </h2>

            <form onSubmit={handleSubmitShipping}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "15px",
                  marginBottom: "15px",
                }}
              >
                <input
                  required
                  type="email"
                  name="email"
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={checkoutPhase === "payment" || !!loginEmail}
                  style={{ gridColumn: "span 2", padding: "10px" }}
                />
                <input
                  required
                  type="text"
                  name="name"
                  placeholder="Full Name"
                  value={shippingData.name}
                  onChange={handleInputChange}
                  disabled={checkoutPhase === "payment"}
                  style={{ gridColumn: "span 2", padding: "10px" }}
                />
                <input
                  required
                  type="text"
                  name="address1"
                  placeholder="Street Address"
                  value={shippingData.address1}
                  onChange={handleInputChange}
                  disabled={checkoutPhase === "payment"}
                  style={{ gridColumn: "span 2", padding: "10px" }}
                />
                <input
                  required
                  type="text"
                  name="city"
                  placeholder="City"
                  value={shippingData.city}
                  onChange={handleInputChange}
                  disabled={checkoutPhase === "payment"}
                  style={{ padding: "10px" }}
                />
                <input
                  required
                  type="text"
                  name="province"
                  placeholder="Province/State"
                  value={shippingData.province}
                  onChange={handleInputChange}
                  disabled={checkoutPhase === "payment"}
                  style={{ padding: "10px" }}
                />
                <input
                  required
                  type="text"
                  name="postal_code"
                  placeholder="Postal Code"
                  value={shippingData.postal_code}
                  onChange={handleInputChange}
                  disabled={checkoutPhase === "payment"}
                  style={{ padding: "10px" }}
                />
                <input
                  required
                  type="text"
                  name="country"
                  placeholder="Country"
                  value={shippingData.country}
                  onChange={handleInputChange}
                  disabled={checkoutPhase === "payment"}
                  style={{ padding: "10px" }}
                />
                <input
                  type="text"
                  name="customerNotes"
                  placeholder="Delivery Instructions (Optional)"
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                  disabled={checkoutPhase === "payment"}
                  style={{ gridColumn: "span 2", padding: "10px" }}
                />
              </div>

              {checkoutPhase === "shipping" && (
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isProcessing}
                  style={{ width: "100%", padding: "12px" }}
                >
                  {isProcessing ? "Preparing Order..." : "Continue to Payment"}
                </button>
              )}
            </form>
          </div>

          {/* PHASE 2: STRIPE PAYMENT */}
          {checkoutPhase === "payment" && clientSecret && (
            <div
              className="payment-card"
              style={{
                padding: "30px",
                background: "#fff",
                borderRadius: "8px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
              }}
            >
              <h2 style={{ fontSize: "1.5rem", marginBottom: "20px" }}>
                Secure Payment
              </h2>
              <Elements
                options={{ clientSecret, appearance }}
                stripe={stripePromise}
              >
                <CheckoutForm
                  setPage={setPage}
                  currentOrderId={localOrderId}
                  clearCart={clearCart}
                />
              </Elements>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
