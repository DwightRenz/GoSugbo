import pork from '@/assets/pork-bowl.jpg';
import seafood from '@/assets/seafood.jpg';

export const locations = ['Panagsama Beach', 'White Beach', 'Moalboal Public Market', 'Gaisano Grand Mall Moalboal', 'Cebu South Road', 'Basdiot, Moalboal'];
export const categories = ['All', 'Filipino', 'Seafood', 'BBQ', 'Snacks', 'Drinks', 'Desserts'];
export type Restaurant = { id: string; name: string; cuisine: string; time: string; rating: string; fee: number; image: string; tag: string };
export const restaurants: Restaurant[] = [
  { id: 'kusina', name: 'Kusina sa Moalboal', cuisine: 'Filipino · BBQ', time: '20–30 min', rating: '4.8', fee: 35, image: pork, tag: 'Local favorite' },
  { id: 'lantaw', name: 'Lantaw Seaside Kitchen', cuisine: 'Seafood · Filipino', time: '25–35 min', rating: '4.9', fee: 40, image: seafood, tag: 'Fresh from the sea' },
  { id: 'island', name: 'Island Bowls & Bites', cuisine: 'Snacks · Drinks · Desserts', time: '15–25 min', rating: '4.7', fee: 30, image: pork, tag: 'Quick & delicious' },
];
export type Dish = { id: string; name: string; description: string; price: number; image: string; category: string };
export const dishes: Dish[] = [
  { id: 'liempo', name: 'Grilled Liempo Rice Bowl', description: 'Smoky grilled pork belly, fluffy rice, fresh pickles and calamansi.', price: 165, image: pork, category: 'Rice meals' },
  { id: 'seafood', name: 'Seafood Platter', description: 'Grilled fish and garlic butter shrimp, served with steamed rice.', price: 295, image: seafood, category: 'Seafood' },
  { id: 'bbq', name: 'Pork BBQ Rice Meal', description: 'Sweet and savory pork barbecue with rice and our house sauce.', price: 135, image: pork, category: 'Rice meals' },
  { id: 'shrimp', name: 'Garlic Butter Shrimp', description: 'Fresh local shrimp tossed in rich garlic butter and herbs.', price: 245, image: seafood, category: 'Seafood' },
];
export const rideOptions = [
  { id: 'motorcycle', name: 'Motorcycle', description: 'Quick trips, light travel', fare: 65, capacity: 1, arrival: '3 min' },
  { id: 'tricycle', name: 'Tricycle', description: 'A local way to get around', fare: 95, capacity: 3, arrival: '5 min' },
  { id: 'car', name: 'Car', description: 'More comfort, more room', fare: 180, capacity: 4, arrival: '7 min' },
] as const;
export type Ride = { id: string; pickup: string; destination: string; vehicle: string; fare: number; status: 'Looking for a driver' | 'Cancelled'; date: string };
export type CartItem = { key: string; dish: Dish; restaurantId: string; quantity: number; notes: string };
export type Order = { id: string; items: CartItem[]; total: number; address: string; payment: string; notes: string; status: string; date: string };
export const money = (value: number) => `₱${value.toLocaleString('en-PH')}`;
export const cartSubtotal = (items: CartItem[]) => items.reduce((sum, item) => sum + item.dish.price * item.quantity, 0);
export const deliveryFee = (items: CartItem[]) => items.length ? restaurants.find(r => r.id === items[0]?.restaurantId)?.fee ?? 35 : 0;
export const cartTotal = (items: CartItem[]) => cartSubtotal(items) + deliveryFee(items);
export function changeQuantity(items: CartItem[], key: string, delta: number) { return items.map(item => item.key === key ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item).filter(item => item.quantity > 0); }
