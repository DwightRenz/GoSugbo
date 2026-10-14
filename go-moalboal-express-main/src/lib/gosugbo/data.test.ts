import { describe, it, expect } from 'vitest';
import { cartSubtotal, cartTotal, deliveryFee, changeQuantity, dishes, money, type CartItem } from './data';
const dish = dishes[0];
if (!dish) throw new Error('Missing sample dish');
const item: CartItem = { key: 'a', dish, restaurantId: 'kusina', quantity: 2, notes: '' };
describe('GoSugbo cart calculations', () => {
  it('multiplies the concrete sample price by quantity', () => expect(cartSubtotal([item])).toBe(330));
  it('includes a single restaurant delivery fee', () => { expect(deliveryFee([item])).toBe(35); expect(cartTotal([item])).toBe(365); });
  it('removes an item when decreased to zero', () => expect(changeQuantity([{ ...item, quantity: 1 }], 'a', -1)).toEqual([]));
  it('keeps unrelated items when adjusting quantity', () => { const updated = changeQuantity([item, { ...item, key: 'b' }], 'a', 1); expect(updated.map(i => i.quantity)).toEqual([3, 2]); });
  it('uses Philippine pesos', () => expect(money(165)).toBe('₱165'));
  it('does not charge delivery for an empty cart', () => expect(cartTotal([])).toBe(0));
});
