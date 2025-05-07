import React from 'react';
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

const PlanSelection: React.FC<PlanSelectionProps> = ({ pricingPlans, selectedPlan, onPlanClick }) => (
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
        </div>
      ))}
    </div>
  </div>
);

export default PlanSelection; 