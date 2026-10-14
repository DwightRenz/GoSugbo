import { useState } from 'react';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader, colors, common, PageHeading } from '@/components/gosugbo/ui';

const destinations = ['Panagsama Beach', 'White Beach', 'Moalboal Public Market'];

function DemoMap() {
  return (
    <View style={styles.map}>
      <View style={styles.water} />
      <View style={[styles.park, styles.parkOne]} /><View style={[styles.park, styles.parkTwo]} />
      <View style={[styles.park, styles.parkThree]} /><View style={[styles.park, styles.parkFour]} />
      <View style={[styles.road, styles.roadA]} /><View style={[styles.road, styles.roadB]} />
      <View style={[styles.road, styles.roadC]} /><View style={[styles.road, styles.roadD]} />
      <View style={[styles.road, styles.roadE]} /><View style={[styles.road, styles.roadF]} />
      <View style={styles.routeDashA} /><View style={styles.routeDashB} /><View style={styles.routeDashC} />
      <View style={styles.routePoint}><View style={styles.routePointCenter} /></View>
      <View style={styles.destinationPoint} />
      <Text style={[styles.mapLabel, { left: '25%', top: '44%' }]}>Panagsama Beach</Text>
      <Text style={[styles.mapLabel, { right: '8%', top: '19%' }]}>Cebu South Road</Text>
      <Text style={[styles.mapLabel, { right: '4%', top: '70%' }]}>Moalboal</Text>
      <Text style={[styles.mapLabel, { right: '14%', bottom: '13%' }]}>Moalboal Public Market</Text>
      <View style={styles.mapCaption}><SymbolView name={{ ios: 'mappin', android: 'location_on', web: 'location_on' }} tintColor={colors.muted} size={13} /><Text style={styles.captionText}>  Moalboal, Cebu · Demo map</Text></View>
      <View style={styles.locateButton}><SymbolView name={{ ios: 'location.north.fill', android: 'navigation', web: 'navigation' }} tintColor={colors.teal} size={18} /></View>
    </View>
  );
}

export default function RidesScreen() {
  const [destination, setDestination] = useState('');

  return (
    <View style={common.screen}>
      <AppHeader />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={common.scrollContent}>
        <PageHeading title="Let's get you there" subtitle="Around Moalboal, your way." />
        <DemoMap />
        <View style={styles.form}>
          <Text style={styles.sectionTitle}>Where are you headed?</Text>
          <Pressable style={styles.locationField}>
            <View style={styles.pickupDot} />
            <View><Text style={styles.fieldLabel}>Pickup location</Text><Text style={styles.fieldValue}>Panagsama Beach</Text></View>
          </Pressable>
          <Pressable style={styles.locationField}>
            <SymbolView name={{ ios: 'mappin', android: 'location_on', web: 'location_on' }} tintColor={colors.ink} size={18} />
            <View><Text style={styles.fieldLabel}>Destination</Text><Text style={styles.fieldValue}>{destination || 'Where to?'}</Text></View>
          </Pressable>
          <View style={styles.swap}><SymbolView name={{ ios: 'arrow.up.arrow.down', android: 'swap_vert', web: 'swap_vert' }} tintColor={colors.teal} size={17} /></View>
          <Pressable style={styles.mapChoice}><SymbolView name={{ ios: 'mappin', android: 'location_on', web: 'location_on' }} tintColor={colors.teal} size={16} /><Text style={styles.mapChoiceText}>  Choose on map</Text></Pressable>
          <View style={styles.savedRow}>
            <Pressable style={styles.savedButton} onPress={() => setDestination('Basdiot, Moalboal')}><SymbolView name={{ ios: 'house', android: 'home', web: 'home' }} tintColor={colors.ink} size={15} /><Text style={styles.savedText}>  Home</Text></Pressable>
            <Pressable style={styles.savedButton} onPress={() => setDestination('Moalboal Public Market')}><SymbolView name={{ ios: 'briefcase', android: 'work_outline', web: 'work_outline' }} tintColor={colors.ink} size={15} /><Text style={styles.savedText}>  Work</Text></Pressable>
          </View>
          <Text style={styles.recentTitle}>Recent destinations</Text>
          {destinations.map((place) => (
            <Pressable key={place} style={styles.destinationRow} onPress={() => setDestination(place)}>
              <SymbolView name={{ ios: 'clock', android: 'schedule', web: 'schedule' }} tintColor={colors.muted} size={16} />
              <View style={styles.destinationCopy}><Text style={styles.destinationName}>{place}</Text><Text style={styles.destinationArea}>Moalboal, Cebu</Text></View>
              <Text style={styles.rowArrow}>{'>'}</Text>
            </Pressable>
          ))}
          <Pressable style={[styles.continueButton, !destination && styles.continueDisabled]} disabled={!destination} onPress={() => router.push('/activity')}>
            <Text style={styles.continueText}>Continue  {'>'}</Text>
          </Pressable>
          <Text style={styles.demoNote}>•  Demo experience · No real rides</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  map: { height: 216, backgroundColor: '#EEF4EE', overflow: 'hidden' },
  water: { position: 'absolute', left: -28, top: -15, bottom: -10, width: '23%', backgroundColor: '#8EDAE3', borderTopRightRadius: 38, transform: [{ skewY: '-15deg' }] },
  park: { position: 'absolute', backgroundColor: '#BFE5C8' },
  parkOne: { left: '38%', top: '8%', width: '14%', height: 44 },
  parkTwo: { right: '5%', top: '7%', width: '17%', height: 38 },
  parkThree: { left: '33%', bottom: '5%', width: '17%', height: 40 },
  parkFour: { right: '13%', bottom: '5%', width: '18%', height: 44 },
  road: { position: 'absolute', backgroundColor: '#FFFFFF' },
  roadA: { left: '18%', top: '24%', width: '90%', height: 8, transform: [{ rotate: '7deg' }] },
  roadB: { left: '16%', top: '50%', width: '92%', height: 8 },
  roadC: { left: '8%', top: '70%', width: '100%', height: 8, transform: [{ rotate: '-2deg' }] },
  roadD: { left: '40%', top: '-20%', width: 8, height: '150%', transform: [{ rotate: '-8deg' }] },
  roadE: { left: '61%', top: '-20%', width: 8, height: '150%', transform: [{ rotate: '4deg' }] },
  roadF: { right: '17%', top: '-20%', width: 8, height: '150%', transform: [{ rotate: '10deg' }] },
  routeDashA: { position: 'absolute', left: '29%', top: '48%', width: 95, height: 0, borderBottomWidth: 3, borderBottomColor: colors.teal, borderStyle: 'dashed', transform: [{ rotate: '-31deg' }] },
  routeDashB: { position: 'absolute', left: '48%', top: '35%', width: 83, height: 0, borderBottomWidth: 3, borderBottomColor: colors.teal, borderStyle: 'dashed', transform: [{ rotate: '18deg' }] },
  routeDashC: { position: 'absolute', left: '65%', top: '45%', width: 80, height: 0, borderBottomWidth: 3, borderBottomColor: colors.teal, borderStyle: 'dashed', transform: [{ rotate: '74deg' }] },
  routePoint: { position: 'absolute', left: '28%', top: '48%', width: 18, height: 18, borderRadius: 10, borderWidth: 4, borderColor: colors.white, backgroundColor: colors.teal },
  routePointCenter: { flex: 1, borderRadius: 6, backgroundColor: colors.teal },
  destinationPoint: { position: 'absolute', left: '64%', top: '76%', width: 14, height: 14, borderRadius: 8, backgroundColor: '#B75813', borderWidth: 3, borderColor: colors.white },
  mapLabel: { position: 'absolute', color: '#728078', fontSize: 7 },
  mapCaption: { position: 'absolute', bottom: 8, left: 12, paddingHorizontal: 9, paddingVertical: 6, backgroundColor: colors.white, borderRadius: 14, flexDirection: 'row', alignItems: 'center' },
  captionText: { color: colors.muted, fontSize: 8 },
  locateButton: { position: 'absolute', bottom: 5, right: 12, width: 38, height: 38, borderRadius: 19, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  form: { paddingHorizontal: 22, paddingTop: 23 },
  sectionTitle: { color: colors.ink, fontSize: 16, fontWeight: '700', marginBottom: 15 },
  locationField: { minHeight: 62, borderWidth: 1, borderColor: colors.line, borderRadius: 7, backgroundColor: colors.white, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', marginBottom: 9, elevation: 1 },
  pickupDot: { width: 9, height: 9, borderWidth: 2, borderColor: colors.teal, borderRadius: 5, marginRight: 13 },
  fieldLabel: { color: colors.muted, fontSize: 9, marginBottom: 5 },
  fieldValue: { color: colors.ink, fontSize: 12, fontWeight: '500' },
  swap: { position: 'absolute', top: 105, right: 30, zIndex: 2, width: 37, height: 37, borderRadius: 19, backgroundColor: colors.mint, borderWidth: 2, borderColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  mapChoice: { alignSelf: 'flex-start', marginTop: 6, marginBottom: 18, flexDirection: 'row', alignItems: 'center' },
  mapChoiceText: { color: colors.teal, fontSize: 11 },
  savedRow: { flexDirection: 'row', gap: 9 },
  savedButton: { flex: 1, height: 41, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 7, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, elevation: 1 },
  savedText: { color: colors.ink, fontSize: 12 },
  recentTitle: { color: colors.ink, fontSize: 12, marginTop: 23, marginBottom: 5 },
  destinationRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.line },
  clock: { width: 34, alignItems: 'center' },
  destinationCopy: { flex: 1 },
  destinationName: { color: colors.ink, fontSize: 11 },
  destinationArea: { color: colors.muted, fontSize: 9, marginTop: 4 },
  rowArrow: { color: colors.muted, fontSize: 16, paddingHorizontal: 8 },
  continueButton: { height: 45, borderRadius: 6, marginTop: 14, backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center' },
  continueDisabled: { opacity: 0.48 },
  continueText: { color: colors.white, fontSize: 12, fontWeight: '700' },
  demoNote: { color: colors.muted, fontSize: 9, textAlign: 'center', marginTop: 20, marginBottom: 14 },
});
