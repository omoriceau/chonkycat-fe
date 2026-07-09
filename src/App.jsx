import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Authenticator } from '@aws-amplify/ui-react';
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

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const setPage = (pageName) => navigate(PAGE_PATHS[pageName] || '/');
  const currentPage = PATH_PAGES[location.pathname] || location.pathname;

  // 1. GLOBAL STATE
  const [cart, setCart] = useState([]);
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
  
  const goToProduct = (product) => {
    navigate(`/product/${slugify(product.name)}`);
  };

  const addToCart = (product, quantity) => {
    setCart((prevCart) => {
      const existingItemIndex = prevCart.findIndex((item) => item.id === product.id);
      if (existingItemIndex != -1) {
        const newCart = [...prevCart];
        newCart[existingItemIndex].cartQuantity += quantity;
        return newCart;
      } else {
        return [...prevCart, { ...product, cartQuantity: quantity }];
      }
    });
  };

  const updateCartQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
    } else {
      setCart((prevCart) =>
        prevCart.map((item) =>
          item.id === productId ? { ...item, cartQuantity: newQuantity } : item
        )
      );
    }
  };

  const removeFromCart = (productId) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== productId));
  };

  const displayProducts = selectedCategory
    ? products.filter((p) => p.category === selectedCategory)
    : products;

  return (
    <Authenticator.Provider>
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