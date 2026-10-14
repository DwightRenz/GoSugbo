import { createFileRoute } from '@tanstack/react-router';
import { RidesPage } from '@/components/gosugbo/rides';
import { meta } from '@/components/gosugbo/shared';
export const Route = createFileRoute('/rides')({ head: () => meta('Book a Ride', 'Plan a demo motorcycle, tricycle or car ride around Moalboal with GoSugbo.'), component: RidesPage });
