export interface Purchase {
  id: string;
  date: string;
  product: string;
  amount: number;
  price: number;
}

export interface BookingSlot {
  id: string;
  bookingId?: number | string;
  start: string;
  end: string;
  isBooked: boolean;
  bookingDetails?: {
    userId: string;
    userName: string;
    phone: string;
    plan: {
      title: string;
      price: number;
    };
    hours: number;
  };
}

export interface User {
  id: string;
  name: string;
  phone: string;
  email: string;
  bookings: {
    id: string;
    start: string;
    end: string;
    plan: {
      title: string;
      price: number;
    };
    hours: number;
    totalPrice: number;
  }[];
  purchases: Purchase[];
  totalSpent: number;
}

function getDate(offsetDays: number, hour: number, minute: number = 0) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export const mockSlots: BookingSlot[] = [
  // Сегодня
  {
    id: '1',
    start: getDate(0, 10),
    end: getDate(0, 11),
    isBooked: true,
    bookingDetails: {
      userId: '1',
      userName: 'Иван Петров',
      phone: '+7 (999) 123-45-67',
      plan: { title: 'Мойка авто', price: 800 },
      hours: 1
    }
  },
  {
    id: '2',
    start: getDate(0, 13),
    end: getDate(0, 14),
    isBooked: true,
    bookingDetails: {
      userId: '2',
      userName: 'Анна Сидорова',
      phone: '+7 (999) 765-43-21',
      plan: { title: 'Химчистка', price: 1200 },
      hours: 1
    }
  },
  // Завтра
  {
    id: '3',
    start: getDate(1, 9),
    end: getDate(1, 10),
    isBooked: true,
    bookingDetails: {
      userId: '3',
      userName: 'Михаил Иванов',
      phone: '+7 (999) 111-22-33',
      plan: { title: 'Полировка', price: 1500 },
      hours: 1
    }
  },
  {
    id: '4',
    start: getDate(1, 15),
    end: getDate(1, 17),
    isBooked: true,
    bookingDetails: {
      userId: '4',
      userName: 'Сергей Смирнов',
      phone: '+7 (999) 222-33-44',
      plan: { title: 'Комплекс', price: 2500 },
      hours: 2
    }
  },
  // Через неделю
  {
    id: '5',
    start: getDate(7, 12),
    end: getDate(7, 13),
    isBooked: true,
    bookingDetails: {
      userId: '5',
      userName: 'Олег Кузнецов',
      phone: '+7 (999) 555-66-77',
      plan: { title: 'Мойка авто', price: 800 },
      hours: 1
    }
  },
  // Через две недели
  {
    id: '6',
    start: getDate(14, 18),
    end: getDate(14, 20),
    isBooked: true,
    bookingDetails: {
      userId: '6',
      userName: 'Екатерина Лебедева',
      phone: '+7 (999) 888-99-00',
      plan: { title: 'Химчистка', price: 1200 },
      hours: 2
    }
  }
];

export const mockUsers: User[] = [
  {
    id: '1',
    name: 'Иван Петров',
    phone: '+7 (999) 123-45-67',
    email: 'ivan@example.com',
    bookings: [
      {
        id: '1',
        start: getDate(0, 10),
        end: getDate(0, 11),
        plan: { title: 'Мойка авто', price: 800 },
        hours: 1,
        totalPrice: 800
      }
    ],
    purchases: [
      { id: 'p1', date: getDate(-2, 15), product: 'Шампунь для авто', amount: 1, price: 350 },
      { id: 'p2', date: getDate(-10, 12), product: 'Микрофибра', amount: 2, price: 400 }
    ],
    totalSpent: 800 + 350 + 400
  },
  {
    id: '2',
    name: 'Анна Сидорова',
    phone: '+7 (999) 765-43-21',
    email: 'anna@example.com',
    bookings: [
      {
        id: '2',
        start: getDate(0, 13),
        end: getDate(0, 14),
        plan: { title: 'Химчистка', price: 1200 },
        hours: 1,
        totalPrice: 1200
      }
    ],
    purchases: [
      { id: 'p3', date: getDate(-1, 17), product: 'Губка', amount: 1, price: 150 }
    ],
    totalSpent: 1200 + 150
  },
  {
    id: '3',
    name: 'Михаил Иванов',
    phone: '+7 (999) 111-22-33',
    email: 'mikhail@example.com',
    bookings: [
      {
        id: '3',
        start: getDate(1, 9),
        end: getDate(1, 10),
        plan: { title: 'Полировка', price: 1500 },
        hours: 1,
        totalPrice: 1500
      }
    ],
    purchases: [],
    totalSpent: 1500
  },
  {
    id: '4',
    name: 'Сергей Смирнов',
    phone: '+7 (999) 222-33-44',
    email: 'sergey@example.com',
    bookings: [
      {
        id: '4',
        start: getDate(1, 15),
        end: getDate(1, 17),
        plan: { title: 'Комплекс', price: 2500 },
        hours: 2,
        totalPrice: 2500
      }
    ],
    purchases: [],
    totalSpent: 2500
  },
  {
    id: '5',
    name: 'Олег Кузнецов',
    phone: '+7 (999) 555-66-77',
    email: 'oleg@example.com',
    bookings: [
      {
        id: '5',
        start: getDate(7, 12),
        end: getDate(7, 13),
        plan: { title: 'Мойка авто', price: 800 },
        hours: 1,
        totalPrice: 800
      }
    ],
    purchases: [],
    totalSpent: 800
  },
  {
    id: '6',
    name: 'Екатерина Лебедева',
    phone: '+7 (999) 888-99-00',
    email: 'ekaterina@example.com',
    bookings: [
      {
        id: '6',
        start: getDate(14, 18),
        end: getDate(14, 20),
        plan: { title: 'Химчистка', price: 1200 },
        hours: 2,
        totalPrice: 2400
      }
    ],
    purchases: [],
    totalSpent: 2400
  }
]; 