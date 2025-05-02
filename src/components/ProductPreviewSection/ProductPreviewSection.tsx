import React from 'react';
import styles from './ProductPreviewSection.module.css';
import { Link } from 'react-router-dom';
import image from '../../assets/shampoo.jpg'

const products = [
  { id: 1, name: 'Автошампунь', price: 350, img: image },
  { id: 2, name: 'Губка для мойки', price: 120, img: '/img/sponge.jpg' },
  { id: 3, name: 'Средство для химчистки', price: 490, img: '/img/cleaner.jpg' },
  { id: 4, name: 'Микрофибра', price: 200, img: '/img/microfiber.jpg' },
  { id: 5, name: 'Полироль для пластика', price: 310, img: '/img/polish.jpg' },
];

const ProductPreviewSection: React.FC = () => {
  return (
    <section className={styles.section} id="products">
    <h2 className={styles.title}>Товары для детейлинга</h2>
      <div className={styles.carouselContainer}>
        <div className={styles.carouselTrack}>
      {products.map(p => (
            p.name === 'Автошампунь' ? (
              <Link to={`/product/${p.id}`} className={styles.card} key={p.id}>
                <img src={p.img} alt={p.name} className={styles.img} />
                <div className={styles.name}>{p.name}</div>
                <div className={styles.price}>{p.price} ₽</div>
              </Link>
            ) : (
        <div className={styles.card} key={p.id}>
          <img src={p.img} alt={p.name} className={styles.img} />
          <div className={styles.name}>{p.name}</div>
          <div className={styles.price}>{p.price} ₽</div>
        </div>
            )
      ))}
    </div>
      </div>
      
      <Link to="/products" className={styles.allBtn}>
        <svg className={styles.buttonIcon} width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 22C9.55228 22 10 21.5523 10 21C10 20.4477 9.55228 20 9 20C8.44772 20 8 20.4477 8 21C8 21.5523 8.44772 22 9 22Z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M20 22C20.5523 22 21 21.5523 21 21C21 20.4477 20.5523 20 20 20C19.4477 20 19 20.4477 19 21C19 21.5523 19.4477 22 20 22Z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M1 1H5L7.68 14.39C7.77144 14.8504 8.02191 15.264 8.38755 15.5583C8.75318 15.8526 9.2107 16.009 9.68 16H19.4C19.8693 16.009 20.3268 15.8526 20.6925 15.5583C21.0581 15.264 21.3086 14.8504 21.4 14.39L23 6H6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        В каталог
      </Link>
  </section>
);
};

export default ProductPreviewSection; 
