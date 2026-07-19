export default function NavDrawer({ currentPage, setPage, cartCount, onClose }) {
  const handleNavClick = (page) => {
    setPage(page);
    onClose();
  };

  return (
    <nav className="mobile-nav open" style={{ display: 'flex' }}>
      <button className="mobile-nav-close" onClick={onClose}>
        ✕ Close
      </button>
      <ul>
        <li><a href="#" onClick={(e) => { e.preventDefault(); handleNavClick('home'); }}>Home</a></li>
        <li><a href="#" onClick={(e) => { e.preventDefault(); handleNavClick('products'); }}>Shop</a></li>
        <li><a href="#" onClick={(e) => { e.preventDefault(); handleNavClick('about'); }}>About</a></li>
        <li><a href="#" onClick={(e) => { e.preventDefault(); onClose(); }}>Reviews</a></li>
        <li><a href="#" onClick={(e) => { e.preventDefault(); onClose(); }}>FAQ</a></li>
        <li><a href="#" onClick={(e) => { e.preventDefault(); onClose(); }}>Contact</a></li>
      </ul>
    </nav>
  );
}