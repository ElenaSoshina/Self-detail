export interface CartItem {
    id: string;
    name: string;
    game: string;
    price: number;
    quantity: number;
    type?: string;
    icon?: string;
    details?: string;
    region?: string;
  } 