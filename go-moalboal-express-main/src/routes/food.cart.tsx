import { createFileRoute } from '@tanstack/react-router';
import { CartPage } from '@/components/gosugbo/food';
import { meta } from '@/components/gosugbo/shared';
export const Route = createFileRoute('/food/cart')({ head: () => meta('Your Cart', 'Review your local favorites and place a simulated food order with GoSugbo.'), component: CartPage });
