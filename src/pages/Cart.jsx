import React, { useState, useEffect } from "react";
import { useAuthenticator } from "@aws-amplify/ui-react";
import { API_BASE_URL, IMAGES_BASE_URL } from "../config";

export default function Cart({
  cart,
  setPage,
  updateCartQuantity,
  removeFromCart,
}) {
  const [checkingInventory, setCheckingInventory] = useState(false);
  const [inventoryError, setInventoryError] = useState("");
  const [unavailableItems, setUnavailableItems] = useState([]);

  const { user } = useAuthenticator((context) => [context.user]);

  useEffect(() => {
    setInventoryError("");
    setUnavailableItems([]);
  }, [cart]);

  const total = cart.reduce(
    (sum, item) => sum + item.price * item.cartQuantity,
    0,
  );

  const handleCheckout = async () => {
    if (cart.length === 0 || checkingInventory) {
      return;
    }

    setCheckingInventory(true);
    setInventoryError("");
    setUnavailableItems([]);

    try {
      const inventoryItems = cart.map((item) => ({
        sku: item.sku,
        quantity: Number(item.cartQuantity),
      }));

      const hasInvalidItem = inventoryItems.some(
        (item) =>
          !item.sku || !Number.isInteger(item.quantity) || item.quantity <= 0,
      );

      if (hasInvalidItem) {
        throw new Error(
          "One or more cart items have an invalid SKU or quantity.",
        );
      }

      console.log("Inventory check payload:", inventoryItems);

      const response = await fetch(`${API_BASE_URL}/products/check-inventory`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(inventoryItems),
      });

      if (!response.ok) {
        let errorMessage = `Inventory check failed with HTTP ${response.status}.`;

        try {
          const errorData = await response.json();

          errorMessage = errorData?.message || errorData?.error || errorMessage;
        } catch {
          // Keep the HTTP-based message when the response is not JSON.
        }

        throw new Error(errorMessage);
      }

      const rawData = await response.json();
      let inventoryResult = rawData;

      if (rawData?.body !== undefined) {
        inventoryResult =
          typeof rawData.body === "string"
            ? JSON.parse(rawData.body)
            : rawData.body;
      }

      if (!Array.isArray(inventoryResult)) {
        throw new Error("The inventory API returned an unexpected response.");
      }

      if (inventoryResult.length > 0) {
        setUnavailableItems(inventoryResult);
        return;
      }

      setPage("checkout");
    } catch (error) {
      console.error("Inventory check failed:", error);

      setInventoryError(
        error instanceof Error
          ? error.message
          : "Inventory could not be verified. Please try again.",
      );
    } finally {
      setCheckingInventory(false);
    }
  };

  return (
    <div className="page visible">
      <section className="cart-hero">
        <div className="container">
          <div className="section-header">
            <span className="section-eyebrow">Shopping Suite</span>
            <h1 className="cart-title">
              Your Shopping <em>Cart</em>
            </h1>
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
              <p>
                Time to treat your chonky friend! Explore our premium selection
                of cat foods and treats.
              </p>
              <button
                className="btn-primary"
                onClick={() => setPage("products")}
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            <div className="cart-layout">
              <div className="cart-items-column">
                <div className="items-header">
                  <h2>
                    {cart.length} {cart.length === 1 ? "Item" : "Items"} in Cart
                  </h2>
                </div>
                <div className="cart-items">
                  {cart.map((item, index) => (
                    <div key={item.id || index} className="cart-item-card">
                      <div className="item-image">
                        {item.image_url ? (
                          <img
                            src={`${IMAGES_BASE_URL}/${item.image_url}`}
                            alt={item.name}
                            loading="lazy"
                            onError={(event) => {
                              event.currentTarget.style.display = "none";
                              event.currentTarget.nextElementSibling.style.display =
                                "inline";
                            }}
                          />
                        ) : null}

                        <span
                          className="item-image-fallback"
                          style={{
                            display: item.image_url ? "none" : "inline",
                          }}
                          aria-hidden="true"
                        >
                          {item.icon || "🐱"}
                        </span>
                      </div>

                      <div className="item-details">
                        <div className="item-name">{item.name}</div>
                        <div className="item-category">{item.category}</div>

                        {item.cartQuantity >= item.current_stock ? (
                          <div
                            style={{
                              color: "#e0a93c",
                              fontSize: "0.75rem",
                              marginTop: "5px",
                              fontWeight: "600",
                            }}
                          >
                            ⚠️ Max warehouse stock reached ({item.current_stock}{" "}
                            available)
                          </div>
                        ) : item.current_stock <= 10 ? (
                          <div
                            style={{
                              color: "#ff6b6b",
                              fontSize: "0.75rem",
                              marginTop: "5px",
                            }}
                          >
                            🔥 Only {item.current_stock} left in stock!
                          </div>
                        ) : null}
                      </div>

                      <div className="item-quantity">
                        <div className="qty-controls">
                          <button
                            className="qty-btn"
                            onClick={() =>
                              updateCartQuantity(item.id, item.cartQuantity - 1)
                            }
                          >
                            −
                          </button>
                          <input
                            type="number"
                            className="qty-input"
                            value={item.cartQuantity}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 1;
                              const cappedVal = Math.min(
                                val,
                                item.current_stock,
                              );
                              updateCartQuantity(item.id, cappedVal);
                            }}
                            min="1"
                            max={item.current_stock}
                          />
                          <button
                            className="qty-btn"
                            onClick={() =>
                              updateCartQuantity(item.id, item.cartQuantity + 1)
                            }
                            disabled={item.cartQuantity >= item.current_stock}
                            style={{
                              opacity:
                                item.cartQuantity >= item.current_stock
                                  ? 0.3
                                  : 1,
                              cursor:
                                item.cartQuantity >= item.current_stock
                                  ? "not-allowed"
                                  : "pointer",
                            }}
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="item-price">
                        <div className="price-each">
                          ${item.price.toFixed(2)}
                        </div>
                        <div className="price-total">
                          ${(item.price * item.cartQuantity).toFixed(2)}
                        </div>
                      </div>
                      <button
                        className="remove-btn"
                        onClick={() => removeFromCart(item.id)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="summary-card">
                <h3>Order Summary</h3>
                <div
                  className="auth-notice"
                  style={{
                    fontSize: "0.85rem",
                    marginBottom: "15px",
                    padding: "10px",
                    background: "#f9f9f9",
                    borderRadius: "4px",
                  }}
                >
                  {user ? (
                    <p style={{ margin: 0 }}>
                      Logged in as:{" "}
                      <strong>{user?.signInDetails?.loginId}</strong>
                    </p>
                  ) : (
                    <p style={{ margin: 0 }}>
                      Checking out as guest.
                      <button
                        onClick={() => setPage("login")}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--primary)",
                          textDecoration: "underline",
                          cursor: "pointer",
                          padding: 0,
                          marginLeft: "5px",
                        }}
                      >
                        Sign in
                      </button>{" "}
                      to save your info!
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
                  type="button"
                  className="btn-primary"
                  onClick={handleCheckout}
                  disabled={cart.length === 0 || checkingInventory}
                  style={{
                    width: "100%",
                    marginTop: "20px",
                    opacity: cart.length === 0 || checkingInventory ? 0.7 : 1,
                    cursor:
                      cart.length === 0 || checkingInventory
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  {checkingInventory
                    ? "Checking Stock... 🐾"
                    : "Proceed to Checkout"}
                </button>

                {inventoryError && (
                  <div
                    role="alert"
                    style={{
                      marginTop: "16px",
                      padding: "12px",
                      border: "1px solid #b42318",
                      borderRadius: "6px",
                    }}
                  >
                    {inventoryError}
                  </div>
                )}

                {unavailableItems.length > 0 && (
                  <div
                    role="alert"
                    style={{
                      marginTop: "16px",
                      padding: "12px",
                      border: "1px solid #b42318",
                      borderRadius: "6px",
                    }}
                  >
                    <strong>
                      Some items are no longer available in the requested
                      quantity:
                    </strong>

                    <ul>
                      {unavailableItems.map((item, index) => {
                        const returnedSku =
                          typeof item === "string"
                            ? item
                            : (item.sku ??
                              item.product_id ??
                              item.id ??
                              `item-${index}`);

                        const cartProduct = cart.find(
                          (cartItem) =>
                            String(cartItem.sku) === String(returnedSku),
                        );

                        const productName =
                          typeof item === "object"
                            ? (item.name ??
                              item.product_name ??
                              cartProduct?.name ??
                              returnedSku)
                            : (cartProduct?.name ?? returnedSku);

                        const availableStock =
                          typeof item === "object"
                            ? (item.available_quantity ??
                              item.available_stock ??
                              item.current_stock)
                            : undefined;

                        return (
                          <li key={`${returnedSku}-${index}`}>
                            {productName}
                            {availableStock !== undefined
                              ? ` — only ${availableStock} available`
                              : " — insufficient inventory"}
                          </li>
                        );
                      })}
                    </ul>

                    <p>Please adjust your cart before continuing.</p>
                  </div>
                )}
                <button
                  type="button"
                  className="btn-outline"
                  style={{
                    width: "100%",
                    marginTop: "10px",
                    color: "var(--text)",
                    borderColor: "var(--border)",
                    opacity: checkingInventory ? 0.7 : 1,
                    cursor: checkingInventory ? "not-allowed" : "pointer",
                  }}
                  onClick={() => setPage("products")}
                  disabled={checkingInventory}
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
