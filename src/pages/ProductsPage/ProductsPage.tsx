import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './ProductsPage.module.css';
import image from '../../assets/shampoo.jpg'
import { products } from '../../data/products';

const allProducts = [
    { 
      id: 1, 
      name: 'Автошампунь', 
      price: 350, 
      img: image, 
      category: 'Мойка',
      description: 'Эффективный автошампунь для ручной и бесконтактной мойки. Не повреждает ЛКП, легко смывается водой. Обеспечивает густую пену, быстро удаляет загрязнения, подходит для всех типов кузова. Не оставляет разводов, придаёт блеск и защищает поверхность от повторного загрязнения. Рекомендуется для регулярного ухода за автомобилем.'
    },
    { id: 2, name: 'Губка для мойки', price: 120, img: '/img/sponge.jpg', category: 'Мойка' },
    { id: 3, name: 'Средство для химчистки', price: 490, img: '/img/cleaner.jpg', category: 'Химчистка' },
    { id: 4, name: 'Полировочная паста', price: 700, img: '/img/polish.jpg', category: 'Полировка' },
  // ...добавь еще товаров
];

const categories = ['Все', 'Мойка', 'Химчистка', 'Полировка'];

const ProductsPage: React.FC = () => {
  const [filter, setFilter] = useState('Все');
  const filtered = filter === 'Все' ? allProducts : allProducts.filter(p => p.category === filter);
  const navigate = useNavigate();

  const handleProductClick = (id: number) => {
    navigate(`/product/${id}`);
  };

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
          <div 
            key={p.id} 
            className={styles.card}
            onClick={() => handleProductClick(p.id)}
            style={{ cursor: 'pointer' }}
          >
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