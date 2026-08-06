// pages/About.jsx
import React from 'react';

export default function About() {
  return (
    <div className="page visible">
      <section className="about-section">
        <div className="container">
          <div className="about-grid">
            <div className="about-img">
              <img src="/sir-chonk.png" alt="Sir Chonksworth III" />
            </div>
            <div>
              <div className="about-eyebrow">Our Story</div>
              <h2 className="about-title">Founded by<br /><em>Sir Chonksworth III</em></h2>
              <p className="about-text">Chonky Cat believes every feline deserves a meal worthy of their majestic fluff and undeniable confidence.</p>
              <p className="about-text">We don't believe in "diet food." We believe in food that celebrates cats for exactly who they are — dignified, rotund, and utterly magnificent.</p>
              <div className="about-sig">— Sir Chonksworth III, Founder & Chief Taste Tester</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}