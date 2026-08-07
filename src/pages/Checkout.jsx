import React, { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import CheckoutForm from "../components/CheckoutForm";
import { API_BASE_URL } from "../config";
import { useAuthenticator } from "@aws-amplify/ui-react";
import { getOrCreateGuestId } from "../utils/guestId";
import { userApi } from "../utils/userApi";

// The order's shipping address is a single "Full Name" field, but the
// saved profile splits first/last (see Profile.jsx, lambdas/users/models.py)
// — best-effort split/join at the boundary rather than changing either
// model to match the other.
function splitName(fullName) {
  const trimmed = fullName.trim();
  const spaceIndex = trimmed.indexOf(" ");
  if (spaceIndex === -1) return { first_name: trimmed, last_name: "" };
  return { first_name: trimmed.slice(0, spaceIndex), last_name: trimmed.slice(spaceIndex + 1) };
}

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

export default function Checkout({ cartItems, setPage, setCurrentOrderId, clearCart }) {
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

  // Pre-fill shipping from the signed-in shopper's saved profile (name +
  // address set on the Profile page). Guests have no profile to pull from.
  // Guarded so it never overwrites anything already typed into the form —
  // this only ever fills in a still-blank field.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    userApi.getProfile()
      .then((profile) => {
        if (cancelled || !profile) return;
        const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(" ");

        setShippingData((prev) => ({
          ...prev,
          name: prev.name || fullName,
          address1: prev.address1 || profile.address?.address1 || "",
          city: profile.address?.city || prev.city,
          province: profile.address?.province || prev.province,
          postal_code: prev.postal_code || profile.address?.postal_code || "",
          country: profile.address?.country || prev.country,
        }));
      })
      .catch(() => {
        // No saved profile yet (new account) or the fetch failed — not
        // fatal, the shopper just fills the form in manually as before.
      });

    return () => { cancelled = true; };
  }, [user]);

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

  // Mirrors orders/service.py's FREE_SHIP_ABOVE / FLAT_SHIP_FEE / TAX_RATE
  // (same reasoning as Cart.jsx's identical constants) — this is what gets
  // sent as subtotal/total_amount below, but the backend recomputes the
  // real charge server-side and ignores both fields entirely, so this is
  // informational only, not what the shopper is actually billed.
  const FREE_SHIPPING_THRESHOLD = 75;
  const FLAT_SHIPPING_FEE = 10;
  const TAX_RATE = 0.13;

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const shippingFee = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING_FEE;
    return subtotal + subtotal * TAX_RATE + shippingFee;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setShippingData((prev) => ({ ...prev, [name]: value }));
  };

  // Best-effort save of the entered name/address back onto the shopper's
  // profile, so it's there next time (Profile page, next checkout's
  // pre-fill above). Guests have no profile to save to. Failures here are
  // logged but never surfaced — this must not block a checkout that
  // otherwise succeeded.
  const persistProfileFromShipping = async () => {
    if (!user) return;
    const { first_name, last_name } = splitName(shippingData.name);
    try {
      await userApi.updateProfile({
        first_name,
        last_name,
        address: {
          address1: shippingData.address1,
          city: shippingData.city,
          province: shippingData.province,
          postal_code: shippingData.postal_code,
          country: shippingData.country,
        },
      });
    } catch (err) {
      console.error("Failed to save profile from checkout:", err);
    }
  };

  // Orchestrates Form Submission
  const handleSubmitShipping = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    setError(null);

    try {
      // 1. Create order records inside the DB
      const orderData = await handleCreateOrder();
      const orderId = orderData?.order?.order_id;

      if (orderId) {
        setLocalOrderId(orderId);
        if (setCurrentOrderId) setCurrentOrderId(orderId);

        // Fire-and-forget — don't hold up the payment step on this.
        persistProfileFromShipping();

        // 2. Request a client_secret from Stripe for this order
        await fetchPaymentIntent(orderId);
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
