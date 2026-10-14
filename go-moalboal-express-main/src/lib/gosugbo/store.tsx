import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { CartItem, Order, Ride } from './data';
import { changeQuantity } from './data';

type DemoState = { cart: CartItem[]; rides: Ride[]; orders: Order[]; address: string; notifications: boolean; payment: string };
const initial: DemoState = { cart: [], rides: [], orders: [], address: 'Panagsama Beach', notifications: true, payment: 'Cash on Delivery' };
type DemoContext = DemoState & { addItem: (item: CartItem) => void; updateQuantity: (key: string, delta: number) => void; clearCart: () => void; bookRide: (ride: Ride) => void; cancelRide: (id: string) => void; placeOrder: (order: Order) => void; setAddress: (value: string) => void; setPayment: (value: string) => void; setNotifications: (value: boolean) => void };
const Context = createContext<DemoContext | null>(null);
export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(initial);
  const [ready, setReady] = useState(false);
  useEffect(() => { try { const raw = sessionStorage.getItem('gosugbo-demo-v1'); if (raw) { const saved = JSON.parse(raw); if (Array.isArray(saved.cart) && Array.isArray(saved.rides) && Array.isArray(saved.orders)) setState({ ...initial, ...saved }); } } catch { /* A fresh demo remains available if storage is blocked. */ } setReady(true); }, []);
  useEffect(() => { if (ready) { try { sessionStorage.setItem('gosugbo-demo-v1', JSON.stringify(state)); } catch { /* In-memory navigation still preserves state. */ } } }, [state, ready]);
  const value: DemoContext = { ...state,
    addItem: item => setState(s => { const existing = s.cart.find(i => i.key === item.key); return { ...s, cart: existing ? s.cart.map(i => i.key === item.key ? { ...i, quantity: i.quantity + item.quantity } : i) : [...s.cart, item] }; }),
    updateQuantity: (key, delta) => setState(s => ({ ...s, cart: changeQuantity(s.cart, key, delta) })),
    clearCart: () => setState(s => ({ ...s, cart: [] })),
    bookRide: ride => setState(s => ({ ...s, rides: [ride, ...s.rides] })),
    cancelRide: id => setState(s => ({ ...s, rides: s.rides.map(r => r.id === id ? { ...r, status: 'Cancelled' } : r) })),
    placeOrder: order => setState(s => ({ ...s, orders: [order, ...s.orders], cart: [] })),
    setAddress: address => setState(s => ({ ...s, address })),
    setPayment: payment => setState(s => ({ ...s, payment })),
    setNotifications: notifications => setState(s => ({ ...s, notifications })),
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useDemo() { const context = useContext(Context); if (!context) throw new Error('GoSugbo must be inside DemoProvider'); return context; }
