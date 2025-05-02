import React from 'react';
import styles from './Hero.module.css';
import BookButton from '../ui/BookButton/BookButton';

const Hero: React.FC = () => {
  return (
    <section className={styles.heroSection}>
      <div className={styles.heroBg}></div>
      <div className={styles.heroContent}>
        <h1 className={styles.heroTitle}>
          <span className={styles.gradientText}>Детейлинг самообслуживания</span>
        </h1>
        <p className={styles.heroDescription}>
          Почасовая аренда полностью оборудованного бокса для самостоятельного ухода за авто.<br />
        </p>
        <BookButton />
      </div>
    </section>
  );
};

export default Hero; 