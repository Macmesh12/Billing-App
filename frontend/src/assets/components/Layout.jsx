import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../styles/general.css';

const Layout = ({ children, title = 'Billing App' }) => {
  const location = useLocation();
  
  React.useEffect(() => {
    document.title = title;
  }, [title]);

  const isActive = (path) => {
    return location.pathname === path ? 'nav-link active' : 'nav-link';
  };

  return (
    <div className="billing-app">
      <header className="app-header">
        <h1>Billing App</h1>
        <nav className="app-nav" aria-label="Main navigation">
          <Link to="/" className={isActive('/')}>Dashboard</Link>
          <Link to="/invoice" className={isActive('/invoice')}>Invoice</Link>
          <Link to="/receipt" className={isActive('/receipt')}>Receipt</Link>
          <Link to="/waybill" className={isActive('/waybill')}>Waybill</Link>
        </nav>
      </header>
      <main className="app-main">
        {children}
      </main>
    </div>
  );
};

export default Layout;