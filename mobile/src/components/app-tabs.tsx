import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { colors } from '@/components/gosugbo/ui';

export default function AppTabs() {
  return (
    <NativeTabs
      backgroundColor={colors.white}
      indicatorColor={colors.mint}
      iconColor={{ default: '#667488', selected: colors.teal }}
      labelStyle={{ default: { color: '#667488', fontSize: 10 }, selected: { color: colors.teal, fontSize: 10, fontWeight: '600' } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md={{ default: 'home', selected: 'home' }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="rides">
        <NativeTabs.Trigger.Label>Rides</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'car.side', selected: 'car.side.fill' }} md={{ default: 'directions_car', selected: 'directions_car' }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="activity">
        <NativeTabs.Trigger.Label>Activity</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'receipt', selected: 'receipt.fill' }} md={{ default: 'receipt_long', selected: 'receipt_long' }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'person', selected: 'person.fill' }} md={{ default: 'person', selected: 'person' }} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
