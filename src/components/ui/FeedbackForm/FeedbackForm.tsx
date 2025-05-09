import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import PhoneInput from 'react-phone-number-input/input';
import 'react-phone-number-input/style.css';
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
  onInputFocus?: (focused: boolean) => void;
}

const FeedbackForm: React.FC<FeedbackFormProps> = ({ 
  onSubmit, 
  onCancel,
  onInputFocus 
}) => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    phone: '',
    telegram: '',
    question: '',
  });
  
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  
  // Создаем рефы для элементов формы
  const formRef = useRef<HTMLFormElement>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);

  // Массив ID администраторов
  const adminChatIds: string[] = ['522814078'];

  // Получаем chatId пользователя из Telegram WebApp
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.initDataUnsafe?.user?.id) {
      setChatId(tg.initDataUnsafe.user.id.toString());
      tg.ready?.();
    }
  }, []);
  
  // Обработчик фокуса для любого поля ввода
  const handleFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (onInputFocus) onInputFocus(true);
    
    // Автоскролл к полю ввода на мобильных устройствах
    if (window.innerWidth <= 768) {
      // Небольшая задержка для корректной работы с виртуальной клавиатурой
      setTimeout(() => {
        const input = e.target;
        const rect = input.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // Проверяем, находится ли поле ввода в нижней части экрана
        if (rect.bottom > window.innerHeight - 100) {
          // Скроллим к полю с отступом для удобства
          window.scrollTo({
            top: scrollTop + rect.top - 120,
            behavior: 'smooth'
          });
          
          // Если это модальное окно, скроллим его контент
          const modalContent = input.closest('.modalContent');
          if (modalContent) {
            modalContent.scrollTop = rect.top - 120;
          }
        }
      }, 300);
    }
  };
  
  // Обработчик blur для любого поля ввода
  const handleBlur = () => {
    if (onInputFocus) onInputFocus(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Особая обработка для поля telegram - автоматически добавляем @ в начало, если его нет
    if (name === 'telegram' && value && !value.startsWith('@') && value !== '@') {
      setFormData(prev => ({ ...prev, [name]: `@${value}` }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    // Сбрасываем ошибку при изменении поля
    if (errors[name as keyof FormData]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Обработчик изменения телефона через PhoneInput
  const handlePhoneChange = (value: string | undefined) => {
    setFormData(prev => ({ ...prev, phone: value || '' }));
    
    // Сбрасываем ошибку при изменении телефона
    if (errors.phone) {
      setErrors(prev => ({ ...prev, phone: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<FormData> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Введите ваше имя';
    }
    
    // Валидация телефона (должен быть не пустым и содержать не менее 10 цифр)
    const phoneDigits = formData.phone.replace(/\D/g, '');
    if (!formData.phone.trim()) {
      newErrors.phone = 'Введите номер телефона';
    } else if (phoneDigits.length < 10) {
      newErrors.phone = 'Введите корректный номер телефона';
    }
    
    // Валидация telegram (обязательно должен начинаться с @)
    if (!formData.telegram.trim()) {
      newErrors.telegram = 'Введите ваш username в Telegram';
    } else if (!formData.telegram.trim().startsWith('@')) {
      newErrors.telegram = 'Username должен начинаться с @';
    } else if (formData.telegram.trim() === '@') {
      newErrors.telegram = 'Введите имя пользователя после @';
    }
    
    if (!formData.question.trim()) {
      newErrors.question = 'Введите ваш вопрос';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Функция для отправки сообщений через API
  const sendMessageToTelegram = async () => {
    if (!chatId && !adminChatIds.length) {
      console.error('Нет доступных ID для отправки сообщений');
      throw new Error('Нет доступных ID для отправки сообщений');
    }

    // Сообщение для администраторов
    const adminMessage = 
      `🔔 Новый вопрос от пользователя!\n\n` +
      `👤 Имя: ${formData.name}\n` +
      `📱 Телефон: ${formData.phone}\n` +
      `📨 Telegram: ${formData.telegram}\n\n` +
      `❓ Вопрос:\n${formData.question}`;

    // Сообщение для пользователя
    const userMessage = 
      `✅ Спасибо за ваш вопрос!\n\n` +
      `Мы получили вашу заявку и ответим в ближайшее время.\n\n` +
      `📝 Ваш вопрос:\n${formData.question}`;

    try {
      // Отправляем сообщения администраторам
      await Promise.all(
        adminChatIds.map(id =>
          axios.post(
            `https://backend.self-detailing.duckdns.org/api/v1/chat/send-message/${id}`,
            { message: adminMessage }
          )
        )
      );

      // Отправляем сообщение пользователю, если известен его chatId
      if (chatId) {
        await axios.post(
          `https://backend.self-detailing.duckdns.org/api/v1/chat/send-message/${chatId}`,
          { message: userMessage }
        );
      }

      return true;
    } catch (error) {
      console.error('Ошибка при отправке сообщения в Telegram:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) {
      // Скролл к первому полю с ошибкой
      const firstErrorField = Object.keys(errors)[0];
      if (firstErrorField) {
        const errorElement = document.querySelector(`[name="${firstErrorField}"]`);
        errorElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Отправляем сообщения в Telegram
      await sendMessageToTelegram();
      
      // Передаем данные формы в родительский компонент
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
      // alert('Произошла ошибка при отправке формы. Пожалуйста, попробуйте снова позже.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form ref={formRef} className={styles.form} onSubmit={handleSubmit}>
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
          onFocus={handleFocus}
          onBlur={handleBlur}
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
        <PhoneInput
          country="RU"
          international
          withCountryCallingCode
          id="phone"
          name="phone"
          value={formData.phone}
          onChange={handlePhoneChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={`${styles.input} ${errors.phone ? styles.inputError : ''}`}
          placeholder="+7 (___) ___-__-__"
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
          onFocus={handleFocus}
          onBlur={handleBlur}
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
          onFocus={handleFocus}
          onBlur={handleBlur}
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
          ref={submitButtonRef}
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