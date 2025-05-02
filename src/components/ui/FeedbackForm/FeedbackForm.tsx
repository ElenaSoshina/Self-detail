import React, { useState } from 'react';
import styles from './FeedbackForm.module.css';

interface FormData {
  name: string;
  phone: string;
  telegram: string;
  question: string;
}

interface FeedbackFormProps {
  onSubmit: (data: FormData) => void;
  onCancel?: () => void;
}

const FeedbackForm: React.FC<FeedbackFormProps> = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    phone: '',
    telegram: '',
    question: '',
  });
  
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Сбрасываем ошибку при изменении поля
    if (errors[name as keyof FormData]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<FormData> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Введите ваше имя';
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'Введите номер телефона';
    } else if (!/^(\+7|8)[\s-]?\(?[0-9]{3}\)?[\s-]?[0-9]{3}[\s-]?[0-9]{2}[\s-]?[0-9]{2}$/.test(formData.phone)) {
      newErrors.phone = 'Введите корректный номер телефона';
    }
    
    if (!formData.telegram.trim()) {
      newErrors.telegram = 'Введите ваш username в Telegram';
    } else if (!formData.telegram.trim().startsWith('@') && !formData.telegram.trim().match(/^[a-zA-Z][a-zA-Z0-9_]{3,}$/)) {
      newErrors.telegram = 'Введите корректный username (например @username)';
    }
    
    if (!formData.question.trim()) {
      newErrors.question = 'Введите ваш вопрос';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    setIsSubmitting(true);
    
    try {
      // Здесь можно добавить реальную отправку данных на сервер
      // await sendDataToServer(formData);
      
      // Имитация задержки при отправке
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      onSubmit(formData);
      
      // Сбрасываем форму
      setFormData({
        name: '',
        phone: '',
        telegram: '',
        question: '',
      });
    } catch (error) {
      console.error('Ошибка при отправке данных:', error);
      alert('Произошла ошибка при отправке формы. Пожалуйста, попробуйте снова позже.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.formGroup}>
        <label htmlFor="name" className={styles.label}>
          Имя <span className={styles.required}>*</span>
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className={`${styles.input} ${errors.name ? styles.inputError : ''}`}
          placeholder="Ваше имя"
          disabled={isSubmitting}
        />
        {errors.name && <div className={styles.errorMessage}>{errors.name}</div>}
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="phone" className={styles.label}>
          Телефон <span className={styles.required}>*</span>
        </label>
        <input
          type="tel"
          id="phone"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          className={`${styles.input} ${errors.phone ? styles.inputError : ''}`}
          placeholder="+7 (999) 999-99-99"
          disabled={isSubmitting}
        />
        {errors.phone && <div className={styles.errorMessage}>{errors.phone}</div>}
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="telegram" className={styles.label}>
          Telegram (username) <span className={styles.required}>*</span>
        </label>
        <input
          type="text"
          id="telegram"
          name="telegram"
          value={formData.telegram}
          onChange={handleChange}
          className={`${styles.input} ${errors.telegram ? styles.inputError : ''}`}
          placeholder="@username"
          disabled={isSubmitting}
        />
        {errors.telegram && <div className={styles.errorMessage}>{errors.telegram}</div>}
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="question" className={styles.label}>
          Ваш вопрос <span className={styles.required}>*</span>
        </label>
        <textarea
          id="question"
          name="question"
          value={formData.question}
          onChange={handleChange}
          className={`${styles.textarea} ${errors.question ? styles.inputError : ''}`}
          placeholder="Опишите ваш вопрос подробно"
          rows={4}
          disabled={isSubmitting}
        />
        {errors.question && <div className={styles.errorMessage}>{errors.question}</div>}
      </div>

      <div className={styles.formActions}>
        {onCancel && (
          <button 
            type="button" 
            className={styles.cancelButton} 
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Отмена
          </button>
        )}
        <button 
          type="submit" 
          className={styles.submitButton}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Отправка...' : 'Отправить'}
        </button>
      </div>
    </form>
  );
};

export default FeedbackForm; 