import React, { useState } from 'react';
import styles from './Pricing.module.css';
import BookButton from '../ui/BookButton/BookButton';

const Pricing: React.FC = () => {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const toggleDetails = () => {
    setIsDetailsOpen(!isDetailsOpen);
  };

  return (
    <section id="pricing" className={styles.pricing}>
      <h2 className={styles.title}>Тарифы</h2>
      <div className={styles.cardsContainer}>
        <div className={styles.card}>
          <div className={styles.iconWrapper}>
            <span className={styles.icon}>✨</span>
          </div>
          <h3 className={styles.cardTitle}>Тариф "Все включено"</h3>
          <div className={styles.price}>800₽/ч</div>
          <p className={styles.description}>
            В двух словах: есть все для того чтобы помыть авто и сделать хим чистку. С собой можно ничего не брать. Но если вы со своим арсеналом химии и средств - то мы совсем не против этого!
          </p>
          
          <button 
            className={styles.detailsButton}
            onClick={toggleDetails}
          >
            Подробнее
            <span className={`${styles.detailsArrow} ${isDetailsOpen ? styles.detailsArrowOpen : ''}`}>
              ▼
            </span>
          </button>
          
          {isDetailsOpen && (
            <div className={styles.detailsSection}>
              <h4 className={styles.sectionTitle}>Для мойки автомобиля:</h4>
              <ul className={styles.detailsList}>
                <li>АВД (аппарат высокого давления)</li>
                <li>Два пенокомплекта</li>
                <li>Копья, лейка</li>
                <li>Пылесос Панда</li>
                <li>Шампуни (1 и 2 фаза, воск)</li>
                <li>Чернение с апликатором</li>
                <li>Средство для чистки стекол</li>
                <li>Губка и протирочные материалы, щетки</li>
                <li>Воздух под давлением</li>
              </ul>
              
              <h4 className={styles.sectionTitle}>Для химчистки:</h4>
              <ul className={styles.detailsList}>
                <li>Моющий пылесос Karcher</li>
                <li>Торнадор</li>
                <li>Средство для чистки кожи</li>
                <li>Кондиционер кожи</li>
                <li>Щетки для чистки кожи, кисточки</li>
                <li>Пенообразователь</li>
                <li>Фибра</li>
              </ul>
              
              <h4 className={styles.sectionTitle}>Для полировки:</h4>
              <ul className={styles.detailsList}>
                <li>Роторная полировочная машинка</li>
                <li>Подложки 125, 150, 180 мм</li>
                <li>Фибра</li>
                <li>Малярный скотч</li>
              </ul>
              
              <p className={styles.note}>
                Круги и пасту приобретайте отдельно, в стоимость пока это не входит.
              </p>
            </div>
          )}
        </div>
      </div>

      <BookButton />
    </section>
  );
};

export default Pricing; 