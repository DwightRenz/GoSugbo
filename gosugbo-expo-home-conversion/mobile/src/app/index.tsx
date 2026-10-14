import { useState } from 'react';
import { Image, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';

const coast = require('../../assets/gosugbo/moalboal.jpg');
const pork = require('../../assets/gosugbo/pork-bowl.jpg');
const seafood = require('../../assets/gosugbo/seafood.jpg');

type Tab = 'Home' | 'Rides' | 'Food' | 'Activity' | 'Profile';

export default function HomeScreen() {
  const [tab, setTab] = useState<Tab>('Home');
  const [notice, setNotice] = useState('');

  const go = (next: Tab) => {
    setTab(next);
    setNotice(next === 'Home' ? '' : `${next} screen is next to convert. This is the working Home screen.`);
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#fffaf2" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.brandMark}><Text style={styles.brandMarkText}>G</Text></View>
          <View style={styles.brandWords}><Text style={styles.brand}>GoSugbo</Text><Text style={styles.tagline}>YOUR TOWN. YOUR WAY.</Text></View>
          <View style={styles.locationPill}><Text style={styles.locationDot}>●</Text><Text style={styles.locationText}>Moalboal</Text></View>
        </View>

        <View style={styles.welcome}>
          <Text style={styles.eyebrow}>A LITTLE LOCAL. A LOT TO LOVE.</Text>
          <Text style={styles.title}>Where are we{'\n'}going today?</Text>
          <Text style={styles.subtitle}>Your next ride. Your favorite bite. All right here.</Text>
        </View>

        <Pressable style={[styles.serviceCard, styles.rideCard]} onPress={() => go('Rides')}>
          <View style={styles.serviceCopy}>
            <Text style={styles.serviceEyebrow}>↗  LET’S GO</Text>
            <Text style={styles.serviceTitle}>Book a Ride</Text>
            <Text style={styles.serviceDescription}>Get there with GoSugbo.</Text>
            <Text style={styles.cta}>Find a ride  →</Text>
          </View>
          <View style={styles.rideIllustration}><Text style={styles.rideEmoji}>🛺</Text><View style={styles.sunShape} /></View>
        </Pressable>

        <Pressable style={[styles.serviceCard, styles.foodCard]} onPress={() => go('Food')}>
          <View style={styles.serviceCopy}>
            <Text style={[styles.serviceEyebrow, { color: '#9b4b27' }]}>♨  LET’S EAT</Text>
            <Text style={styles.serviceTitle}>Order Food</Text>
            <Text style={styles.serviceDescription}>Your local favorites, delivered.</Text>
            <Text style={[styles.cta, { color: '#9b4b27' }]}>Explore food  →</Text>
          </View>
          <View style={styles.foodIllustration}><Text style={styles.foodEmoji}>🥡</Text></View>
        </Pressable>

        <View style={styles.quickBook}>
          <Text style={styles.sectionTitle}>A ride, right when you need it</Text>
          <View style={styles.locationField}><Text style={styles.pin}>●</Text><View><Text style={styles.fieldLabel}>PICKUP</Text><Text style={styles.fieldValue}>My current location</Text></View></View>
          <View style={styles.locationField}><Text style={styles.pin}>⌖</Text><View><Text style={styles.fieldLabel}>DESTINATION</Text><Text style={styles.fieldValue}>Where to?</Text></View></View>
          <Pressable style={styles.primaryButton} onPress={() => go('Rides')}><Text style={styles.primaryButtonText}>Let’s go  →</Text></Pressable>
          <Text style={styles.helper}>Easy trips around town · Demo preview</Text>
        </View>

        <View style={styles.sectionHeader}><View><Text style={styles.sectionTitle}>Good food, close to you</Text><Text style={styles.sectionSubtitle}>Local kitchens. Big flavors.</Text></View><Pressable onPress={() => go('Food')}><Text style={styles.link}>Explore all →</Text></Pressable></View>
        <View style={styles.restaurantCard}>
          <Image source={pork} style={styles.restaurantImage} />
          <View style={styles.restaurantInfo}><Text style={styles.restaurantName}>Kusina sa Moalboal</Text><Text style={styles.restaurantMeta}>Filipino · BBQ  ·  20–30 min</Text><Text style={styles.rating}>★ 4.8  ·  ₱35 delivery</Text></View>
        </View>
        <View style={styles.restaurantCard}>
          <Image source={seafood} style={styles.restaurantImage} />
          <View style={styles.restaurantInfo}><Text style={styles.restaurantName}>Lantaw Seaside Kitchen</Text><Text style={styles.restaurantMeta}>Seafood · Filipino  ·  25–35 min</Text><Text style={styles.rating}>★ 4.9  ·  ₱40 delivery</Text></View>
        </View>

        <View style={styles.banner}>
          <Image source={coast} style={styles.bannerImage} />
          <View style={styles.bannerOverlay}><Text style={styles.bannerEyebrow}>YOUR TOWN. YOUR WAY.</Text><Text style={styles.bannerTitle}>A little more local.{'\n'}A little less hassle.</Text><Text style={styles.bannerCopy}>Beach days, market runs & favorite meals. Let’s make the most of Moalboal.</Text></View>
        </View>
        <Text style={styles.demoNote}>DEMO PREVIEW · Bookings and orders are simulated.</Text>
        {notice ? <View style={styles.notice}><Text style={styles.noticeText}>{notice}</Text></View> : null}
      </ScrollView>

      <View style={styles.tabBar}>
        {(['Home', 'Rides', 'Food', 'Activity', 'Profile'] as Tab[]).map((item) => (
          <Pressable key={item} onPress={() => go(item)} style={styles.tabItem}>
            <Text style={[styles.tabIcon, tab === item && styles.activeTab]}>{({ Home: '⌂', Rides: '↗', Food: '♨', Activity: '◷', Profile: '○' } as Record<Tab, string>)[item]}</Text>
            <Text style={[styles.tabLabel, tab === item && styles.activeTab]}>{item}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fffaf2' },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 26 },
  brandMark: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#176b52', alignItems: 'center', justifyContent: 'center' },
  brandMarkText: { color: '#fff', fontSize: 25, fontWeight: '900' },
  brandWords: { marginLeft: 10 },
  brand: { color: '#173d31', fontWeight: '900', fontSize: 21, letterSpacing: -0.5 },
  tagline: { color: '#748177', fontSize: 8, letterSpacing: 1.3, marginTop: 2, fontWeight: '700' },
  locationPill: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', backgroundColor: '#edf3e9', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 8 },
  locationDot: { color: '#237b57', fontSize: 9, marginRight: 5 },
  locationText: { color: '#315c46', fontSize: 12, fontWeight: '700' },
  welcome: { marginBottom: 20 },
  eyebrow: { color: '#b56c38', fontWeight: '800', letterSpacing: 1.6, fontSize: 10, marginBottom: 10 },
  title: { fontSize: 34, lineHeight: 38, color: '#183e31', fontWeight: '900', letterSpacing: -1.1 },
  subtitle: { color: '#68746c', fontSize: 13, lineHeight: 19, marginTop: 9 },
  serviceCard: { minHeight: 150, borderRadius: 22, padding: 18, marginBottom: 13, overflow: 'hidden', flexDirection: 'row', justifyContent: 'space-between' },
  rideCard: { backgroundColor: '#e6efe2' },
  foodCard: { backgroundColor: '#f9e7d7' },
  serviceCopy: { flex: 1, zIndex: 1 },
  serviceEyebrow: { color: '#176b52', fontSize: 10, letterSpacing: 1.1, fontWeight: '900', marginBottom: 9 },
  serviceTitle: { color: '#183e31', fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  serviceDescription: { color: '#657269', fontSize: 12, marginTop: 4 },
  cta: { color: '#176b52', fontWeight: '800', fontSize: 12, marginTop: 15 },
  rideIllustration: { width: 100, justifyContent: 'center', alignItems: 'center' },
  rideEmoji: { fontSize: 63 },
  sunShape: { position: 'absolute', width: 72, height: 72, borderRadius: 36, backgroundColor: '#d1e1c9', right: 2, top: 4, zIndex: -1 },
  foodIllustration: { width: 92, alignItems: 'center', justifyContent: 'center' },
  foodEmoji: { fontSize: 58 },
  quickBook: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#eee9df', borderRadius: 20, padding: 16, marginTop: 9, marginBottom: 27 },
  sectionTitle: { color: '#1b4134', fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  locationField: { borderWidth: 1, borderColor: '#e7e5dc', borderRadius: 12, minHeight: 57, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginTop: 10 },
  pin: { color: '#277452', fontSize: 17, width: 28, fontWeight: '800' },
  fieldLabel: { color: '#8a9189', fontSize: 9, fontWeight: '800', letterSpacing: 1, marginBottom: 3 },
  fieldValue: { color: '#3f5147', fontSize: 13, fontWeight: '600' },
  primaryButton: { backgroundColor: '#176b52', borderRadius: 12, minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  primaryButtonText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  helper: { color: '#8a9189', fontSize: 10, textAlign: 'center', marginTop: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13 },
  sectionSubtitle: { color: '#7a837b', fontSize: 12, marginTop: 4 },
  link: { color: '#176b52', fontSize: 12, fontWeight: '800' },
  restaurantCard: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', marginBottom: 12, borderWidth: 1, borderColor: '#eee9df' },
  restaurantImage: { width: '100%', height: 150, backgroundColor: '#eee' },
  restaurantInfo: { padding: 13 },
  restaurantName: { color: '#203f32', fontSize: 15, fontWeight: '800' },
  restaurantMeta: { color: '#737d74', fontSize: 11, marginTop: 5 },
  rating: { color: '#8a5b23', fontSize: 11, marginTop: 8, fontWeight: '700' },
  banner: { height: 220, borderRadius: 18, overflow: 'hidden', marginTop: 12 },
  bannerImage: { width: '100%', height: '100%', position: 'absolute' },
  bannerOverlay: { flex: 1, padding: 17, justifyContent: 'center', backgroundColor: 'rgba(17,48,36,0.48)' },
  bannerEyebrow: { color: '#fff0ce', fontSize: 9, fontWeight: '900', letterSpacing: 1.3 },
  bannerTitle: { color: '#fff', fontSize: 23, lineHeight: 27, fontWeight: '900', marginTop: 9 },
  bannerCopy: { color: '#fff', fontSize: 11, lineHeight: 16, marginTop: 8, maxWidth: 280 },
  demoNote: { textAlign: 'center', color: '#8c938a', fontSize: 9, letterSpacing: 0.4, marginTop: 22 },
  notice: { padding: 12, backgroundColor: '#e6efe2', borderRadius: 12, marginTop: 12 },
  noticeText: { color: '#24513e', fontSize: 12, textAlign: 'center' },
  tabBar: { minHeight: 62, paddingBottom: 5, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e9e6de', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  tabItem: { alignItems: 'center', justifyContent: 'center', minWidth: 54, paddingVertical: 5 },
  tabIcon: { color: '#929a91', fontSize: 21, marginBottom: 2 },
  tabLabel: { color: '#929a91', fontSize: 10, fontWeight: '600' },
  activeTab: { color: '#176b52', fontWeight: '900' },
});
