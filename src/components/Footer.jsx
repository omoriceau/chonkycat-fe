import React from 'react';

export default function Footer() {
  return (
    <footer>
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="logo">
              <div className="logo-paw">🐾</div>
              <div className="logo-text">
                <div className="brand">Chonky Cat</div>
                <div className="tagline">Food For Fat Felines</div>
              </div>
            </div>
            <p className="footer-about">Premium cuisine for distinguished felines. Because every lap cat deserves a throne — and a very full bowl.</p>
          </div>

          <div>
            <div className="footer-col-title">Shop</div>
            <ul className="footer-links">
              <li><a href="#dry">Dry Food</a></li>
              <li><a href="#wet">Wet Food</a></li>
              <li><a href="#treats">Treats</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="footer-copy">© 2026 Chonky Cat. All rights reserved. No cats were put on diets in the making of this website.</div>
          <div className="footer-paw">🐾</div>
        </div>
      </div>
    </footer>
  );
}