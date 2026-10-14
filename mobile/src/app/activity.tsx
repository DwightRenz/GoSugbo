import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader, colors, common, DemoNote, PageHeading } from '@/components/gosugbo/ui';

export default function ActivityScreen() {
  return (
    <View style={common.screen}>
      <AppHeader />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <PageHeading title="Your activity" subtitle="Your rides around town, all in one place." />
        <View style={styles.card}>
          <View style={styles.topRow}>
            <View style={styles.rideIcon}>
              <SymbolView name={{ ios: 'bicycle', android: 'directions_bike', web: 'directions_bike' }} tintColor={colors.teal} size={24} />
            </View>
            <View style={styles.rideCopy}>
              <Text style={styles.rideTitle}>A ride to Panagsama Beach</Text>
              <Text style={styles.date}>Oct 12, 2026 · 4:32 PM</Text>
            </View>
            <Text style={styles.price}>{'\u20B1'}65</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.bottomRow}>
            <View style={styles.status}><Text style={styles.statusText}>Completed</Text></View>
            <Pressable style={styles.detailsButton}><Text style={styles.detailsText}>View Details</Text><Text style={styles.arrow}>{'>'}</Text></Pressable>
          </View>
        </View>
        <DemoNote />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1 },
  card: { marginHorizontal: 22, padding: 14, borderWidth: 1, borderColor: colors.line, borderRadius: 8, backgroundColor: colors.white },
  topRow: { minHeight: 42, flexDirection: 'row', alignItems: 'center' },
  rideIcon: { width: 40, height: 40, borderRadius: 8, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  rideCopy: { flex: 1 },
  rideTitle: { color: colors.ink, fontSize: 11 },
  date: { color: colors.muted, fontSize: 8, marginTop: 5 },
  price: { color: colors.ink, fontSize: 11, fontWeight: '700', marginLeft: 8 },
  divider: { height: 1, backgroundColor: colors.line, marginTop: 13, marginBottom: 10 },
  bottomRow: { minHeight: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  status: { backgroundColor: colors.mint, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 5 },
  statusText: { color: colors.teal, fontSize: 9 },
  detailsButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingLeft: 10 },
  detailsText: { color: colors.teal, fontSize: 9, fontWeight: '600' },
  arrow: { color: colors.teal, fontSize: 17, marginLeft: 8 },
});
