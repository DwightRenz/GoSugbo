import { router } from 'expo-router';
import Onboarding from '@/components/gosugbo/onboarding';

export default function WelcomeScreen() {
  return (
    <Onboarding
      onGetStarted={() => router.push('/signup')}
      onLogin={() => router.push('/login')}
    />
  );
}