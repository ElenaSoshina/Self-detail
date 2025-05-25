import React, { useState } from 'react';
import Modal from '../ui/Modal/Modal';
import FeedbackForm from '../ui/FeedbackForm/FeedbackForm';

interface FormData {
  name: string;
  phone: string;
  telegram: string;
  question: string;
}

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
  const [success, setSuccess] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);

  const handleSubmit = (data: FormData) => {
    // Здесь можно добавить отправку данных на сервер
    
    // Показываем сообщение об успешной отправке
    setSuccess(true);
    
    // Закрываем модальное окно через 3 секунды
    setTimeout(() => {
      setSuccess(false);
      onClose();
    }, 3000);
  };

  const handleInputFocus = (focused: boolean) => {
    setIsInputFocused(focused);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={success ? "Спасибо за обращение!" : "Задать вопрос"}
      preventCloseOnBackdrop={isInputFocused}
    >
      {success ? (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <p style={{ fontSize: '18px', marginBottom: '16px' }}>
            Ваше сообщение успешно отправлено!
          </p>
          <p style={{ fontSize: '16px', color: '#ccc' }}>
            Мы свяжемся с вами в ближайшее время.
          </p>
        </div>
      ) : (
        <FeedbackForm 
          onSubmit={handleSubmit} 
          onCancel={onClose}
          onInputFocus={handleInputFocus}
        />
      )}
    </Modal>
  );
};

export default FeedbackModal; 