import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import './AuthStatus.css';

export const AuthStatus: React.FC = () => {
  const { loading, error, isAuthenticated, token } = useAuth();
  const [showSuccessStatus, setShowSuccessStatus] = useState(false);

  useEffect(() => {
    // Проверка на успешную авторизацию и режим разработки
    if (isAuthenticated && token && !loading && !error) {
      // Для локальной разработки показываем алерт
      if (import.meta.env.DEV) {
        alert(`Авторизация прошла успешно!\nТокен: ${token.substring(0, 20)}...`);
        setShowSuccessStatus(true);
        
        // Скрыть индикатор успеха через 3 секунды
        setTimeout(() => {
          setShowSuccessStatus(false);
        }, 3000);
      }
    }
  }, [isAuthenticated, token, loading, error]);

  if (loading) {
    return <div className="auth-loading">Выполняется авторизация...</div>;
  }

  if (error) {
    return <div className="auth-error">Ошибка авторизации: {error.message}</div>;
  }

  if (showSuccessStatus) {
    return <div className="auth-success">Авторизация выполнена успешно</div>;
  }

  return null;
}; 