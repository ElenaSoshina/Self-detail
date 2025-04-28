import React from 'react';
import { Link } from 'react-router-dom';
import styles from './CartPage.module.css';

const CartPage: React.FC = () => {
  // Здесь должна быть логика проверки корзины, сейчас всегда пусто
  return (
    <div className={styles.cartPageContainer}>
      <div className={styles.emptyCartMsg}>В корзине ничего нет</div>
      <Link to="/products" className={styles.goToCatalogBtn}>Перейти в каталог</Link>
    </div>
  );
};

export default CartPage; 