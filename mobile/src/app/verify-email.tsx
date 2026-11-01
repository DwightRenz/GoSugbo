import { useLocalSearchParams } from 'expo-router';

import OtpScreen from '@/components/gosugbo/otp-screen';

export default function VerifyEmail() {
  const { email } = useLocalSearchParams<{ email?: string | string[] }>();
  return <OtpScreen email={Array.isArray(email) ? email[0] : email} />;
}
