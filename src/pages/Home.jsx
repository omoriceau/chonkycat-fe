import { useMemo } from "react";
import ProductCard from "../components/ProductCard";

export default function Home({
  products,
  setPage,
  setSelectedCategory,
  addToCart,
  goToProduct,
}) {
  // Create a randomized list of featured products from live AWS data
  const featured = useMemo(() => {
    return [...products].sort(() => 0.5 - Math.random()).slice(0, 4);
  }, [products]);

  // Dynamically calculate inventory counts from live data. `value` is the
  // exact product.category string stored in the DB (see chonky-products
  // table); `name` is just the display label — kept separate since the DB
  // uses the singular "Treat", not "Snacks"/"Treats".
  const categories = [
    {
      name: "Dry Food",
      value: "Dry Food",
      icon: "🥣",
      count: products.filter((p) => p.category === "Dry Food").length,
    },
    {
      name: "Wet Food",
      value: "Wet Food",
      icon: "🫙",
      count: products.filter((p) => p.category === "Wet Food").length,
    },
    {
      name: "Treats",
      value: "Treat",
      icon: "🐡",
      count: products.filter((p) => p.category === "Treat").length,
    },
  ];

  const hallOfFame = [
    {
      name: "Sir Fluffington",
      owner: "Margaret T.",
      icon: "😺",
      stars: "★★★★★",
    },
    {
      name: "Lord Butterscotch",
      owner: "James W.",
      icon: "🐱",
      stars: "★★★★★",
    },
    { name: "Duchess Pudding", owner: "Sarah K.", icon: "😸", stars: "★★★★★" },
    { name: "Baron Von Chonk", owner: "Dave P.", icon: "🙀", stars: "★★★★★" },
  ];

  return (
    <>
      {/* HERO */}
      <section className="hero">
        <div className="hero-bg-ring"></div>
        <div className="hero-deco-line"></div>
        <div className="hero-inner container">
          <div>
            <div className="hero-badge">
              <span>⭐ #1 Premium Cat Food Brand 2026</span>
            </div>
            <h1>
              Food For
              <br />
              <em>Distinguished</em>
              <br />
              Chonks
            </h1>
            <p className="hero-sub">
              Premium recipes crafted for cats who appreciate the finer things
              in life. Because every lap cat deserves a throne — and a full
              bowl.
            </p>
            <div className="hero-cta">
              <button
                className="btn-primary"
                onClick={() => setPage("products")}
              >
                Shop Dry Food
              </button>
              <button
                className="btn-outline"
                onClick={() => setPage("products")}
              >
                Shop Wet Food
              </button>
            </div>
            <div className="hero-stats">
              <div>
                <div className="stat-num">12k+</div>
                <div className="stat-lbl">Happy Chonks</div>
              </div>
              <div>
                <div className="stat-num">4.9★</div>
                <div className="stat-lbl">Average Rating</div>
              </div>
              <div>
                <div className="stat-num">6</div>
                <div className="stat-lbl">Premium Blends</div>
              </div>
            </div>
          </div>
          <div className="hero-image-wrap">
            <div className="hero-image-frame">
              <img
                src="/chonky-cat.png"
                alt="Chonky cat"
                style={{ maxWidth: "100%", height: "auto" }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* TRUST BAR */}
      <div className="trust-bar">
        <div className="trust-inner">
          <div className="trust-item">
            <div className="trust-icon">🥣</div>
            <div>
              <div className="trust-title">Rich Flavors</div>
              <div className="trust-desc">Every bite is a taste of luxury</div>
            </div>
          </div>
          <div className="trust-item">
            <div className="trust-icon">🐟</div>
            <div>
              <div className="trust-title">Premium Fish</div>
              <div className="trust-desc">Real ingredients, no fillers</div>
            </div>
          </div>
          <div className="trust-item">
            <div className="trust-icon">👑</div>
            <div>
              <div className="trust-title">Luxury Cat Dining</div>
              <div className="trust-desc">Approved by 9/10 lazy cats</div>
            </div>
          </div>
        </div>
      </div>

      {/* FEATURED PRODUCTS */}
      <section className="featured">
        <div className="container">
          <div className="section-header">
            <span className="section-eyebrow">Chef's Selection</span>
            <h2 className="section-title">
              Featured <em>Products</em>
            </h2>
            <div className="section-rule"></div>
          </div>
          <div className="products-grid">
            {featured.map((product) => (
              <ProductCard
                key={product.id}
                {...product}
                onClick={() => goToProduct(product)}
                onAddToCart={() => addToCart(product, 1)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* SHOP BY CATEGORY */}
      <section className="categories">
        <div className="container">
          <div className="section-header">
            <span className="section-eyebrow">The Menu</span>
            <h2 className="section-title">
              Shop By <em>Category</em>
            </h2>
            <div className="section-rule"></div>
          </div>
          <div className="cat-grid">
            {categories.map((cat, i) => (
              <div
                key={i}
                className="cat-card"
                onClick={() => {
                  setSelectedCategory(cat.value);
                  setPage("products");
                }}
              >
                <div className="cat-icon">{cat.icon}</div>
                <div className="cat-name">{cat.name}</div>
                <div className="cat-count">{cat.count}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HALL OF FAME */}
      <section className="hall-of-fame">
        <div className="container">
          <div className="section-header">
            <span className="section-eyebrow">Our Community</span>
            <h2 className="section-title">
              Chonky Hall <em>of Fame</em>
            </h2>
            <div className="section-rule"></div>
          </div>
          <div className="hof-grid">
            {hallOfFame.map((cat, i) => (
              <div key={i} className="hof-card">
                <div className="hof-img">{cat.icon}</div>
                <div className="hof-info">
                  <div className="hof-catname">{cat.name}</div>
                  <div className="hof-owner">Owner: {cat.owner}</div>
                  <div className="hof-stars">{cat.stars}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* NEWSLETTER */}
      <section className="newsletter">
        <div className="container">
          <h2>
            Get Exclusive <em>Chonk Deals</em>
          </h2>
          <p>
            New flavors, insider discounts, and chonky cat content delivered
            straight to your inbox.
          </p>
          <div className="nl-form">
            <input type="email" placeholder="youremail@example.com" />
            <button>Subscribe</button>
          </div>
          <div className="nl-note">
            No spam. Only premium chonk content. Unsubscribe anytime.
          </div>
        </div>
      </section>
    </>
  );
}
