import { SymbolView } from 'expo-symbols';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader, colors, common, PageHeading } from '@/components/gosugbo/ui';

const profileRows = [
  { title: 'Saved addresses', subtitle: 'Home, work & your local spots', ios: 'mappin', android: 'location_on' },
  { title: 'Payment preferences', subtitle: 'Cash', ios: 'creditcard', android: 'credit_card' },
  { title: 'Notifications', subtitle: 'Enabled', ios: 'bell', android: 'notifications_none' },
  { title: 'Help and support', subtitle: "We're here for you", ios: 'questionmark.circle', android: 'help_outline' },
  { title: 'About GoSugbo', subtitle: 'Your Town. Your Way.', ios: 'info.circle', android: 'info_outline' },
  { title: 'Settings', subtitle: 'Make yourself at home', ios: 'gearshape', android: 'settings' },
] as const;

export default function ProfileScreen() {
  return (
    <View style={common.screen}>
      <AppHeader />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <PageHeading title="Your profile" subtitle="A familiar face around town." />
        <View style={styles.identity}>
          <View style={styles.avatar}><Text style={styles.initials}>JL</Text></View>
          <View style={styles.person}>
            <Text style={styles.name}>Jamie Lorenzo</Text>
            <Text style={styles.email}>jamie@example.com</Text>
            <View style={styles.badge}><Text style={styles.badgeText}>DEMO CUSTOMER</Text></View>
          </View>
        </View>
        <View style={styles.rule} />
        <View style={styles.rows}>
          {profileRows.map((row) => (
            <View key={row.title} style={styles.row}>
              <View style={styles.rowIcon}>
                <SymbolView name={{ ios: row.ios, android: row.android, web: row.android }} tintColor={colors.teal} size={17} />
              </View>
              <View style={styles.rowCopy}>
                <Text style={styles.rowTitle}>{row.title}</Text>
                <Text style={styles.rowSubtitle}>{row.subtitle}</Text>
              </View>
              <Text style={styles.chevron}>{'>'}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 20 },
  identity: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 18, marginTop: 17, marginBottom: 28 },
  avatar: { width: 62, height: 62, borderRadius: 31, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  initials: { color: colors.teal, fontSize: 20, fontWeight: '600' },
  person: { flex: 1 },
  name: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  email: { color: colors.muted, fontSize: 10, marginTop: 7 },
  badge: { alignSelf: 'flex-start', marginTop: 8, borderRadius: 3, paddingHorizontal: 7, paddingVertical: 5, backgroundColor: colors.mint },
  badgeText: { color: colors.teal, fontSize: 8, fontWeight: '700' },
  rule: { height: 1, backgroundColor: colors.line, marginHorizontal: 18, marginBottom: 14 },
  rows: { paddingHorizontal: 18 },
  row: { minHeight: 74, borderBottomWidth: 1, borderBottomColor: colors.line, flexDirection: 'row', alignItems: 'center' },
  rowIcon: { width: 37, height: 37, borderRadius: 6, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  rowCopy: { flex: 1 },
  rowTitle: { color: colors.ink, fontSize: 11, fontWeight: '700' },
  rowSubtitle: { color: colors.muted, fontSize: 9, marginTop: 5 },
  chevron: { color: colors.ink, fontSize: 18, paddingHorizontal: 5 },
});
