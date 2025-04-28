import React from 'react';
import styles from './HowItWorks.module.css';

const HowItWorks: React.FC = () => {
  return (
    <section id="how-it-works" className={styles.howItWorks}>
      <h2 className={styles.title}>Как мы работаем?</h2>
      
      <div className={styles.stepsContainer}>
        <div className={styles.step}>
          <div className={styles.stepIcon}>📅</div>
          <div className={styles.stepNumber}>1</div>
          <div className={styles.stepContent}>
            <h3>Выберите время</h3>
            <p>Выберите удобное для вас время посещения и забронируйте бокс.</p>
          </div>
        </div>
        
        <div className={styles.connector}></div>
        
        <div className={styles.step}>
          <div className={styles.stepIcon}>💸</div>
          <div className={styles.stepNumber}>2</div>
          <div className={styles.stepContent}>
            <h3>Выберите тариф</h3>
            <p>Определитесь с подходящим тарифом для ваших задач.</p>
          </div>
        </div>
        
        <div className={styles.connector}></div>
        
        <div className={styles.step}>
          <div className={styles.stepIcon}>🧴</div>
          <div className={styles.stepNumber}>3</div>
          <div className={styles.stepContent}>
            <h3>Выберите средства</h3>
            <p>При необходимости выберите дополнительные средства для чистки — мы доставим их прямо в бокс к вашему времени.</p>
          </div>
        </div>
        
        <div className={styles.connector}></div>
        
        <div className={styles.step}>
          <div className={styles.stepIcon}>💳</div>
          <div className={styles.stepNumber}>4</div>
          <div className={styles.stepContent}>
            <h3>Оплатите</h3>
            <p>Оплатите выбранные услуги и средства удобным способом.</p>
          </div>
        </div>
        
        <div className={styles.connector}></div>
        
        <div className={styles.step}>
          <div className={styles.stepIcon}>🚗</div>
          <div className={styles.stepNumber}>5</div>
          <div className={styles.stepContent}>
            <h3>Приезжайте и получите инструктаж</h3>
            <p>Сообщите администратору о прибытии, получите короткий инструктаж по оборудованию.</p>
          </div>
        </div>
        
        <div className={styles.connector}></div>
        
        <div className={styles.step}>
          <div className={styles.stepIcon}>🧽</div>
          <div className={styles.stepNumber}>6</div>
          <div className={styles.stepContent}>
            <h3>Пользуйтесь боксом</h3>
            <p>Наслаждайтесь самостоятельным детейлингом в полностью оборудованном боксе!</p>
          </div>
        </div>
      </div>
      
    </section>
  );
};

export default HowItWorks; 
