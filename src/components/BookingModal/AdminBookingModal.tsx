import React, { useState, useEffect } from 'react';
import styles from './AdminBookingModal.module.css';
import api from '../../api/apiService';

interface AdminBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: any) => void;
  defaultDate: Date;
}

interface FormData {
  name: string;
  phone: string;
  email: string;
  telegramUserName: string;
  planId: string;
  price: string;
  startTime: string;
  endTime: string;
}

interface Plan {
  id: string;
  title: string;
  price: number;
}

const AdminBookingModal: React.FC<AdminBookingModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  defaultDate,
}) => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    phone: '',
    email: '',
    telegramUserName: '',
    planId: '',
    price: '',
    startTime: '',
    endTime: '',
  });
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<FormData>>({});

  useEffect(() => {
    if (isOpen) {
      api.get('/plans')
        .then(response => setPlans(response.data.data))
        .catch(() => setPlans([]));
    }
  }, [isOpen]);

  const validate = (): boolean => {
    const newErrors: Partial<FormData> = {};
    if (!formData.name) newErrors.name = 'Обязательное поле';
    if (!formData.phone) newErrors.phone = 'Обязательное поле';
    if (!formData.planId) newErrors.planId = 'Обязательное поле';
    if (!formData.startTime) newErrors.startTime = 'Обязательное поле';
    if (!formData.endTime) newErrors.endTime = 'Обязательное поле';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const bookingData = {
        ...formData,
        date: defaultDate.toISOString().split('T')[0],
      };
      await api.post('/calendar/booking', bookingData);
      onSubmit(bookingData);
    } catch (error) {
      console.error('Error submitting booking:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name as keyof FormData]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <h2>Добавить бронирование</h2>
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label>Имя:</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={errors.name ? styles.error : ''}
            />
            {errors.name && <span className={styles.errorText}>{errors.name}</span>}
          </div>

          <div className={styles.formGroup}>
            <label>Телефон:</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className={errors.phone ? styles.error : ''}
            />
            {errors.phone && <span className={styles.errorText}>{errors.phone}</span>}
          </div>

          <div className={styles.formGroup}>
            <label>Email:</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Telegram:</label>
            <input
              type="text"
              name="telegramUserName"
              value={formData.telegramUserName}
              onChange={handleChange}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Тариф:</label>
            <select
              name="planId"
              value={formData.planId}
              onChange={handleChange}
              className={errors.planId ? styles.error : ''}
            >
              <option value="">Выберите тариф</option>
              {plans.map(plan => (
                <option key={plan.id} value={plan.id}>
                  {plan.title} - {plan.price}₽
                </option>
              ))}
            </select>
            {errors.planId && <span className={styles.errorText}>{errors.planId}</span>}
          </div>

          <div className={styles.formGroup}>
            <label>Стоимость:</label>
            <input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleChange}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Время начала:</label>
            <input
              type="time"
              name="startTime"
              value={formData.startTime}
              onChange={handleChange}
              className={errors.startTime ? styles.error : ''}
            />
            {errors.startTime && <span className={styles.errorText}>{errors.startTime}</span>}
          </div>

          <div className={styles.formGroup}>
            <label>Время окончания:</label>
            <input
              type="time"
              name="endTime"
              value={formData.endTime}
              onChange={handleChange}
              className={errors.endTime ? styles.error : ''}
            />
            {errors.endTime && <span className={styles.errorText}>{errors.endTime}</span>}
          </div>

          <div className={styles.buttonGroup}>
            <button type="button" onClick={onClose} className={styles.cancelButton}>
              Отмена
            </button>
            <button type="submit" className={styles.submitButton} disabled={loading}>
              {loading ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminBookingModal; 