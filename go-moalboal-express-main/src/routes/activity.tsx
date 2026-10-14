import { createFileRoute } from '@tanstack/react-router';
import { ActivityPage } from '@/components/gosugbo/account';
import { meta } from '@/components/gosugbo/shared';
export const Route = createFileRoute('/activity')({ head: () => meta('Your Activity', 'Your GoSugbo demo rides and food orders in one place.'), component: ActivityPage });
