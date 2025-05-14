import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import styles from './AdminPanel.module.css';
import AdminCalendar from './AdminCalendar';
import UserProfile from './UserProfile';
import api from '../../api/apiService';

// Интерфейс для пользователя
interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
}

const AdminPanel: React.FC = () => {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Параметры пагинации
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(50);
  const [sort, setSort] = useState("id,asc");
  
  const navigate = useNavigate();

  // Получение списка пользователей с сервера
  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get(`/users`, {
        params: { page, size, sort }
      });
      
      const data = response.data;
      
      if (!data || !data.data) {
        throw new Error('Неверный формат данных');
      }
      
      // Преобразование данных в формат User
      const usersList = data.data.content.map((user: any) => ({
        id: user.id || user.telegramUserId || String(Math.random()),
        name: user.name || user.clientName || 'Пользователь',
        phone: user.phone || user.clientPhone || 'Телефон не указан',
        email: user.email || user.clientEmail
      }));
      
      setUsers(usersList);
    } catch (error) {
      console.error('Ошибка при загрузке пользователей:', error);
      setError('Не удалось загрузить список пользователей');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Загрузка пользователей при монтировании компонента
  useEffect(() => {
    fetchUsers();
  }, [page, size, sort]);

  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId);
    setIsSidebarOpen(false);
    navigate(`/admin/users/${userId}`);
  };

  return (
    <div className={styles.container}>
      <div className={`${styles.sidebar} ${isSidebarOpen ? styles.active : ''}`}>
        <h2>Пользователи</h2>
        <div className={styles.usersList}>
          {loading ? (
            <div className={styles.loading}>Загрузка...</div>
          ) : error ? (
            <div className={styles.error}>{error}</div>
          ) : users.length === 0 ? (
            <div className={styles.empty}>Нет пользователей</div>
          ) : (
            users.map((user) => (
              <div
                key={user.id}
                className={`${styles.userItem} ${selectedUserId === user.id ? styles.selected : ''}`}
                onClick={() => handleUserSelect(user.id)}
              >
                <div className={styles.userName}>{user.name}</div>
                <div className={styles.userPhone}>{user.phone}</div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className={styles.content}>
        <Routes>
          <Route path="/" element={<AdminCalendar onUserSelect={handleUserSelect} />} />
          <Route path="/users/:userId" element={<UserProfile />} />
        </Routes>
      </div>

      <div className={styles.mobileMenu}>
        {/* <button 
          className={styles.mobileMenuButton}
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          {isSidebarOpen ? 'Закрыть список' : 'Список пользователей'}
        </button> */}
      </div>
    </div>
  );
};

export default AdminPanel; 