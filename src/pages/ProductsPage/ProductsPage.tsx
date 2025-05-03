import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './ProductsPage.module.css';
import image from '../../assets/shampoo.jpg'
import { products } from '../../data/products';
import { useCart } from '../../context/CartContex';

// Структура категорий и подкатегорий
const categoryStructure = {
  'Мойка': ['Шампуни', 'Аппликаторы', 'Губки', 'Полотенца', 'Осушители'],
  'Химчистка': ['Очистители салона', 'Торнадо', 'Пароочистители', 'Средства для кожи', 'Средства для ткани'],
  'Полировка': ['Полироли', 'Абразивы', 'Круги', 'Машинки', 'Аксессуары'],
  'Защита': ['Жидкое стекло', 'Керамика', 'Воски', 'Силанты', 'Пленки'],
  'Расходники': ['Перчатки', 'Распылители', 'Фильтры', 'Щетки', 'Микрофибра'],
  'Мерч': ['Одежда', 'Кепки', 'Наклейки', 'Сувениры', 'Аксессуары']
};

// Список основных категорий
const mainCategories = ['Все', ...Object.keys(categoryStructure)];

const ProductsPage: React.FC = () => {
  const [mainCategory, setMainCategory] = useState('Все');
  const [subCategory, setSubCategory] = useState('');
  
  const navigate = useNavigate();
  const { addToCart, items } = useCart();
  const [addedAnimation, setAddedAnimation] = useState<Record<string, boolean>>({});

  // Фильтрация продуктов
  const filteredProducts = mainCategory === 'Все' 
    ? products 
    : products.filter(p => p.category === mainCategory);
  
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

  // Обработка клика по основной категории
  const handleMainCategoryClick = (category: string) => {
    setMainCategory(category);
    setSubCategory('');
  };

  // Обработка клика по подкатегории
  const handleSubCategoryClick = (subCat: string) => {
    setSubCategory(subCat);
  };

  return (
    <section className={styles.catalogSection}>
      <h1 className={styles.title}>Каталог товаров</h1>
      
      {/* Основные категории */}
      <div className={styles.tabsContainer}>
        <div className={styles.tabs}>
          {mainCategories.map(cat => (
            <button
              key={cat}
              className={`${styles.tabBtn} ${mainCategory === cat ? styles.activeTab : ''}`}
              onClick={() => handleMainCategoryClick(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>
      
      {/* Подкатегории */}
      {mainCategory !== 'Все' && (
        <div className={styles.subCategoriesContainer}>
          <div className={styles.subCategories}>
            <button
              className={`${styles.subCategoryBtn} ${subCategory === '' ? styles.activeSubCategory : ''}`}
              onClick={() => handleSubCategoryClick('')}
            >
              Все {mainCategory}
            </button>
            {categoryStructure[mainCategory as keyof typeof categoryStructure]?.map(subCat => (
              <button
                key={subCat}
                className={`${styles.subCategoryBtn} ${subCategory === subCat ? styles.activeSubCategory : ''}`}
                onClick={() => handleSubCategoryClick(subCat)}
              >
                {subCat}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Сетка товаров */}
      <div className={styles.grid}>
        {filteredProducts.map(p => (
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