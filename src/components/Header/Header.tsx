import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import styles from './Header.module.css';
import { Search } from '../Search/Search';
import Cart from '../Cart/Cart';
import logo from '../../assets/self-detail-logo.png';

export const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  const handleMenuClick = (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    e.preventDefault();
    
    if (sectionId === 'products') {
      navigate('/products');
    } else if (sectionId === 'cart') {
      navigate('/cart');
    } else {
      if (location.pathname !== '/') {
        navigate('/');
        setTimeout(() => {
          const section = document.getElementById(sectionId);
          if (section) {
            section.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
      } else {
        const section = document.getElementById(sectionId);
        if (section) {
          section.scrollIntoView({ behavior: 'smooth' });
        }
      }
    }
    setIsMenuOpen(false);
  };

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        {/* ──────── LEFT: burger + nav ──────── */}
        <div className={styles.left}>
          <button
            className={`${styles.burgerBtn} ${isMenuOpen ? styles.active : ''}`}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Открыть меню"
          >
            <span /><span /><span />
          </button>

          <nav className={`${styles.nav} ${isMenuOpen ? styles.navActive : ''}`}>
            <a href="#hero" onClick={e => handleMenuClick(e, 'hero')}>Главная</a>
            <a href="#how-it-works" onClick={e => handleMenuClick(e, 'how-it-works')}>Как мы работаем</a>
            <a href="#pricing" onClick={e => handleMenuClick(e, 'pricing')}>Тарифы</a>
            {/* <a href="#products" onClick={e => handleMenuClick(e, 'products')}>Каталог товаров</a> */}
            <a href="#faq" onClick={e => handleMenuClick(e, 'faq')}>FAQ</a>
          </nav>
        </div>

        {/* ──────── CENTER: logo ──────── */}
        <Link to="/" className={styles.center}>
          <img src={logo} alt="Detel Sam" className={styles.logo} />
        </Link>

        {/* ──────── RIGHT: search + cart + profile ──────── */}
        <div className={styles.right}>
          <button
            className={styles.searchBtn}
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            aria-label="Поиск"
          >
            <div className={styles.searchIcon} />
          </button>
          {/* <Cart /> */}
          <Link to="/profile" className={styles.profileBtn} aria-label="Личный кабинет">
            <div className={styles.profileIcon} />
          </Link>
          <Link to="/admin" className={styles.adminBtn} aria-label="Админ">
            <div className={styles.adminIcon} />
          </Link>
        </div>
      </div>

      <Search isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </header>
  );
};

export default Header;
