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

export interface TimeSlotWithData {
  formattedTime: string;
  originalData: any;
  sortKey: number;
  start: Date;
  end: Date;
}

export interface AvailabilityData {
  timeSlots: string[];
  originalData: TimeSlotWithData[];
  maxAvailableHours: number;
} 