import axios from 'axios';

const API_URL = 'https://backend.self-detailing.duckdns.org/api/v1/calendar/available';

export async function fetchAvailableTimeSlotsApi(date: Date) {
  const startDate = new Date(date);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(date);
  endDate.setHours(23, 59, 59, 999);
  const startDateISO = startDate.toISOString();
  const endDateISO = endDate.toISOString();
  const response = await axios.get(API_URL, {
    params: { start: startDateISO, end: endDateISO },
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
    timeout: 10000,
  });
  return response.data.data;
} 