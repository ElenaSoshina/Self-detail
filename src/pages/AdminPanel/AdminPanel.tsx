import React, { useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import styles from './AdminPanel.module.css';
import AdminCalendar from './AdminCalendar';
import UserProfile from './UserProfile';
import { mockUsers } from './mockData';

const AdminPanel: React.FC = () => {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();

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
          {mockUsers.map((user) => (
            <div
              key={user.id}
              className={`${styles.userItem} ${selectedUserId === user.id ? styles.selected : ''}`}
              onClick={() => handleUserSelect(user.id)}
            >
              <div className={styles.userName}>{user.name}</div>
              <div className={styles.userPhone}>{user.phone}</div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.content}>
        <Routes>
          <Route path="/" element={<AdminCalendar onUserSelect={handleUserSelect} />} />
          <Route path="/users/:userId" element={<UserProfile />} />
        </Routes>
      </div>

      <div className={styles.mobileMenu}>
        <button 
          className={styles.mobileMenuButton}
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          {isSidebarOpen ? 'Закрыть список' : 'Список пользователей'}
        </button>
      </div>
    </div>
  );
};

export default AdminPanel; 