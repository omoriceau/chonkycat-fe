import React, { useState, useEffect, useCallback, useRef } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { Authenticator, useAuthenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";

import { API_BASE_URL } from "./config";
import { slugify } from "./utils/slug";

// Components
import Announcement from "./components/Announcement";
import Header from "./components/Header";
import Footer from "./components/Footer";

// Pages
import Home from "./pages/Home";
import Shop from "./pages/Shop";
import ProductDetails from "./pages/ProductDetails";
import About from "./pages/About";
import Cart from "./pages/Cart";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import Checkout from "./pages/Checkout";
import Success from "./pages/Success";

// Maps existing setPage("shop") style navigation to React Router paths.
const PAGE_PATHS = {
  home: "/",
  products: "/shop",
  shop: "/shop",
  about: "/about",
  cart: "/cart",
  login: "/login",
  profile: "/profile",
  checkout: "/checkout",
  success: "/success",
};

// Used by Header and NavDrawer to determine the active page.
const PATH_PAGES = {
  "/": "home",
  "/shop": "products",
  "/about": "about",
  "/cart": "cart",
  "/login": "login",
  "/profile": "profile",
  "/checkout": "checkout",
  "/success": "success",
};

/**
 * Detects when a customer has changed from logged out to authenticated.
 *
 * This component must be rendered inside Authenticator.Provider because it
 * reads Amplify authentication context.
 */
function CartAuthSync({ onAuthenticated }) {
  const { authStatus, user } = useAuthenticator((context) => [
    context.authStatus,
    context.user,
  ]);

  const previousStatus = useRef(authStatus);

  useEffect(() => {
    if (
      previousStatus.current !== "authenticated" &&
      authStatus === "authenticated"
    ) {
      onAuthenticated(user);
    }

    previousStatus.current = authStatus;
  }, [authStatus, user, onAuthenticated]);

  return null;
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  /**
   * Allows existing components to navigate using values such as:
   * setPage("shop")
   * setPage("cart")
   */
  const setPage = useCallback(
    (pageName) => {
      if (pageName === "login") {
        navigate(PAGE_PATHS.login, {
          state: {
            from: location.pathname,
          },
        });

        return;
      }

      navigate(PAGE_PATHS[pageName] || "/");
    },
    [navigate, location.pathname],
  );

  const currentPage = PATH_PAGES[location.pathname] || location.pathname;

  // Load the saved browser cart when the application starts.
  const [cart, setCart] = useState(() => {
    try {
      const savedCart = localStorage.getItem("chonky_cart");

      return savedCart ? JSON.parse(savedCart) : [];
    } catch (error) {
      console.error("Failed to read the saved cart:", error);
      return [];
    }
  });

  const [products, setProducts] = useState([]);
  const [productsLoaded, setProductsLoaded] = useState(false);
  const [productLoadError, setProductLoadError] = useState(null);
  const [loginBanner, setLoginBanner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [currentOrderId, setCurrentOrderId] = useState(null);

  /**
   * EFFECT 1:
   * Save the cart to localStorage whenever it changes.
   */
  useEffect(() => {
    try {
      localStorage.setItem("chonky_cart", JSON.stringify(cart));
    } catch (error) {
      console.error("Failed to save the cart:", error);
    }
  }, [cart]);

  /**
   * EFFECT 2:
   * Load products once when the application starts.
   */
  useEffect(() => {
    let requestCancelled = false;

    const fetchProducts = async () => {
      setLoading(true);
      setProductLoadError(null);

      try {
        const response = await fetch(`${API_BASE_URL}/products`, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`Product API returned HTTP ${response.status}.`);
        }

        const rawData = await response.json();
        let parsedData = rawData;

        /*
         * Some Lambda/API Gateway responses contain the actual response
         * inside a body property. Support both direct responses and wrapped
         * Lambda responses.
         */
        if (rawData?.body !== undefined) {
          parsedData =
            typeof rawData.body === "string"
              ? JSON.parse(rawData.body)
              : rawData.body;
        }

        let finalProductsArray = [];

        if (Array.isArray(parsedData)) {
          finalProductsArray = parsedData;
        } else if (Array.isArray(parsedData?.Items)) {
          finalProductsArray = parsedData.Items;
        } else if (Array.isArray(parsedData?.products)) {
          finalProductsArray = parsedData.products;
        } else if (Array.isArray(parsedData?.data)) {
          finalProductsArray = parsedData.data;
        } else {
          throw new Error(
            "The product API response did not contain a product array.",
          );
        }

        if (!requestCancelled) {
          setProducts(finalProductsArray);
          setProductsLoaded(true);
        }
      } catch (error) {
        console.error("Failed to fetch products from AWS:", error);

        if (!requestCancelled) {
          setProductLoadError(
            error instanceof Error
              ? error.message
              : "Products could not be loaded.",
          );
        }
      } finally {
        if (!requestCancelled) {
          setLoading(false);
        }
      }
    };

    fetchProducts();

    /*
     * Prevent state updates if App is unmounted while the request is still
     * running.
     */
    return () => {
      requestCancelled = true;
    };
  }, []);

  /**
   * EFFECT 3:
   * Reconcile the saved cart with current data returned by /products.
   *
   * This updates:
   * - price
   * - product name
   * - image URL
   * - category
   * - current stock
   *
   * It preserves the quantity selected by the customer, but reduces the
   * quantity when current stock is lower.
   */
  useEffect(() => {
    if (!productsLoaded) {
      return;
    }

    setCart((previousCart) => {
      const productsById = new Map(
        products.map((product) => [String(product.id), product]),
      );

      return previousCart.flatMap((cartItem) => {
        const currentProduct = productsById.get(String(cartItem.id));

        /*
         * Remove products that no longer exist or are no longer returned
         * by the API.
         */
        if (!currentProduct) {
          return [];
        }

        const currentStock = Number(currentProduct.current_stock ?? 0);

        const requestedQuantity = Number(cartItem.cartQuantity ?? 1);

        // Remove products that are now out of stock.
        if (!Number.isFinite(currentStock) || currentStock <= 0) {
          return [];
        }

        const safeRequestedQuantity =
          Number.isFinite(requestedQuantity) && requestedQuantity > 0
            ? requestedQuantity
            : 1;

        return [
          {
            // Use the latest product information from the API.
            ...currentProduct,

            // Preserve quantity without allowing it to exceed stock.
            cartQuantity: Math.min(safeRequestedQuantity, currentStock),
          },
        ];
      });
    });
  }, [products, productsLoaded]);

  const goToProduct = (product) => {
    if (!product?.name) {
      console.error(
        "Unable to navigate because the product has no name.",
        product,
      );
      return;
    }

    navigate(`/product/${slugify(product.name)}`);
  };

  /**
   * Add a product to the local browser cart.
   *
   * This prevents the cart quantity from exceeding the last known stock
   * value. The backend must still revalidate inventory before payment.
   */
  const addToCart = (product, quantity = 1) => {
    setCart((previousCart) => {
      const stock = Number(product.current_stock ?? 0);
      const requestedQuantity = Number(quantity);

      if (
        !Number.isFinite(stock) ||
        stock <= 0 ||
        !Number.isFinite(requestedQuantity) ||
        requestedQuantity <= 0
      ) {
        return previousCart;
      }

      const existingItem = previousCart.find(
        (item) => String(item.id) === String(product.id),
      );

      if (existingItem) {
        return previousCart.map((item) =>
          String(item.id) === String(product.id)
            ? {
                ...item,
                ...product,
                cartQuantity: Math.min(
                  Number(item.cartQuantity ?? 0) + requestedQuantity,
                  stock,
                ),
              }
            : item,
        );
      }

      return [
        ...previousCart,
        {
          ...product,
          cartQuantity: Math.min(requestedQuantity, stock),
        },
      ];
    });
  };

  /**
   * Update an existing cart item's quantity.
   *
   * The quantity is capped using the item's most recently loaded stock
   * value.
   */
  const updateCartQuantity = (productId, newQuantity) => {
    const requestedQuantity = Number(newQuantity);

    if (!Number.isFinite(requestedQuantity) || requestedQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart((previousCart) =>
      previousCart.map((item) => {
        if (String(item.id) !== String(productId)) {
          return item;
        }

        const currentStock = Number(item.current_stock ?? 0);

        if (!Number.isFinite(currentStock) || currentStock <= 0) {
          return item;
        }

        return {
          ...item,
          cartQuantity: Math.min(requestedQuantity, currentStock),
        };
      }),
    );
  };

  const removeFromCart = (productId) => {
    setCart((previousCart) =>
      previousCart.filter((item) => String(item.id) !== String(productId)),
    );
  };

  /**
   * Clear the local cart after a successful Stripe payment.
   */
  const clearCart = () => {
    setCart([]);
    localStorage.removeItem("chonky_cart");
  };

  const handleAuthenticated = useCallback((user) => {
    const loginId = user?.signInDetails?.loginId;

    setLoginBanner(loginId ? `Welcome back, ${loginId}!` : "Welcome back!");

    window.setTimeout(() => {
      setLoginBanner(null);
    }, 4000);
  }, []);

  const displayProducts = selectedCategory
    ? products.filter((product) => product.category === selectedCategory)
    : products;

  return (
    <Authenticator.Provider>
      <CartAuthSync onAuthenticated={handleAuthenticated} />

      {loginBanner && (
        <div
          role="status"
          style={{
            position: "sticky",
            top: 0,
            zIndex: 1000,
            background: "var(--primary, #e0a93c)",
            color: "#12100e",
            textAlign: "center",
            padding: "10px 20px",
            fontWeight: 600,
            fontSize: "0.9rem",
          }}
        >
          ✅ {loginBanner}
        </div>
      )}

      <Announcement />

      <Header
        currentPage={currentPage}
        setPage={setPage}
        cartCount={cart.reduce(
          (total, item) => total + Number(item.cartQuantity ?? 0),
          0,
        )}
      />

      <main>
        <Routes>
          <Route
            path="/"
            element={
              <Home
                products={products}
                setPage={setPage}
                setSelectedCategory={setSelectedCategory}
                goToProduct={goToProduct}
                addToCart={addToCart}
              />
            }
          />

          <Route
            path="/shop"
            element={
              loading ? (
                <div
                  style={{
                    padding: "60px 20px",
                    textAlign: "center",
                  }}
                >
                  Loading products...
                </div>
              ) : productLoadError ? (
                <div
                  role="alert"
                  style={{
                    padding: "60px 20px",
                    textAlign: "center",
                  }}
                >
                  <h2>Products could not be loaded</h2>
                  <p>{productLoadError}</p>
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                  >
                    Try again
                  </button>
                </div>
              ) : (
                <Shop
                  products={displayProducts}
                  selectedCategory={selectedCategory}
                  setSelectedCategory={setSelectedCategory}
                  goToProduct={goToProduct}
                  addToCart={addToCart}
                />
              )
            }
          />

          <Route
            path="/product/:slug"
            element={
              <ProductDetails products={products} addToCart={addToCart} />
            }
          />

          <Route path="/about" element={<About />} />

          <Route
            path="/cart"
            element={
              <Cart
                cart={cart}
                setPage={setPage}
                updateCartQuantity={updateCartQuantity}
                removeFromCart={removeFromCart}
              />
            }
          />

          <Route path="/login" element={<Login />} />

          <Route path="/profile" element={<Profile setPage={setPage} />} />

          <Route
            path="/checkout"
            element={
              <Checkout
                cartItems={cart}
                setPage={setPage}
                setCurrentOrderId={setCurrentOrderId}
                clearCart={clearCart}
              />
            }
          />

          <Route
            path="/success"
            element={
              <Success
                orderId={currentOrderId}
                clearCart={clearCart}
                setPage={setPage}
              />
            }
          />

          <Route
            path="*"
            element={
              <Home
                products={products}
                setPage={setPage}
                setSelectedCategory={setSelectedCategory}
                goToProduct={goToProduct}
                addToCart={addToCart}
              />
            }
          />
        </Routes>
      </main>

      <Footer />
    </Authenticator.Provider>
  );
}
