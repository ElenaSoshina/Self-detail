import React, { useState } from 'react';
import styles from './ProductsPage.module.css';

const allProducts = [
  { id: 1, name: 'Автошампунь', price: 350, img: '/img/shampoo.jpg', category: 'Мойка' },
  { id: 2, name: 'Губка для мойки', price: 120, img: '/img/sponge.jpg', category: 'Мойка' },
  { id: 3, name: 'Средство для химчистки', price: 490, img: '/img/cleaner.jpg', category: 'Химчистка' },
  { id: 4, name: 'Полировочная паста', price: 700, img: '/img/polish.jpg', category: 'Полировка' },
  // ...добавь еще товаров
];

const categories = ['Все', 'Мойка', 'Химчистка', 'Полировка'];

const ProductsPage: React.FC = () => {
  const [filter, setFilter] = useState('Все');
  const filtered = filter === 'Все' ? allProducts : allProducts.filter(p => p.category === filter);

  return (
    <section className={styles.catalogSection}>
      <h1 className={styles.title}>Каталог товаров</h1>
      <div className={styles.filters}>
        {categories.map(cat => (
          <button
            key={cat}
            className={`${styles.filterBtn} ${filter === cat ? styles.active : ''}`}
            onClick={() => setFilter(cat)}
          >
            {cat}
          </button>
        ))}
      </div>
      <div className={styles.grid}>
        {filtered.map(p => (
          <div className={styles.card} key={p.id}>
            <img src={p.img} alt={p.name} className={styles.img} />
            <div className={styles.name}>{p.name}</div>
            <div className={styles.price}>{p.price} ₽</div>
            <button className={styles.buyBtn}>В корзину</button>
          </div>
        ))}
      </div>
    </section>
  );
};

export default ProductsPage; 