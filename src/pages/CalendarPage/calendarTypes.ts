import { TimeSlotData } from './calendarApiService';

export interface Day {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isAvailable: boolean;
}

export interface PricingPlan {
  id: string;
  title: string;
  price: number;
  icon: string;
  description: string;
}

export interface BookingDetails {
  date: Date;
  timeRange: string;
  duration: number;
  plan: PricingPlan;
  totalPrice: number;
}

export type TimeSlotWithData = TimeSlotData;

export interface AvailabilityData {
  timeSlots: string[];
  originalData: TimeSlotWithData[];
  maxAvailableHours: number;
} 