import { SymbolView } from 'expo-symbols';
import { StatusBar, StyleSheet, Text, View } from 'react-native';

export const colors = {
  page: '#F7F9FC',
  ink: '#07152D',
  muted: '#718096',
  teal: '#008577',
  mint: '#CCF8E7',
  line: '#DCE4EE',
  white: '#FFFFFF',
};

export function AppHeader() {
  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <View style={styles.header}>
        <View style={styles.logoMark}>
          <SymbolView
            name={{ ios: 'paperplane.fill', android: 'navigation', web: 'navigation' }}
            tintColor={colors.white}
            size={21}
          />
        </View>
        <View style={styles.brand}>
          <Text style={styles.brandName}>Go<Text style={{ color: colors.teal }}>Sugbo</Text></Text>
          <Text style={styles.tagline}>Your Town. Your Way.</Text>
        </View>
        <View style={styles.location}>
          <Text style={styles.locationLabel}>YOUR LOCATION</Text>
          <Text style={styles.locationName}>Moalboal, Cebu</Text>
        </View>
        <View style={styles.chevron}>
          <SymbolView name={{ ios: 'chevron.down', android: 'keyboard_arrow_down', web: 'keyboard_arrow_down' }} tintColor={colors.ink} size={15} />
        </View>
        <View style={styles.bell}>
          <SymbolView
            name={{ ios: 'bell', android: 'notifications_none', web: 'notifications_none' }}
            tintColor={colors.ink}
            size={21}
          />
        </View>
      </View>
    </>
  );
}

export function PageHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.pageHeading}>
      <Text style={styles.pageTitle}>{title}</Text>
      <Text style={styles.pageSubtitle}>{subtitle}</Text>
    </View>
  );
}

export function DemoNote() {
  return <Text style={styles.demoNote}>•  Demo experience  ·  No real rides</Text>;
}

export const common = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  scrollContent: { paddingBottom: 28 },
});

const styles = StyleSheet.create({
  header: {
    height: 72,
    paddingHorizontal: 22,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoMark: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: { marginLeft: 10, flex: 1 },
  brandName: { color: colors.ink, fontSize: 22, lineHeight: 25, fontWeight: '800' },
  tagline: { color: colors.muted, fontSize: 10, marginTop: 1 },
  location: { marginLeft: 8 },
  locationLabel: { color: colors.muted, fontSize: 7, marginBottom: 3 },
  locationName: { color: colors.ink, fontSize: 10, fontWeight: '600' },
  chevron: { marginHorizontal: 9 },
  chevronText: { color: colors.ink, fontSize: 12 },
  bell: {
    width: 38,
    height: 38,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageHeading: { paddingHorizontal: 22, paddingTop: 24, paddingBottom: 18 },
  pageTitle: { color: colors.ink, fontSize: 23, lineHeight: 29, fontWeight: '800' },
  pageSubtitle: { color: colors.muted, fontSize: 11, marginTop: 6 },
  demoNote: { color: colors.muted, fontSize: 10, textAlign: 'center', marginTop: 24, marginBottom: 12 },
});
