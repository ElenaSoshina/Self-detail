import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './ProductsPage.module.css';
import image from '../../assets/shampoo.jpg'
import { products } from '../../data/products';
import { useCart } from '../../context/CartContex';

// Список категорий
const categories = ['Все', 'Мойка', 'Химчистка', 'Полировка', 'Защита', 'Аксессуары', 'Инструменты'];

const ProductsPage: React.FC = () => {
  const [filter, setFilter] = useState('Все');
  // Фильтруем продукты по выбранной категории
  const filtered = filter === 'Все' 
    ? products 
    : products.filter(p => p.category === filter);
  
  const navigate = useNavigate();
  const { addToCart, items } = useCart();
  const [addedAnimation, setAddedAnimation] = useState<Record<string, boolean>>({});

  // Определяем, какие товары уже в корзине
  const isInCart = (productId: string): boolean => {
    return items.some(item => item.id === productId);
  };

  const handleProductClick = (id: number) => {
    navigate(`/product/${id}`);
  };

  const handleAddToCart = (e: React.MouseEvent, product: any) => {
    e.stopPropagation();
    
    // Проверяем, есть ли уже товар в корзине
    if (!isInCart(product.id.toString())) {
      // Добавляем товар в корзину
      addToCart({
        id: product.id.toString(),
        name: product.name,
        price: product.price,
        type: product.category || 'Товар', // используем категорию как тип
        region: '', // пустое поле, так как оно требуется в типе Item
        details: product.description || '',
      });
      
      // Включаем анимацию добавления для этого товара
      setAddedAnimation(prev => ({ ...prev, [product.id]: true }));
      
      // Убираем анимацию через 1.5 секунды, но кнопка останется в состоянии "Добавлено"
      setTimeout(() => {
        setAddedAnimation(prev => ({ ...prev, [product.id]: false }));
      }, 1500);
    }
  };

  return (
    <section className={styles.catalogSection}>
      <h1 className={styles.title}>Каталог товаров</h1>
      <div className={styles.tabsContainer}>
        <div className={styles.tabs}>
          {categories.map(cat => (
            <button
              key={cat}
              className={`${styles.tabBtn} ${filter === cat ? styles.activeTab : ''}`}
              onClick={() => setFilter(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.grid}>
        {filtered.map(p => (
          <div 
            key={p.id} 
            className={styles.card}
            onClick={() => handleProductClick(p.id)}
            style={{ cursor: 'pointer' }}
          >
            <img src={p.image || image} alt={p.name} className={styles.img} />
            <div className={styles.name}>{p.name}</div>
            <div className={styles.price}>{p.price} ₽</div>
            <button 
              className={`${styles.buyBtn} ${(isInCart(p.id.toString()) || addedAnimation[p.id]) ? styles.added : ''}`}
              onClick={(e) => handleAddToCart(e, p)}
            >
              {isInCart(p.id.toString()) ? 'Добавлено ✓' : 'В корзину'}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
};

export default ProductsPage; 