import api from '../../api/apiService';

const API_PATH = '/calendar/available';

export async function fetchAvailableTimeSlotsApi(date: Date) {
  const startDate = new Date(date);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(date);
  endDate.setHours(23, 59, 59, 999);
  const startDateISO = startDate.toISOString();
  const endDateISO = endDate.toISOString();
  const response = await api.get(API_PATH, {
    params: { start: startDateISO, end: endDateISO }
  });
  return response.data.data;
} 