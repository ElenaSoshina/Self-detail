import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { PricingPlan, BookingDetails } from './calendarTypes';

export function useBooking() {
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);
  const [hours, setHours] = useState<number>(1);

  const handlePlanClick = (plan: PricingPlan) => {
    setSelectedPlan(plan);
  };

  const handleHoursChange = (newHours: number, maxAvailableHours: number) => {
    setHours(Math.max(1, Math.min(newHours, maxAvailableHours)));
  };

  const handleBooking = (
    selectedDate: Date | null,
    selectedTime: string | null,
    selectedPlan: PricingPlan | null,
    hours: number,
    setBookingDetails: (b: BookingDetails) => void,
    setBookingCompleted: (v: boolean) => void
  ) => {
    if (selectedDate && selectedTime && selectedPlan) {
      const booking: BookingDetails = {
        id: uuidv4(),
        date: selectedDate,
        time: selectedTime,
        plan: selectedPlan,
        hours: hours,
        totalPrice: selectedPlan.price * hours
      };
      setBookingDetails(booking);
      setBookingCompleted(true);
    }
  };

  return {
    selectedPlan,
    setSelectedPlan,
    hours,
    setHours,
    handlePlanClick,
    handleHoursChange,
    handleBooking
  };
} 