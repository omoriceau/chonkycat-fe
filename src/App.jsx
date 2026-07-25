import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Authenticator, useAuthenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { API_BASE_URL } from './config';
import { slugify } from './utils/slug';

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
import Success from './pages/Success';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  // Login needs to know where to send the user back to afterward — capture
  // wherever they currently are as router state rather than always landing
  // on a fixed page (see Login.jsx's AuthenticatedRedirect).
  const setPage = (pageName) => {
    if (pageName === 'login') {
      navigate(PAGE_PATHS.login, { state: { from: location.pathname } });
    } else {
      navigate(PAGE_PATHS[pageName] || '/');
    }
  };
  const currentPage = PATH_PAGES[location.pathname] || location.pathname;

  // 1. GLOBAL STATE - Initializing from localStorage
  const [cart, setCart] = useState(() => {
    const savedCart = localStorage.getItem('chonky_cart');
    return savedCart ? JSON.parse(savedCart) : [];
  });
  const [products, setProducts] = useState([]);
  const [loginBanner, setLoginBanner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [currentOrderId, setCurrentOrderId] = useState(null);

  // Auto-save to localStorage whenever the cart changes
  useEffect(() => {
    localStorage.setItem('chonky_cart', JSON.stringify(cart));
  }, [cart]);

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

  const goToProduct = (product) => {
    navigate(`/product/${slugify(product.name)}`);
  };

  // 3. Cart Manipulation Functions
  const addToCart = (product, quantity) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      if (existingItem) {
        return prevCart.map(item => 
          item.id === product.id 
            ? { ...item, cartQuantity: item.cartQuantity + quantity }
            : item
        );
      }
      return [...prevCart, { ...product, cartQuantity: quantity }];
    });
  };

  const updateCartQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prevCart => 
      prevCart.map(item => 
        item.id === productId ? { ...item, cartQuantity: newQuantity } : item
      )
    );
  };

  const removeFromCart = (productId) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId));
  };

  // 4. Expose this to clear the cart after a successful Stripe payment
  const clearCart = () => {
    setCart([]);
    localStorage.removeItem('chonky_cart');
  };

  // 5. Authentication (No cart merging required)
  const handleAuthenticated = useCallback((user) => {
    const loginId = user?.signInDetails?.loginId;
    setLoginBanner(loginId ? `Welcome back, ${loginId}!` : 'Welcome back!');
    setTimeout(() => setLoginBanner(null), 4000);
  }, []);

  const displayProducts = selectedCategory
    ? products.filter((p) => p.category === selectedCategory)
    : products;

  return (
    <Authenticator.Provider>
      <CartAuthSync onAuthenticated={handleAuthenticated} />
      {loginBanner && (
        <div
          role="status"
          style={{
            position: 'sticky', top: 0, zIndex: 1000,
            background: 'var(--primary, #e0a93c)', color: '#12100e',
            textAlign: 'center', padding: '10px 20px',
            fontWeight: 600, fontSize: '0.9rem',
          }}
        >
          ✅ {loginBanner}
        </div>
      )}
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
          <Route path="/cart" element={<Cart cart={cart} setPage={setPage} updateCartQuantity={updateCartQuantity} removeFromCart={removeFromCart} />} />
          <Route path="/login" element={<Login />} />
          <Route path="/profile" element={<Profile setPage={setPage} />} />
          <Route path="/checkout" element={<Checkout cartItems={cart} setPage={setPage} />} />
          <Route path="*" element={<Home products={products} setPage={setPage} setSelectedCategory={setSelectedCategory} goToProduct={goToProduct} addToCart={addToCart} />} />
        </Routes>
      </main>
      <Footer />
    </Authenticator.Provider>
  );

// Runs inside <Authenticator.Provider> (its context isn't visible to the
// component that renders the Provider itself) purely to detect the
// logged-out -> logged-in transition and fire onAuthenticated exactly once
// when it happens — covers both "logged into an existing account" and
// "just finished signing up".
function CartAuthSync({ onAuthenticated }) {
  const { authStatus, user } = useAuthenticator((context) => [context.authStatus, context.user]);
  const previousStatus = useRef(authStatus);

  useEffect(() => {
    if (previousStatus.current !== 'authenticated' && authStatus === 'authenticated') {
      onAuthenticated(user);
    }
    previousStatus.current = authStatus;
  }, [authStatus, user, onAuthenticated]);

  return null;
}
}
