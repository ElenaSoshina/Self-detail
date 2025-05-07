import React, { useState, useEffect, useRef } from 'react';
import styles from './AdminCalendar.module.css';
import { mockSlots, BookingSlot } from './mockData';

const AdminCalendar: React.FC<{ onUserSelect: (userId: string) => void }> = ({ onUserSelect }) => {
  const [slots, setSlots] = useState<BookingSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<BookingSlot | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(true);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchSlots = async () => {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 300));
      const filtered = mockSlots
        .filter(slot => {
          const slotDate = new Date(slot.start);
          return slotDate.toDateString() === currentDate.toDateString() && slot.isBooked;
        })
        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
      setSlots(filtered);
      setLoading(false);
    };
    fetchSlots();
  }, [currentDate]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setShowDatePicker(false);
      }
    }
    if (showDatePicker) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDatePicker]);

  const handleSlotClick = (slot: BookingSlot) => {
    setSelectedSlot(slot);
    if (slot.isBooked && slot.bookingDetails?.userId) {
      onUserSelect(slot.bookingDetails.userId);
    }
  };

  const handlePrevDay = () => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 1);
      return d;
    });
    setSelectedSlot(null);
  };

  const handleNextDay = () => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 1);
      return d;
    });
    setSelectedSlot(null);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val) {
      const [year, month, day] = val.split('-').map(Number);
      setCurrentDate(new Date(year, month - 1, day));
      setShowDatePicker(false);
      setSelectedSlot(null);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.calendar}>
        <div className={styles.header} style={{ position: 'relative' }}>
          <button className={styles.dateBtn} onClick={handlePrevDay}>←</button>
          <h2>
            {currentDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'short' })}
          </h2>
          <button className={styles.dateBtn} onClick={handleNextDay}>→</button>
          <button className={styles.calendarIconBtn} onClick={() => setShowDatePicker(v => !v)}>
            <span className={styles.calendarIcon} />
          </button>
          {showDatePicker && (
            <div className={styles.datePopover} ref={popoverRef}>
              <input
                type="date"
                value={currentDate.toISOString().slice(0, 10)}
                onChange={handleDateChange}
                autoFocus
              />
            </div>
          )}
        </div>
        <div className={styles.slotsGrid}>
          {loading ? (
            <div className={styles.loading}>Загрузка...</div>
          ) : slots.length === 0 ? (
            <div className={styles.loading}>Нет бронирований на этот день</div>
          ) : (
            slots.map((slot) => (
              <div
                key={slot.id}
                className={`${styles.slot} ${slot.isBooked ? styles.booked : ''}`}
                onClick={() => handleSlotClick(slot)}
              >
                <div className={styles.time}>
                  {new Date(slot.start).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} — {new Date(slot.end).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className={styles.bookingInfo}>
                  <b>{slot.bookingDetails?.userName}</b><br/>
                  {slot.bookingDetails?.plan.title}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      {selectedSlot && selectedSlot.bookingDetails && (
        <div className={styles.slotDetails}>
          <h3>Информация о пользователе</h3>
          <div className={styles.detailItem}>
            <span>Имя:</span>
            <span>{selectedSlot.bookingDetails.userName}</span>
          </div>
          <div className={styles.detailItem}>
            <span>Телефон:</span>
            <span>{selectedSlot.bookingDetails.phone}</span>
          </div>
          <div className={styles.detailItem}>
            <span>Услуга:</span>
            <span>{selectedSlot.bookingDetails.plan.title}</span>
          </div>
          <div className={styles.detailItem}>
            <span>Время:</span>
            <span>{new Date(selectedSlot.start).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} — {new Date(selectedSlot.end).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCalendar; 