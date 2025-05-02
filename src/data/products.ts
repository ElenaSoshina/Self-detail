export interface Product {
  id: number;
  name: string;
  price: number;
  image: string;
  description: string;
  category: string;
}

export const products: Product[] = [
  {
    id: 1,
    name: "Автошампунь",
    price: 350,
    image: "/images/auto-shampoo.jpg",
    description: "Эффективный автошампунь для ручной и бесконтактной мойки. Не повреждает ЛКП, легко смывается водой. Обеспечивает густую пену, быстро удаляет загрязнения, подходит для всех типов кузова. Не оставляет разводов, придаёт блеск и защищает поверхность от повторного загрязнения. Рекомендуется для регулярного ухода за автомобилем.",
    category: "Мойка"
  },
  {
    id: 2,
    name: "Губка для мойки",
    price: 120,
    image: "/images/sponge.jpg",
    description: "Мягкая губка для бережной мойки кузова. Не царапает лакокрасочное покрытие.",
    category: "Мойка"
  },
  {
    id: 3,
    name: "Средство для химчистки",
    price: 490,
    image: "/images/cleaner.jpg",
    description: "Профессиональное средство для глубокой чистки салона и обивки.",
    category: "Химчистка"
  },
  {
    id: 4,
    name: "Полировочная паста",
    price: 700,
    image: "/images/polish.jpg",
    description: "Высококачественная полировочная паста для восстановления блеска кузова.",
    category: "Полировка"
  }
]; 