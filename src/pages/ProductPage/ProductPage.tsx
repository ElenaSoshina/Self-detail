import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styles from './ProductPage.module.css';
import { useCart } from '../../context/CartContex';
import image from '../../assets/shampoo.jpg'
import image2 from '../../assets/shampoo_2.jpg'
import { products } from '../../data/products';

// Маппинг изображений для временного использования, 
// пока настоящие изображения не будут доступны
const productImages: Record<number, string[]> = {
  1: [image, image2, image],
  2: [image],
  3: [image],
  4: [image],
};

const ProductPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const productId = id ? parseInt(id) : 0;
  
  // Получаем данные о товаре из общего источника данных
  const product = products.find(p => p.id === productId);
  
  const [imgIdx, setImgIdx] = useState(0);
  const { addToCart, items, updateQuantity } = useCart();
  const cartItem = items.find(i => i.id === productId?.toString());
  const [totalPrice, setTotalPrice] = useState(product?.price || 0);
  
  // Определяем массив изображений для текущего товара
  const images = productId ? (productImages[productId] || [image]) : [image];

  // Обновляем общую стоимость при изменении количества товара
  useEffect(() => {
    if (product && cartItem) {
      setTotalPrice(product.price * cartItem.quantity);
    } else if (product) {
      setTotalPrice(product.price);
    }
  }, [cartItem, product]);

  // Разбиваем описание товара на пункты списка
  const getDescriptionItems = (description: string): string[] => {
    if (!description) return [];
    
    // Разбиваем текст на предложения
    const sentences = description.split(/\.\s+/);
    
    // Фильтруем пустые предложения и добавляем точку в конце, если её нет
    return sentences
      .filter(sentence => sentence.trim().length > 0)
      .map(sentence => sentence.trim().endsWith('.') ? sentence.trim() : `${sentence.trim()}.`);
  };

  // Touch-события для свайпа
  const touchStartX = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 40) {
      if (delta < 0) setImgIdx((imgIdx + 1) % images.length);
      else setImgIdx((imgIdx - 1 + images.length) % images.length);
    }
    touchStartX.current = null;
  };

  const handleBack = () => {
    navigate('/products');
  };

  const handleAdd = () => {
    if (!product) return;
    
    addToCart({
      id: productId.toString(),
      name: product.name,
      type: 'Товар', // Используем обобщенный тип, если категория не доступна
      region: '',
      details: product.description,
      price: product.price,
    });
  };
  
  const handleInc = () => {
    if (!product) return;
    updateQuantity(productId.toString(), (cartItem?.quantity || 1) + 1);
  };
  
  const handleDec = () => {
    if (cartItem && cartItem.quantity > 1) {
      updateQuantity(productId.toString(), cartItem.quantity - 1);
    }
  };

  // Форматирование цены с разделителем тысяч
  const formatPrice = (price: number): string => {
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  };

  if (!product) {
    return <div className={styles.notFound}>Товар не найден</div>;
  }

  // Получаем пункты описания
  const descriptionItems = getDescriptionItems(product.description);

  return (
    <div className={styles.productPage}>
      <button className={styles.backBtn} onClick={handleBack}>
        ←
      </button>
      <div className={styles.carousel}>
        <img
          src={images[imgIdx]}
          alt={product.name}
          className={styles.productImg}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        />
        <div className={styles.pagination}>
          {images.map((_, idx) => (
            <span
              key={idx}
              className={imgIdx === idx ? styles.activeDot : styles.dot}
              onClick={() => setImgIdx(idx)}
            />
          ))}
        </div>
      </div>
      <div className={styles.info}>
        <h1 className={styles.name}>{product.name}</h1>
        <div className={styles.price}>{formatPrice(product.price)} ₽</div>
        <div className={styles.descBlock}>
          <h2 className={styles.descTitle}>Описание</h2>
          <ul className={styles.descList}>
            {descriptionItems.map((item, index) => (
              <li key={index} className={styles.descItem}>{item}</li>
            ))}
          </ul>
        </div>
        {!cartItem ? (
          <div className={styles.addBtnWrap}>
            <button className={styles.addBtn} onClick={handleAdd}>Добавить в корзину</button>
          </div>
        ) : (
          <div className={styles.addBtnWrap}>
            <div className={styles.inCartBtn}>
              <span>В корзине</span>
              <div className={styles.inCartBtnSub}>{formatPrice(totalPrice)} ₽</div>
            </div>
            <div className={styles.counterBlock}>
              <button className={styles.counterBtn} onClick={handleDec}>-</button>
              <span className={styles.counter}>{cartItem.quantity}</span>
              <button className={styles.counterBtn} onClick={handleInc}>+</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductPage; 