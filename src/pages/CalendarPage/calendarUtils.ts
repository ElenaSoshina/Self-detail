import { Day, TimeSlotWithData } from './calendarTypes';

export function generateDaysForMonth(year: number, month: number): Day[] {
  const result: Day[] = [];
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  let firstDayWeekday = firstDayOfMonth.getDay() || 7;
  firstDayWeekday = firstDayWeekday === 0 ? 7 : firstDayWeekday;
  const daysFromPrevMonth = firstDayWeekday - 1;
  const prevMonth = new Date(year, month, 0);
  for (let i = prevMonth.getDate() - daysFromPrevMonth + 1; i <= prevMonth.getDate(); i++) {
    const date = new Date(year, month - 1, i);
    result.push({
      date,
      isCurrentMonth: false,
      isToday: isSameDay(date, new Date()),
      isAvailable: false
    });
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
    const date = new Date(year, month, i);
    date.setHours(0, 0, 0, 0);
    const isDateAvailable = date >= today;
    result.push({
      date,
      isCurrentMonth: true,
      isToday: isSameDay(date, today),
      isAvailable: isDateAvailable
    });
  }
  const remainingDays = 42 - result.length;
  for (let i = 1; i <= remainingDays; i++) {
    const date = new Date(year, month + 1, i);
    result.push({
      date,
      isCurrentMonth: false,
      isToday: isSameDay(date, new Date()),
      isAvailable: true
    });
  }
  return result;
}

export function isSameDay(date1: Date, date2: Date) {
  return (
    date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear()
  );
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

export function calculateMaxAvailableHours(selectedTimeStr: string, slots: TimeSlotWithData[]): number {
  const selectedIndex = slots.findIndex(slot => slot.formattedTime === selectedTimeStr);
  if (selectedIndex === -1) return 1;
  const selectedSlot = slots[selectedIndex];
  const selectedStartTime = new Date(selectedSlot.start);
  let availableHours = 1;
  let nextHourExpected = new Date(selectedStartTime);
  nextHourExpected.setHours(nextHourExpected.getHours() + 1);
  const sortedSlots = [...slots].sort((a, b) => a.start.getTime() - b.start.getTime());
  for (let i = 0; i < sortedSlots.length; i++) {
    const slot = sortedSlots[i];
    if (slot.start <= selectedStartTime) continue;
    const slotStartTime = new Date(slot.start);
    const diffMinutes = Math.abs((slotStartTime.getTime() - nextHourExpected.getTime()) / (60 * 1000));
    if (diffMinutes < 5) {
      availableHours++;
      nextHourExpected = new Date(slotStartTime);
      nextHourExpected.setHours(nextHourExpected.getHours() + 1);
      if (availableHours >= 8) break;
    }
  }
  return Math.min(availableHours, 8);
} 