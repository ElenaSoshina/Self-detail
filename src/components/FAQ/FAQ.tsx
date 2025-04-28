import React, { useState } from 'react';
import styles from './FAQ.module.css';

const faqData = [
  {
    question: 'Как забронировать бокс?',
    answer: 'Выберите удобное время, тариф и, при необходимости, средства для чистки. Свяжитесь с нами через Telegram или по телефону для подтверждения брони.',
  },
  {
    question: 'Что включено в тариф "мойка авто"?',
    answer: 'В тариф включены: АВД, пенокомплект, автошампунь, воск, водосгон, губки, тряпки, пылесос и другое необходимое оборудование.',
  },
  {
    question: 'Можно ли оплатить онлайн?',
    answer: 'Да, мы принимаем оплату онлайн и наличными на месте.',
  },
  {
    question: 'Можно ли со своими средствами?',
    answer: 'Да, вы можете использовать свои средства и оборудование, особенно на тарифе "сухой пост".',
  },
];

const FAQ: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section className={styles.faqSection} id="faq">
      <h2 className={styles.title}>Часто задаваемые вопросы</h2>
      <div className={styles.faqList}>
        {faqData.map((item, idx) => (
          <div key={idx} className={styles.faqItem}>
            <button
              className={styles.faqQuestion}
              onClick={() => toggle(idx)}
              aria-expanded={openIndex === idx}
            >
              <span>{item.question}</span>
              <span
                className={`${styles.arrow} ${openIndex === idx ? styles.open : ''}`}
              >▼</span>
            </button>
            <div
              className={`${styles.faqAnswer} ${openIndex === idx ? styles.open : ''}`}
            >
              {item.answer}
            </div>
          </div>
        ))}
      </div>
      <div className={styles.faqFooter}>
        <div className={styles.faqSmallTitle}>Остались вопросы?</div>
        <button className={styles.faqAskBtn}>Задать вопрос</button>
      </div>
    </section>
  );
};

export default FAQ; 