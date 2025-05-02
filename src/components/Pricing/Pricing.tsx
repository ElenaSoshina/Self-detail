import React from 'react';
import styles from './Pricing.module.css';
import BookButton from '../ui/BookButton/BookButton';

const Pricing: React.FC = () => {
  return (
    <section id="pricing" className={styles.pricing}>
      <h2 className={styles.title}>Тарифы</h2>
      <div className={styles.cardsContainer}>
        <div className={styles.card}>
          <div className={styles.iconWrapper}>
            <span className={styles.icon}>💦</span>
          </div>
          <h3 className={styles.cardTitle}>Тариф "мойка авто"</h3>
          <div className={styles.price}>800₽/ч</div>
          <p className={styles.description}>
            Это именно про мойку автомобиля, вы пользуетесь АВД (аппаратом высокого давления), пенокомплектами, автошампунем, воском, водсгоном, губками, тряпками, пылесосом и тд. Все это включено в тариф.
          </p>
        </div>
        
        <div className={styles.card}>
          <div className={styles.iconWrapper}>
            <span className={styles.icon}>🔌</span>
          </div>
          <h3 className={styles.cardTitle}>Тариф "сухой пост"</h3>
          <div className={styles.price}>500₽/ч</div>
          <p className={styles.description}>
            Это то же самое помещение, просто на данном тарифе включено в стоимость розетка 220V и воздух под давлением. Вы можете заниматся чем угодно со своими средствами и оборудованием. Например подкрасить какие то сколы на кузове, или отполировать фары да мало ли что можно делать со своей любимой ласточкой?
          </p>
        </div>
        
        <div className={styles.card}>
          <div className={styles.iconWrapper}>
            <span className={styles.icon}>🧽</span>
          </div>
          <h3 className={styles.cardTitle}>Тариф "хим чистка"</h3>
          <div className={styles.price}>800₽/ч</div>
          <p className={styles.description}>
            В тариф включено - торнадор, моющий пылесос и средство для химчистки тканевых поверхностей, средвтво для хим чистки кожи, щетки, фибра.
          </p>
        </div>
        
        <div className={styles.card}>
          <div className={styles.iconWrapper}>
            <span className={styles.icon}>✨</span>
          </div>
          <h3 className={styles.cardTitle}>Тариф "полировка"</h3>
          <div className={styles.price}>800₽/ч</div>
          <p className={styles.description}>
            На этом тарифе мы вам предоставим полировочную машинку (роторную), подложки 125, 150, 180мм, средства для хим чистки кузова, фибра. Внимание - паста и поролоновые круги это ваши расходники, вы можете приходить со своими или приобретать у нас, это отдельно, в тариф пока не получается вложить.
          </p>
        </div>
      </div>

      <BookButton />
    </section>
  );
};

export default Pricing; 