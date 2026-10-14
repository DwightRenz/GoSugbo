import { Image } from 'expo-image';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader, colors, common, DemoNote } from '@/components/gosugbo/ui';

const coast = require('../../assets/gosugbo/moalboal.jpg');

function RideIllustration() {
  return (
    <View style={styles.illustration} accessibilityLabel="Illustration of a car">
      <View style={styles.carShadow} />
      <View style={styles.carRoof} />
      <View style={styles.carBody}>
        <View style={styles.carWindowLeft} />
        <View style={styles.carWindowRight} />
        <View style={styles.headlight} />
      </View>
      <View style={[styles.wheel, styles.wheelLeft]}><View style={styles.wheelCenter} /></View>
      <View style={[styles.wheel, styles.wheelRight]}><View style={styles.wheelCenter} /></View>
      <View style={styles.mapPin}><View style={styles.mapPinDot} /></View>
      <View style={styles.speedLineOne} />
      <View style={styles.speedLineTwo} />
    </View>
  );
}

function RideCard() {
  return (
    <Pressable style={styles.rideCard} onPress={() => router.push('/rides')}>
      <View style={styles.cardEyebrowRow}>
        <SymbolView name={{ ios: 'car.side', android: 'directions_car', web: 'directions_car' }} tintColor={colors.teal} size={14} />
        <Text style={styles.cardEyebrow}>  LET'S GO</Text>
      </View>
      <Text style={styles.cardTitle}>Book a Ride</Text>
      <Text style={styles.cardSubtitle}>Get there with GoSugbo.</Text>
      <Text style={styles.cardLink}>Find a ride  {'>'}</Text>
      <RideIllustration />
    </Pressable>
  );
}

export default function HomeScreen() {
  return (
    <View style={common.screen}>
      <AppHeader />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={common.scrollContent}>
        <View style={styles.welcomeTop}>
          <View style={styles.localRow}>
            <SymbolView name={{ ios: 'sun.max', android: 'light_mode', web: 'light_mode' }} tintColor={colors.teal} size={15} />
            <Text style={styles.localLine}>  A little local. A lot to love.</Text>
          </View>
          <View style={styles.townPill}><View style={styles.townDot} /><Text style={styles.townText}>Made for Moalboal</Text></View>
        </View>
        <View style={styles.intro}>
          <Text style={styles.title}>Where are we going today?</Text>
          <Text style={styles.subtitle}>Your next ride around Moalboal starts here.</Text>
        </View>

        <RideCard />

        <View style={styles.quickBook}>
          <View style={styles.quickHeading}>
            <SymbolView name={{ ios: 'paperplane', android: 'navigation', web: 'navigation' }} tintColor={colors.teal} size={19} />
            <Text style={styles.sectionTitle}>  A ride, right when you need it</Text>
          </View>
          <View style={styles.pickupField}>
            <View style={styles.pickupDot} />
            <View><Text style={styles.fieldLabel}>PICKUP</Text><Text style={styles.fieldValue}>My current location</Text></View>
          </View>
          <View style={styles.destinationRow}>
            <Pressable style={styles.destinationField} onPress={() => router.push('/rides')}>
              <SymbolView name={{ ios: 'mappin', android: 'location_on', web: 'location_on' }} tintColor={colors.muted} size={18} />
              <View><Text style={styles.fieldLabel}>DESTINATION</Text><Text style={styles.placeholder}>Where to?</Text></View>
            </Pressable>
            <Pressable style={styles.goButton} onPress={() => router.push('/rides')}>
              <Text style={styles.goText}>Let's go  {'>'}</Text>
            </Pressable>
          </View>
          <View style={styles.shortcutRow}>
            <Pressable style={styles.shortcut} onPress={() => router.push('/rides')}><Text style={styles.shortcutText}>+  Home</Text></Pressable>
            <Pressable style={styles.shortcut} onPress={() => router.push('/rides')}><Text style={styles.shortcutText}>+  Work</Text></Pressable>
            <Text style={styles.townTrips}>Easy trips around town</Text>
          </View>
        </View>

        <View style={styles.banner}>
          <Image source={coast} style={styles.bannerImage} contentFit="cover" accessibilityLabel="Moalboal coast" />
          <View style={styles.bannerTint}>
            <Text style={styles.bannerEyebrow}>YOUR TOWN. YOUR WAY.</Text>
            <Text style={styles.bannerTitle}>A little more local.{ '\n' }A little less hassle.</Text>
            <Text style={styles.bannerSubtitle}>Beach days, market runs & everyday trips.{ '\n' }Let's make the most of Moalboal.</Text>
            <Pressable style={styles.bannerButton} onPress={() => router.push('/rides')}><Text style={styles.bannerButtonText}>Explore your town  {'>'}</Text></Pressable>
          </View>
          <Text style={styles.bannerLocation}>Moalboal, Cebu</Text>
        </View>

        <View style={styles.activityHeader}>
          <Text style={styles.sectionTitle}>Your recent activity</Text>
          <Pressable onPress={() => router.push('/activity')}><Text style={styles.viewAll}>View all  {'>'}</Text></Pressable>
        </View>
        <Pressable style={styles.activityRow} onPress={() => router.push('/activity')}>
          <View style={styles.activityIcon}><SymbolView name={{ ios: 'bicycle', android: 'directions_bike', web: 'directions_bike' }} tintColor={colors.teal} size={21} /></View>
          <View style={styles.activityCopy}><Text style={styles.activityTitle}>A ride to Panagsama Beach</Text><Text style={styles.activityMeta}>Motorcycle · Oct 12, 2026 · Completed</Text></View>
          <Text style={styles.fare}>₱65</Text>
        </Pressable>
        <DemoNote />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  welcomeTop: { marginHorizontal: 22, marginTop: 23, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  localRow: { flexDirection: 'row', alignItems: 'center' },
  localLine: { color: colors.teal, fontSize: 10, fontWeight: '500' },
  townPill: { height: 28, paddingHorizontal: 9, borderWidth: 1, borderColor: colors.line, borderRadius: 16, backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center' },
  townDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.teal, marginRight: 5 },
  townText: { color: colors.muted, fontSize: 8 },
  intro: { marginHorizontal: 22, marginTop: 19, marginBottom: 26 },
  title: { color: colors.ink, fontSize: 29, lineHeight: 38, fontWeight: '800', letterSpacing: -0.6 },
  subtitle: { color: colors.muted, fontSize: 11, marginTop: 8 },
  rideCard: { height: 250, marginHorizontal: 22, borderRadius: 9, borderWidth: 1, borderColor: '#B5ECD8', backgroundColor: colors.mint, padding: 16, overflow: 'hidden' },
  cardEyebrow: { color: colors.teal, fontSize: 9, fontWeight: '700' },
  cardEyebrowRow: { flexDirection: 'row', alignItems: 'center' },
  cardTitle: { color: colors.ink, fontSize: 20, fontWeight: '700', marginTop: 13 },
  cardSubtitle: { color: colors.muted, fontSize: 11, marginTop: 8 },
  cardLink: { color: colors.teal, fontSize: 10, fontWeight: '700', marginTop: 16 },
  illustration: { position: 'absolute', width: 150, height: 103, right: 10, bottom: 8 },
  carShadow: { position: 'absolute', bottom: 1, right: 0, width: 130, height: 10, borderRadius: 10, backgroundColor: '#A7D9C4' },
  carRoof: { position: 'absolute', right: 25, bottom: 40, width: 84, height: 28, backgroundColor: '#208F83', borderTopLeftRadius: 12, borderTopRightRadius: 12, transform: [{ skewX: '-18deg' }] },
  carBody: { position: 'absolute', right: 14, bottom: 22, width: 110, height: 30, borderRadius: 8, backgroundColor: '#008577', flexDirection: 'row', alignItems: 'flex-start', paddingTop: 4, paddingHorizontal: 14 },
  carWindowLeft: { width: 27, height: 17, marginRight: 5, backgroundColor: '#A8DED1' },
  carWindowRight: { width: 31, height: 17, backgroundColor: '#A8DED1' },
  headlight: { position: 'absolute', right: 4, bottom: 8, width: 7, height: 9, borderRadius: 3, backgroundColor: '#F5E9AF' },
  wheel: { position: 'absolute', bottom: 9, width: 23, height: 23, borderRadius: 12, backgroundColor: '#263A3D', alignItems: 'center', justifyContent: 'center' },
  wheelLeft: { right: 84 },
  wheelRight: { right: 19 },
  wheelCenter: { width: 11, height: 11, borderRadius: 6, backgroundColor: '#84999A' },
  mapPin: { position: 'absolute', right: 7, top: 1, width: 14, height: 19, borderRadius: 8, backgroundColor: colors.teal, alignItems: 'center', paddingTop: 4 },
  mapPinDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.white },
  speedLineOne: { position: 'absolute', left: 0, bottom: 54, width: 25, height: 2, borderRadius: 2, backgroundColor: colors.teal },
  speedLineTwo: { position: 'absolute', left: 7, bottom: 43, width: 15, height: 2, borderRadius: 2, backgroundColor: colors.teal },
  quickBook: { marginHorizontal: 22, marginTop: 27 },
  quickHeading: { flexDirection: 'row', alignItems: 'center' },
  sectionTitle: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  pickupField: { height: 60, marginTop: 14, borderWidth: 1, borderColor: colors.line, borderRadius: 7, backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13 },
  pickupDot: { width: 10, height: 10, borderRadius: 6, borderWidth: 2, borderColor: colors.teal, marginRight: 13 },
  fieldLabel: { color: colors.muted, fontSize: 7, marginBottom: 5 },
  fieldValue: { color: colors.ink, fontSize: 12 },
  destinationRow: { flexDirection: 'row', marginTop: 9, alignItems: 'stretch' },
  destinationField: { height: 60, flex: 1, borderWidth: 1, borderColor: colors.line, borderRadius: 7, backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  placeholder: { color: colors.muted, fontSize: 12 },
  goButton: { width: 100, marginLeft: 9, borderRadius: 7, backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center' },
  goText: { color: colors.white, fontSize: 11, fontWeight: '700' },
  shortcutRow: { flexDirection: 'row', alignItems: 'center', marginTop: 13 },
  shortcut: { borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: '#F1F5F9', paddingHorizontal: 11, paddingVertical: 5, marginRight: 7 },
  shortcutText: { color: colors.muted, fontSize: 9 },
  townTrips: { color: colors.muted, fontSize: 8, marginLeft: 'auto' },
  banner: { height: 232, marginHorizontal: 22, marginTop: 25, borderRadius: 9, overflow: 'hidden' },
  bannerImage: { ...StyleSheet.absoluteFill, width: '100%', height: '100%' },
  bannerTint: { flex: 1, justifyContent: 'center', padding: 17, backgroundColor: 'rgba(0, 42, 47, 0.40)' },
  bannerEyebrow: { color: colors.white, fontSize: 8, fontWeight: '700' },
  bannerTitle: { color: colors.white, fontSize: 22, lineHeight: 27, fontWeight: '800', marginTop: 14 },
  bannerSubtitle: { color: colors.white, fontSize: 10, lineHeight: 16, marginTop: 9 },
  bannerButton: { alignSelf: 'flex-start', marginTop: 13, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 7, backgroundColor: colors.white },
  bannerButtonText: { color: colors.teal, fontSize: 10, fontWeight: '600' },
  bannerLocation: { position: 'absolute', bottom: 12, right: 13, color: colors.white, fontSize: 8 },
  activityHeader: { marginHorizontal: 22, marginTop: 27, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  viewAll: { color: colors.teal, fontSize: 9, fontWeight: '600' },
  activityRow: { marginHorizontal: 22, marginTop: 14, minHeight: 58, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.line, paddingBottom: 13 },
  activityIcon: { width: 40, height: 40, borderRadius: 9, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  activityCopy: { flex: 1 },
  activityTitle: { color: colors.ink, fontSize: 11 },
  activityMeta: { color: colors.muted, fontSize: 8, marginTop: 5 },
  fare: { color: colors.ink, fontSize: 11, fontWeight: '700' },
});
