import React from 'react';
import styles from './ProductPreviewSection.module.css';
import { Link } from 'react-router-dom';

const products = [
  { id: 1, name: 'Автошампунь', price: 350, img: '/img/shampoo.jpg' },
  { id: 2, name: 'Губка для мойки', price: 120, img: '/img/sponge.jpg' },
  { id: 3, name: 'Средство для химчистки', price: 490, img: '/img/cleaner.jpg' },
  { id: 4, name: 'Микрофибра', price: 200, img: '/img/microfiber.jpg' },
  { id: 5, name: 'Полироль для пластика', price: 310, img: '/img/polish.jpg' },
];

const ProductPreviewSection: React.FC = () => {
  return (
    <section className={styles.section} id="products">
      <h2 className={styles.title}>Товары для детейлинга</h2>
      <div className={styles.productsScroll}>
        {products.map(p => (
          <div className={styles.card} key={p.id}>
            <img src={p.img} alt={p.name} className={styles.img} />
            <div className={styles.name}>{p.name}</div>
            <div className={styles.price}>{p.price} ₽</div>
          </div>
        ))}
      </div>
      <Link to="/products" className={styles.allBtn}>Смотреть все товары</Link>
    </section>
  );
};

export default ProductPreviewSection;
