/**
 * Извлекает время из строки формата "01:00" или "01:00 — 02:00"
 */
export const parseHourFromTime = (timeStr: string): string => {
  const timeMatches = timeStr.match(/\d{1,2}:\d{2}/g);
  if (!timeMatches || timeMatches.length === 0) return '';
  return timeMatches[0];
};

/**
 * Форматирует дату в строку ISO формата YYYY-MM-DD
 */
export const formatDateToISO = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Создает ISO строку даты-времени для API
 */
export const createISODateTime = (date: Date, timeStr: string): string => {
  const dateIso = formatDateToISO(date);
  const parsedTime = parseHourFromTime(timeStr);
  if (!parsedTime) return '';
  return `${dateIso}T${parsedTime}:00`;
};

/**
 * Форматирует дату в читабельный вид для отображения
 */
export const formatDate = (dateString: string): string => {
  const options: Intl.DateTimeFormatOptions = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  };
  return new Date(dateString).toLocaleDateString('ru-RU', options);
}; 