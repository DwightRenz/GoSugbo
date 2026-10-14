import { createFileRoute } from '@tanstack/react-router';
import { FoodPage } from '@/components/gosugbo/food';
import { meta } from '@/components/gosugbo/shared';
export const Route = createFileRoute('/food/')({ head: () => meta('Local Food', 'Explore Moalboal kitchens, Filipino favorites and fresh seafood with GoSugbo.'), component: FoodPage });
