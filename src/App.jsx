import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Authenticator, useAuthenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { API_BASE_URL } from './config';
import { slugify } from './utils/slug';
import { cartApi } from './utils/cartApi';
import { peekGuestId, clearGuestId } from './utils/guestId';

// Components
import Announcement from './components/Announcement';
import Header from './components/Header';
import Footer from './components/Footer';

// Pages
import Home from './pages/Home';
import Shop from './pages/Shop';
import ProductDetails from './pages/ProductDetails';
import About from './pages/About';
import Cart from './pages/Cart';
import Login from './pages/Login';
import Profile from './pages/Profile';
import Checkout from './pages/Checkout';

// The rest of the tree navigates by calling setPage('shop') etc. — this
// maps those existing string identifiers onto real routes, so navigation
// actually changes the URL (back/forward, reload, and sharable links all
// work) without having to touch every call site individually.
const PAGE_PATHS = {
  home: '/',
  products: '/shop',
  shop: '/shop',
  about: '/about',
  cart: '/cart',
  login: '/login',
  profile: '/profile',
  checkout: '/checkout',
};

// Reverse mapping, for Header/NavDrawer's active-link highlighting.
const PATH_PAGES = {
  '/': 'home',
  '/shop': 'products',
  '/about': 'about',
  '/cart': 'cart',
  '/login': 'login',
  '/profile': 'profile',
  '/checkout': 'checkout',
};

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const setPage = (pageName) => navigate(PAGE_PATHS[pageName] || '/');
  const currentPage = PATH_PAGES[location.pathname] || location.pathname;

  // 1. GLOBAL STATE
  // The backend is the source of truth for the cart (see cartApi.js) —
  // rawCart is its response shape ({order_id, items: [{product_id,
  // quantity, unit_price, name_snapshot, ...}]}); `cart` below merges that
  // with `products` for display (icon/category/current_stock aren't part
  // of a cart line, only the product catalog).
  const [rawCart, setRawCart] = useState({ order_id: null, status: 'cart', items: [] });
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Fetch products from AWS API Gateway
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/products`, {
          method: 'GET' 
        });

        if (!response.ok) {
          throw new Error(`AWS API returned status: ${response.status}`);
        }

        const rawData = await response.json();
        let parsedData = rawData;

        if (rawData.body) {
          parsedData = typeof rawData.body === 'string' 
            ? JSON.parse(rawData.body) 
            : rawData.body;
        }

        let finalProductsArray = [];

        if (Array.isArray(parsedData)) {
          finalProductsArray = parsedData;
        } else if (parsedData && Array.isArray(parsedData.Items)) {
          finalProductsArray = parsedData.Items;
        } else if (parsedData && Array.isArray(parsedData.products)) {
          finalProductsArray = parsedData.products;
        } else if (parsedData && Array.isArray(parsedData.data)) {
          finalProductsArray = parsedData.data;
        }

        setProducts(finalProductsArray);

      } catch (err) {
        console.error('Failed to fetch products from AWS:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProducts();
  }, []);

  // Load whichever cart the caller already has (guest or logged-in) from
  // the backend on mount — every mutation below re-syncs from its response
  // rather than guessing the new state locally, so this stays correct
  // across tabs/devices too.
  useEffect(() => {
    cartApi.getCart()
      .then(setRawCart)
      .catch((err) => console.error('Failed to load cart:', err));
  }, []);

  const goToProduct = (product) => {
    navigate(`/product/${slugify(product.name)}`);
  };

  const addToCart = async (product, quantity) => {
    try {
      setRawCart(await cartApi.addItem(product.id, quantity));
    } catch (err) {
      console.error('Failed to add to cart:', err);
    }
  };

  const updateCartQuantity = async (productId, newQuantity) => {
    try {
      setRawCart(
        newQuantity <= 0
          ? await cartApi.removeItem(productId)
          : await cartApi.updateItemQuantity(productId, newQuantity)
      );
    } catch (err) {
      console.error('Failed to update cart:', err);
    }
  };

  const removeFromCart = async (productId) => {
    try {
      setRawCart(await cartApi.removeItem(productId));
    } catch (err) {
      console.error('Failed to remove from cart:', err);
    }
  };

  // Cart lines only carry product_id/quantity/unit_price/name_snapshot —
  // merge in the matching catalog product for display fields (icon,
  // category, current_stock) the rest of the app already expects, while
  // keeping id/name/price/cartQuantity authoritative from the cart itself
  // (unit_price is the price actually snapshotted at add-to-cart time).
  const cart = useMemo(() => {
    return rawCart.items.map((item) => {
      const product = products.find((p) => String(p.id) === String(item.product_id));
      return {
        ...product,
        id: item.product_id,
        name: item.name_snapshot,
        price: parseFloat(item.unit_price),
        cartQuantity: item.quantity,
      };
    });
  }, [rawCart, products]);

  const claimGuestCartIfAny = useCallback(async () => {
    const guestId = peekGuestId();
    if (!guestId) return;
    try {
      setRawCart(await cartApi.claimGuestCart(guestId));
      clearGuestId();
    } catch (err) {
      console.error('Failed to claim guest cart:', err);
    }
  }, []);

  const displayProducts = selectedCategory
    ? products.filter((p) => p.category === selectedCategory)
    : products;

  return (
    <Authenticator.Provider>
      <CartAuthSync onAuthenticated={claimGuestCartIfAny} />
      <Announcement />
      <Header currentPage={currentPage} setPage={setPage} cartCount={cart.length} />
      <main>
        <Routes>
          <Route path="/" element={<Home products={products} setPage={setPage} setSelectedCategory={setSelectedCategory} goToProduct={goToProduct} addToCart={addToCart} />} />
          <Route path="/shop" element={
            loading
              ? <div style={{ padding: '60px 20px', textAlign: 'center' }}>Loading products...</div>
              : <Shop products={displayProducts} selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} goToProduct={goToProduct} addToCart={addToCart} />
          } />
          <Route path="/product/:slug" element={<ProductDetails products={products} addToCart={addToCart} />} />
          <Route path="/about" element={<About />} />
          <Route path="/cart" element={<Cart cart={cart} cartOrderId={rawCart.order_id} setPage={setPage} updateCartQuantity={updateCartQuantity} removeFromCart={removeFromCart} />} />
          <Route path="/login" element={<Login setPage={setPage} />} />
          <Route path="/profile" element={<Profile setPage={setPage} />} />
          <Route path="/checkout" element={<Checkout cartItems={cart} setPage={setPage} />} />
          <Route path="*" element={<Home products={products} setPage={setPage} setSelectedCategory={setSelectedCategory} goToProduct={goToProduct} addToCart={addToCart} />} />
        </Routes>
      </main>
      <Footer />
    </Authenticator.Provider>
  );
}

// Runs inside <Authenticator.Provider> (its context isn't visible to the
// component that renders the Provider itself) purely to detect the
// logged-out -> logged-in transition and fire the guest-cart claim exactly
// once when it happens — covers both "logged into an existing account" and
// "just finished signing up".
function CartAuthSync({ onAuthenticated }) {
  const { authStatus } = useAuthenticator((context) => [context.authStatus]);
  const previousStatus = useRef(authStatus);

  useEffect(() => {
    if (previousStatus.current !== 'authenticated' && authStatus === 'authenticated') {
      onAuthenticated();
    }
    previousStatus.current = authStatus;
  }, [authStatus, onAuthenticated]);

  return null;
}