import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styles from './ProductPage.module.css';
import { useCart } from '../../context/CartContex';
import { Item } from '../../types/item';
import image from '../../assets/shampoo.jpg'
import image2 from '../../assets/shampoo_2.jpg'
import { products } from '../../data/products';

const mockProducts: Item[] = [
  {
    id: '1',
    name: 'Автошампунь',
    type: 'Химия',
    region: 'Россия',
    details: 'Эффективный автошампунь для ручной и бесконтактной мойки. Не повреждает ЛКП, легко смывается водой. Обеспечивает густую пену, быстро удаляет загрязнения, подходит для всех типов кузова. Не оставляет разводов, придаёт блеск и защищает поверхность от повторного загрязнения. Рекомендуется для регулярного ухода за автомобилем.',
    price: 350,
  },
  {
    id: '2',
    name: 'Губка для мойки',
    type: 'Аксессуары',
    region: 'Китай',
    details: 'Мягкая губка для бережной мойки кузова. Не царапает лакокрасочное покрытие, отлично впитывает воду и пену. Идеально подходит для ручной мойки, легко промывается и быстро сохнет. Удобная форма обеспечивает комфортное использование даже в труднодоступных местах.',
    price: 120,
  },
  {
    id: '3',
    name: 'Средство для химчистки',
    type: 'Химия',
    region: 'Германия',
    details: 'Профессиональное средство для глубокой чистки салона и обивки. Эффективно удаляет сложные пятна, запахи и освежает тканевые и кожаные поверхности. Безопасно для всех материалов, не оставляет разводов и липкости. Подходит для регулярного использования и восстановления первоначального вида салона.',
    price: 490,
  },
];

const mockImages: Record<string, string[]> = {
  '1': [image, image2, image],
  '2': [image],
  '3': [image],
};

const ProductPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const product = products.find(p => p.id === Number(id));
  const [selectedId, setSelectedId] = useState('1');
  const productData = mockProducts.find(p => p.id === selectedId)!;
  const images = mockImages[selectedId] || [];
  const { addToCart, items, updateQuantity } = useCart();
  const cartItem = items.find(i => i.id === selectedId);
  const [imgIdx, setImgIdx] = useState(0);

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
    addToCart({
      id: selectedId,
      name: productData.name,
      type: productData.type,
      region: productData.region,
      details: productData.details,
      price: productData.price,
    });
  };
  const handleInc = () => {
    updateQuantity(selectedId, (cartItem?.quantity || 1) + 1);
  };
  const handleDec = () => {
    if (cartItem && cartItem.quantity > 1) {
      updateQuantity(selectedId, cartItem.quantity - 1);
    }
  };

  if (!product) {
    return <div>Товар не найден</div>;
  }

  return (
    <div className={styles.productPage}>
      <button className={styles.backBtn} onClick={handleBack}>
        ←
      </button>
      <div className={styles.carousel}>
        <img
          src={images[imgIdx]}
          alt={productData.name}
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
        <div className={styles.price}>{product.price} ₽</div>
        <div className={styles.descBlock}>
          <h2 className={styles.descTitle}>Описание</h2>
          <p className={styles.desc}>{product.description}</p>
        </div>
        {!cartItem ? (
          <div className={styles.addBtnWrap}>
            <button className={styles.addBtn} onClick={handleAdd}>Добавить в корзину</button>
          </div>
        ) : (
          <div className={styles.addBtnWrap}>
            <div className={styles.inCartBtn}>
              <span>В корзине</span>
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