import React, { useState } from 'react';
import styles from './FAQ.module.css';
import FeedbackModal from '../FeedbackModal/FeedbackModal';

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
  const [isModalOpen, setIsModalOpen] = useState(false);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };
  
  const handleOpenModal = () => {
    setIsModalOpen(true);
  };
  
  const handleCloseModal = () => {
    setIsModalOpen(false);
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
        <button className={styles.faqAskBtn} onClick={handleOpenModal}>
          <svg className={styles.buttonIcon} width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M9.09 9.00002C9.3251 8.33169 9.78915 7.76813 10.4 7.40915C11.0108 7.05018 11.7289 6.91896 12.4272 7.03873C13.1255 7.15851 13.7588 7.52154 14.2151 8.06355C14.6713 8.60555 14.9211 9.29154 14.92 10C14.92 12 11.92 13 11.92 13" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 17H12.01" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Задать вопрос
        </button>
      </div>
      
      <FeedbackModal isOpen={isModalOpen} onClose={handleCloseModal} />
    </section>
  );
};

export default FAQ; 