import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const [activeTab, setActiveTab] = useState('Home');
  const [message, setMessage] = useState('');

  function preview(feature: string) {
    setMessage(`${feature} is coming soon.`);
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <Text style={styles.logo}>
            GoSugbo<Text style={styles.logoDot}>·</Text>
          </Text>

          <Pressable
            accessibilityRole="button"
            style={styles.location}
            onPress={() => preview('Choose location')}
          >
            <Text style={styles.locationIcon}>⌖</Text>
            <Text style={styles.locationText}>
              Panagsama, Basdiot
            </Text>
            <Text style={styles.locationChevron}>⌄</Text>
          </Pressable>

          <Text style={styles.greeting}>
            Maayong adlaw, Rene!
          </Text>
          <Text style={styles.subtitle}>
            Where to? What’s good?
          </Text>

          <View style={styles.services}>
            <Pressable
              accessibilityRole="button"
              onPress={() => preview('Book a ride')}
              style={({ pressed }) => [
                styles.serviceCard,
                styles.rideCard,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.serviceIcon}>
                <Text style={styles.serviceSymbol}>♧</Text>
              </View>

              <Text style={[styles.serviceTitle, styles.whiteText]}>
                Book a ride
              </Text>
              <Text
                style={[
                  styles.serviceDescription,
                  styles.whiteText,
                ]}
              >
                Around Moalboal, with ease
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => preview('Food delivery')}
              style={({ pressed }) => [
                styles.serviceCard,
                styles.foodCard,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.serviceIcon}>
                <Text style={styles.serviceSymbol}>♜</Text>
              </View>

              <Text style={styles.serviceTitle}>
                Food delivery
              </Text>
              <Text style={styles.serviceDescription}>
                Local flavors, to your door
              </Text>
            </Pressable>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My orders</Text>

            <Pressable
              accessibilityRole="button"
              onPress={() => preview('All orders')}
              style={styles.viewAllButton}
            >
              <Text style={styles.viewAllText}>View all</Text>
            </Pressable>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => preview('Your rides')}
            style={({ pressed }) => [
              styles.orderCard,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.orderIcon}>
              <Text style={styles.orderSymbol}>♧</Text>
            </View>

            <View style={styles.orderDetails}>
              <Text style={styles.orderTitle}>Your rides</Text>
              <Text style={styles.orderDescription}>
                View trips, receipts & food orders
              </Text>
            </View>

            <Text style={styles.chevron}>›</Text>
          </Pressable>

          {!!message && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Dismiss message"
              onPress={() => setMessage('')}
              style={styles.messageBox}
            >
              <Text
                style={styles.messageText}
                accessibilityLiveRegion="polite"
              >
                {message} Tap to dismiss.
              </Text>
            </Pressable>
          )}
        </ScrollView>

        <View style={styles.bottomNavigation}>
          {[
            { name: 'Home', icon: '⌂' },
            { name: 'Orders', icon: '▤' },
            { name: 'Inbox', icon: '♧' },
            { name: 'Profile', icon: '♙' },
          ].map((item) => {
            const selected = activeTab === item.name;

            return (
              <Pressable
                key={item.name}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                style={styles.navigationItem}
                onPress={() => {
                  setActiveTab(item.name);

                  if (item.name === 'Home') {
                    setMessage('');
                  } else {
                    preview(item.name);
                  }
                }}
              >
                <View
                  style={[
                    styles.navigationIcon,
                    selected && styles.activeNavigationIcon,
                  ]}
                >
                  <Text
                    style={[
                      styles.navigationSymbol,
                      selected && styles.selectedText,
                    ]}
                  >
                    {item.icon}
                  </Text>
                </View>

                <Text
                  style={[
                    styles.navigationLabel,
                    selected && styles.selectedText,
                  ]}
                >
                  {item.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F3E9DB',
  },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 24,
  },

  logo: {
    color: '#4C1C24',
    fontSize: 29,
    fontWeight: '800',
    letterSpacing: -1,
  },
  logoDot: {
    color: '#A64B3D',
  },
  location: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 7,
    minHeight: 44,
    marginTop: 4,
  },
  locationIcon: {
    fontSize: 19,
    color: '#4C1C24',
  },
  locationText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4C1C24',
  },
  locationChevron: {
    fontSize: 16,
    color: '#4C1C24',
  },
  greeting: {
    marginTop: 4,
    color: '#4C1C24',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  subtitle: {
    marginTop: 6,
    color: '#88766E',
    fontSize: 13,
    lineHeight: 18,
  },

  services: {
    flexDirection: 'row',
    gap: 11,
    marginTop: 16,
  },
  serviceCard: {
    flex: 1,
    minHeight: 141,
    borderRadius: 15,
    padding: 15,
  },
  rideCard: {
    backgroundColor: '#A64B3D',
  },
  foodCard: {
    backgroundColor: '#D2B48C',
  },
  serviceIcon: {
    width: 41,
    height: 41,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  serviceSymbol: {
    color: '#4C1C24',
    fontSize: 25,
  },
  serviceTitle: {
    color: '#4C1C24',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  serviceDescription: {
    color: '#4C1C24',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 9,
  },
  whiteText: {
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.8,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 1,
  },
  sectionTitle: {
    color: '#4C1C24',
    fontSize: 16,
    fontWeight: '700',
  },
  viewAllButton: {
    minHeight: 44,
    justifyContent: 'center',
  },
  viewAllText: {
    color: '#4C1C24',
    fontSize: 12,
    fontWeight: '700',
  },
  orderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    minHeight: 67,
    padding: 11,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3CFB9',
  },
  orderIcon: {
    width: 41,
    height: 41,
    borderRadius: 12,
    backgroundColor: '#F3E9DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderSymbol: {
    color: '#4C1C24',
    fontSize: 25,
  },
  orderDetails: {
    flex: 1,
  },
  orderTitle: {
    color: '#4C1C24',
    fontSize: 13,
    fontWeight: '700',
  },
  orderDescription: {
    color: '#88766E',
    fontSize: 10,
    lineHeight: 15,
    marginTop: 4,
  },
  chevron: {
    color: '#4C1C24',
    fontSize: 23,
    marginRight: 5,
  },
  messageBox: {
    padding: 12,
    marginTop: 14,
    backgroundColor: '#EADBC9',
    borderRadius: 12,
  },
  messageText: {
    color: '#4C1C24',
    fontSize: 12,
    lineHeight: 18,
  },

  bottomNavigation: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5D5C3',
    paddingTop: 9,
    paddingBottom: 5,
  },
  navigationItem: {
    flex: 1,
    alignItems: 'center',
    minHeight: 46,
  },
  navigationIcon: {
    width: 48,
    height: 28,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeNavigationIcon: {
    backgroundColor: '#F3E9DB',
  },
  navigationSymbol: {
    color: '#88766E',
    fontSize: 23,
    lineHeight: 27,
  },
  navigationLabel: {
    color: '#88766E',
    fontSize: 10,
    marginTop: 3,
  },
  selectedText: {
    color: '#4C1C24',
    fontWeight: '700',
  },
});