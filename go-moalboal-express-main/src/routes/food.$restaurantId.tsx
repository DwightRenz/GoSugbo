import { createFileRoute, notFound } from '@tanstack/react-router';
import { RestaurantPage } from '@/components/gosugbo/food';
import { restaurants } from '@/lib/gosugbo/data';
import { meta } from '@/components/gosugbo/shared';
export const Route = createFileRoute('/food/$restaurantId')({ loader: ({ params }) => { const restaurant = restaurants.find(r => r.id === params.restaurantId); if (!restaurant) throw notFound(); return restaurant; }, head: ({ loaderData }) => meta(loaderData?.name ?? 'Restaurant unavailable', `Explore the sample menu at ${loaderData?.name ?? 'a local Moalboal kitchen'} with GoSugbo.`), component: RestaurantRoute });
function RestaurantRoute() { const restaurant = Route.useLoaderData(); return <RestaurantPage restaurant={restaurant} />; }
