import { createFileRoute } from '@tanstack/react-router';
import { ProfilePage } from '@/components/gosugbo/account';
import { meta } from '@/components/gosugbo/shared';
export const Route = createFileRoute('/profile')({ head: () => meta('Your Profile', 'Manage your GoSugbo demo profile, saved locations and preferences.'), component: ProfilePage });
