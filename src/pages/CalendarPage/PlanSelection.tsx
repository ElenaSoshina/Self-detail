import React, { useState } from 'react';
import styles from './CalendarPage.module.css';

interface PricingPlan {
  id: string;
  title: string;
  price: number;
  icon: string;
  description: string;
}

interface PlanSelectionProps {
  pricingPlans: PricingPlan[];
  selectedPlan: PricingPlan | null;
  onPlanClick: (plan: PricingPlan) => void;
}

// Данные о том, что входит в каждый тариф (из FAQ)
const planDetails: Record<string, string[]> = {
  'all-inclusive': [
    'Для мойки автомобиля:',
    '• АВД (аппарат высокого давления)',
    '• Два пенокомплекта',
    '• Копья, лейка',
    '• Пылесос Панда',
    '• Шампуни (1 и 2 фаза, воск)',
    '• Чернение с апликатором',
    '• Средство для чистки стекол',
    '• Губка и протирочные материалы, щетки',
    '• Воздух под давлением',
    '',
    'Для химчистки:',
    '• Моющий пылесос Karcher',
    '• Торнадор',
    '• Средство для чистки кожи',
    '• Кондиционер кожи',
    '• Щетки для чистки кожи, кисточки',
    '• Пенообразователь',
    '• Фибра',
    '',
    'Для полировки:',
    '• Роторная полировочная машинка',
    '• Подложки 125, 150, 180 мм',
    '• Фибра',
    '• Малярный скотч',
    '',
    'Внимание: круги и пасту приобретайте отдельно, в стоимость пока это не входит.'
  ],
  tech: [
    'Специальный тариф для технических работ',
    'Не отображается для клиентов',
    'Используется для внутренних нужд'
  ]
};

const PlanSelection: React.FC<PlanSelectionProps> = ({ 
  pricingPlans, 
  selectedPlan, 
  onPlanClick
}) => {
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);

  const toggleDetails = (planId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Предотвращаем выбор карточки при клике на кнопку
    setExpandedPlan(expandedPlan === planId ? null : planId);
  };

  return (
    <div className={styles.planSelection}>
      <h3 className={styles.sectionTitle}>Выберите тариф</h3>
      <div className={styles.planGrid}>
        {pricingPlans.map((plan) => (
          <div
            key={plan.id}
            className={`${styles.planCard} ${selectedPlan?.id === plan.id ? styles.selectedPlan : ''}`}
            onClick={() => onPlanClick(plan)}
          >
            <div className={styles.planIcon}>{plan.icon}</div>
            <h4 className={styles.planTitle}>{plan.title}</h4>
            <div className={styles.planPrice}>{plan.price} ₽/ч</div>
            <p className={styles.planDescription}>{plan.description}</p>
            
            <button 
              className={styles.detailsButton}
              onClick={(e) => toggleDetails(plan.id, e)}
            >
              Подробнее
              <span className={`${styles.detailsArrow} ${expandedPlan === plan.id ? styles.detailsArrowOpen : ''}`}>
                ▼
              </span>
            </button>
            
            {expandedPlan === plan.id && (
              <div className={styles.planDetailsDropdown}>
                <h5 className={styles.detailsTitle}>Что входит в тариф:</h5>
                <ul className={styles.detailsList}>
                  {planDetails[plan.id]?.map((item, index) => (
                    <li key={index} className={styles.detailsItem}>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlanSelection; 