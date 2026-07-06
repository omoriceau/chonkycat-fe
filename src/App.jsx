import React, { useState, useEffect } from 'react';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css'; 

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

export default function App() {
  // 1. GLOBAL STATE
  const [page, setPage] = useState('home');
  const [cart, setCart] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [currentOrderId, setCurrentOrderId] = useState(null);

  // Fetch products from AWS API Gateway
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const API_URL = 'https://ivop33ifl3.execute-api.us-east-1.amazonaws.com/Prod/products';
        const response = await fetch(API_URL, {
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
    const normalizedProduct = {
      ...product,
      imageKey: product.image_url ? product.image_url.replace('img/', '') : null
    };
    setSelectedProduct(normalizedProduct);
    setPage('product');
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

  const renderPage = () => {
    if (loading && page === 'products') return <div style={{ padding: '60px 20px', textAlign: 'center' }}>Loading products...</div>;
    
    const displayProducts = selectedCategory 
      ? products.filter((p) => p.category === selectedCategory)
      : products;

    switch (page) {
      case 'home': return <Home products={products} setPage={setPage} setSelectedCategory={setSelectedCategory} goToProduct={goToProduct} addToCart={addToCart} />;
      case 'products': return <Shop products={displayProducts} selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} goToProduct={goToProduct} addToCart={addToCart} />;
      case 'product': return <ProductDetails product={selectedProduct} addToCart={addToCart} setPage={setPage} />;
      case 'about': return <About />;
      case 'cart': return <Cart cart={cart} setPage={setPage} updateCartQuantity={updateCartQuantity} removeFromCart={removeFromCart} setCurrentOrderId={setCurrentOrderId}/>
      case 'login': return <Login setPage={setPage} />;
      case 'profile': return <Profile setPage={setPage} />;
      case 'checkout': return <Checkout cartItems={cart} setPage={setPage} currentOrderId={currentOrderId}/>;
      default: return <Home setPage={setPage} />;
    }
  };

  return (
    <Authenticator.Provider>
      <Announcement />
      <Header currentPage={page} setPage={setPage} cartCount={cart.length} />
      <main>{renderPage()}</main>
      <Footer />
    </Authenticator.Provider>
  );
}
