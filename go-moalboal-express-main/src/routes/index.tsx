import { createFileRoute } from '@tanstack/react-router';
import { HomePage } from '@/components/gosugbo/home';
import { meta } from '@/components/gosugbo/shared';
export const Route = createFileRoute('/')({ head: () => meta('Your Town. Your Way.', 'GoSugbo brings local rides and food together in Moalboal, Cebu. Explore the customer demo.'), component: HomePage });
