import { router } from "expo-router";
import { useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import LogoutButton from "./logout-button"; // ← NEW

const icons = {
  rightArrow: require("../../../assets/home/Right_Arrow.png"),
  location: require("../../../assets/home/map-pin.png"),
  ride: require("../../../assets/home/Motorcycle.png"),
  food: require("../../../assets/home/Food.png"),
  orders: require("../../../assets/home/Orders.png"),
  home: require("../../../assets/home/Home.png"),
  favorites: require("../../../assets/home/Favorites.png"),
  menu: require("../../../assets/home/Menu.png"),
};

const tabs = [
  { name: "Home", icon: icons.home },
  { name: "Orders", icon: icons.orders },
  { name: "Favorites", icon: icons.favorites },
  { name: "Menu", icon: icons.menu },
];

export default function HomeScreen() {
  const [activeTab, setActiveTab] = useState("Home");
  const [message, setMessage] = useState("");

  const { user } = useAuth();

  function preview(feature: string) {
    setMessage(`${feature} is coming soon.`);
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}>
          <View
            pointerEvents="none"
            style={styles.headerArt}
            accessible={false}>
            <View style={styles.hillBack} />
            <View style={styles.hillFront} />
            <View style={styles.bridgeDeck} />
            {[0, 1].map((tower) => (
              <View
                key={tower}
                style={[styles.bridgeTower, { left: tower === 0 ? 45 : 155 }]}>
                {[-55, -35, -15, 15, 35, 55].map((angle) => (
                  <View
                    key={angle}
                    style={[
                      styles.bridgeCable,
                      { transform: [{ rotate: `${angle}deg` }] },
                    ]}
                  />
                ))}
              </View>
            ))}
          </View>
          <View style={styles.titleRow}>
            <Text style={styles.logo}>
              <Text style={styles.logoGo}>Go</Text><Text style={styles.logoSugbo}>Sugbo</Text><Text style={styles.logoDot}>.</Text>
            </Text>
            <LogoutButton />
          </View>

          <Text style={styles.greeting}>
            Maayong adlaw{user?.firstName ? `, ${user.firstName}` : ""}!
          </Text>

          <Text style={styles.subtitle}>Where to? What’s good?</Text>

          <View style={styles.services}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/book-ride")}
              style={({ pressed }) => [
                styles.serviceCard,
                styles.rideCard,
                pressed && styles.pressed,
              ]}>
              <View style={styles.serviceIcon}>
                <Image
                  source={icons.ride}
                  style={styles.iconImage}
                  resizeMode="contain"
                  accessible={false}
                />
              </View>

              <Text style={[styles.serviceTitle, styles.whiteText]}>
                Book a ride
              </Text>

              <Text style={[styles.serviceDescription, styles.whiteText]}>
                Around Cebu, with ease
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => preview("Food delivery")}
              style={({ pressed }) => [
                styles.serviceCard,
                styles.foodCard,
                pressed && styles.pressed,
              ]}>
              <View style={styles.serviceIcon}>
                <Image
                  source={icons.food}
                  style={styles.iconImage}
                  resizeMode="contain"
                  accessible={false}
                />
              </View>

              <Text style={styles.serviceTitle}>Food delivery</Text>

              <Text style={styles.serviceDescription}>
                Local flavors, to your door
              </Text>
            </Pressable>
          </View>

          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeading}>
              <Image
                source={icons.orders}
                style={styles.sectionImage}
                resizeMode="contain"
                accessible={false}
              />
              <Text style={styles.sectionTitle}>My orders</Text>
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={() => preview("All orders")}
              style={styles.viewAllButton}>
              <Text style={styles.viewAllText}>View all</Text>
              <Image
                source={icons.rightArrow}
                style={styles.smallArrowImage}
                resizeMode="contain"
                accessible={false}
              />
            </Pressable>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/my-rides")}
            style={({ pressed }) => [
              styles.orderCard,
              pressed && styles.pressed,
            ]}>
            <View style={styles.orderIcon}>
              <Image
                source={icons.ride}
                style={styles.iconImage}
                resizeMode="contain"
                accessible={false}
              />
            </View>

            <View style={styles.orderDetails}>
              <Text style={styles.orderTitle}>Your rides</Text>

              <Text style={styles.orderDescription}>
                View trips, receipts & food orders
              </Text>
            </View>

            <Image
              source={icons.rightArrow}
              style={styles.smallArrowImage}
              resizeMode="contain"
              accessible={false}
            />
          </Pressable>

          {!!message && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Dismiss message"
              onPress={() => setMessage("")}
              style={styles.messageBox}>
              <Text style={styles.messageText} accessibilityLiveRegion="polite">
                {message} Tap to dismiss.
              </Text>
            </Pressable>
          )}
        </ScrollView>

        <View style={styles.bottomNavigation}>
          {tabs.map((item) => {
            const selected = activeTab === item.name;

            return (
              <Pressable
                key={item.name}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                style={styles.navigationItem}
                onPress={() => {
                  setActiveTab(item.name);

                  if (item.name === "Home") {
                    setMessage("");
                  } else {
                    preview(item.name);
                  }
                }}>
                <View
                  style={[
                    styles.navigationIcon,
                    selected && styles.activeNavigationIcon,
                  ]}>
                  <Image
                    source={item.icon}
                    style={styles.navigationImage}
                    resizeMode="contain"
                    accessible={false}
                  />
                </View>

                <Text
                  style={[
                    styles.navigationLabel,
                    selected && styles.selectedText,
                  ]}>
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
  arrowImage: { width: 22, height: 22 },
  smallArrowImage: { width: 17, height: 17 },
  headerArt: {
    position: "absolute",
    top: 12,
    right: -20,
    width: 260,
    height: 108,
    overflow: "hidden",
    opacity: 0.45,
  },
  hillBack: {
    position: "absolute",
    width: 180,
    height: 100,
    top: 28,
    right: 0,
    borderTopLeftRadius: 100,
    borderTopRightRadius: 90,
    backgroundColor: "#F6DCC5",
    transform: [{ rotate: "-12deg" }],
  },
  hillFront: {
    position: "absolute",
    width: 150,
    height: 70,
    top: 65,
    right: -25,
    borderRadius: 90,
    backgroundColor: "#EEC5A3",
  },
  bridgeDeck: {
    position: "absolute",
    left: 12,
    right: 0,
    top: 83,
    height: 3,
    backgroundColor: "#D69C79",
  },
  bridgeTower: {
    position: "absolute",
    top: 37,
    height: 57,
    width: 3,
    backgroundColor: "#D69C79",
  },
  bridgeCable: {
    position: "absolute",
    left: 1,
    top: 0,
    height: 49,
    width: 1,
    backgroundColor: "#D69C79",
    transformOrigin: "top",
  },
  cardGlow: {
    position: "absolute",
    width: 210,
    height: 250,
    borderRadius: 130,
    backgroundColor: "#BB5350",
    opacity: 0.28,
    left: -100,
    top: -80,
  },
  foodGlow: {
    position: "absolute",
    width: 230,
    height: 250,
    borderRadius: 130,
    backgroundColor: "#FFE9CD",
    opacity: 0.35,
    left: -110,
    top: -65,
  },
  rideWave: {
    position: "absolute",
    bottom: -50,
    left: -30,
    width: 290,
    height: 72,
    backgroundColor: "#B55A51",
    transform: [{ rotate: "12deg" }],
    opacity: 0.6,
  },
  foodWave: {
    position: "absolute",
    bottom: -49,
    left: -30,
    width: 290,
    height: 72,
    backgroundColor: "#DCA56C",
    transform: [{ rotate: "12deg" }],
    opacity: 0.65,
  },
  cardArrow: {
    alignSelf: "flex-end",
    marginTop: 16,
    width: 35,
    height: 35,
    borderRadius: 18,
    backgroundColor: "#FFF9F3",
    alignItems: "center",
    justifyContent: "center",
  },
  rideArrow: { color: "#A33332", fontSize: 26, lineHeight: 30 },
  foodArrow: { color: "#FFFFFF", fontSize: 26, lineHeight: 30 },
  sectionHeading: { flexDirection: "row", alignItems: "center", gap: 9 },
  sectionImage: { width: 23, height: 23 },
  screen: {
    flex: 1,
    backgroundColor: "#F4EADD",
  },
  container: {
    flex: 1,
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
  },

  // ← NEW: title row aligns logo left, logout right
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  logo: {
    color: "#4B1B22",
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -1,
  },
  logoGo: { color: "#A44A3F" },
  logoSugbo: { color: "#4B1B22" },
  logoDot: { color: "#A44A3F" },
  location: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 7,
    minHeight: 44,
    marginTop: 4,
  },
  locationImage: {
    width: 16,
    height: 16,
  },
  locationText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4C1C24",
  },
  locationChevron: {
    fontSize: 16,
    color: "#4C1C24",
  },
  greeting: {
    marginTop: 34,
    color: "#4C1C24",
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.6,
  },
  subtitle: {
    marginTop: 6,
    color: "#88766E",
    fontSize: 15,
    lineHeight: 22,
  },
  services: {
    flexDirection: "row",
    gap: 11,
    marginTop: 22,
  },
  serviceCard: {
    flex: 1,
    minHeight: 156,
    borderRadius: 16,
    padding: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#FFFFFF80",
  },
  rideCard: {
    backgroundColor: "#A84A3D",
  },
  foodCard: {
    backgroundColor: "#D2B48C",
  },
  serviceIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#FFF9F3",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  iconImage: {
    width: 32,
    height: 32,
  },
  serviceTitle: {
    color: "#4C1C24",
    fontSize: 19,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  serviceDescription: {
    color: "#4C1C24",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 9,
  },
  whiteText: {
    color: "#FFFFFF",
  },
  pressed: {
    opacity: 0.8,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 19,
    marginBottom: 9,
  },
  sectionTitle: {
    color: "#4C1C24",
    fontSize: 20,
    fontWeight: "700",
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    minHeight: 44,
    justifyContent: "center",
  },
  viewAllText: {
    color: "#4C1C24",
    fontSize: 12,
    fontWeight: "700",
  },
  orderCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    minHeight: 83,
    padding: 14,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F0D8C4",
    boxShadow: "0 6px 18px rgba(109, 56, 31, 0.05)",
  },
  orderIcon: {
    width: 49,
    height: 49,
    borderRadius: 16,
    backgroundColor: "#FBECDD",
    alignItems: "center",
    justifyContent: "center",
  },
  orderDetails: {
    flex: 1,
  },
  orderTitle: {
    color: "#4C1C24",
    fontSize: 16,
    fontWeight: "700",
  },
  orderDescription: {
    color: "#88766E",
    fontSize: 11,
    lineHeight: 17,
    marginTop: 4,
  },
  chevron: {
    color: "#4C1C24",
    fontSize: 23,
    marginRight: 5,
  },
  messageBox: {
    padding: 12,
    marginTop: 14,
    backgroundColor: "#EADBC9",
    borderRadius: 12,
  },
  messageText: {
    color: "#4C1C24",
    fontSize: 12,
    lineHeight: 18,
  },
  bottomNavigation: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E6D5C3",
    marginTop: 8,
    paddingTop: 11,
    paddingBottom: 10,
    boxShadow: "0 8px 28px rgba(109, 56, 31, 0.07)",
  },
  navigationItem: {
    flex: 1,
    alignItems: "center",
    minHeight: 52,
  },
  navigationIcon: {
    width: 58,
    height: 33,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  activeNavigationIcon: {
    backgroundColor: "#FBE8D4",
  },
  navigationImage: {
    width: 22,
    height: 22,
  },
  navigationSymbol: {
    color: "#88766E",
    fontSize: 23,
    lineHeight: 27,
  },
  navigationLabel: {
    color: "#88766E",
    fontSize: 11,
    marginTop: 5,
  },
  selectedText: {
    color: "#4C1C24",
    fontWeight: "700",
  },
});
