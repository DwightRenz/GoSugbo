import { useState } from "react";
import { router } from "expo-router";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const burgundy = "#701F2B";
const periods = ["Today", "This Week", "This Month"] as const;
type Period = (typeof periods)[number];

const trips = [
  {
    id: 1,
    route: "Panagsama → Moalboal Town",
    time: "Today, 8:24 AM",
    fare: 120,
    commission: 15,
    daysAgo: 0,
  },
  {
    id: 2,
    route: "White Beach → Basdiot",
    time: "Today, 7:12 AM",
    fare: 90,
    commission: 10,
    daysAgo: 0,
  },
  {
    id: 3,
    route: "Maravilla → Kawasan Falls",
    time: "Today, 6:30 AM",
    fare: 240,
    commission: 20,
    daysAgo: 0,
  },
  {
    id: 4,
    route: "Basdiot → Moalboal Market",
    time: "Yesterday, 4:15 PM",
    fare: 100,
    commission: 10,
    daysAgo: 1,
  },
  {
    id: 5,
    route: "Moalboal → White Beach",
    time: "10 days ago, 9:30 AM",
    fare: 150,
    commission: 15,
    daysAgo: 10,
  },
];

function money(amount: number) {
  return `₱${amount.toFixed(2)}`;
}

function Coins({ white = false }: { white?: boolean }) {
  return (
    <View style={styles.coins}>
      {[2, 1, 0].map((layer) => (
        <View
          key={layer}
          style={[
            styles.coin,
            {
              top: layer * 6,
              borderColor: white ? "#FFFFFF" : burgundy,
              backgroundColor: white ? burgundy : "#FFF1E4",
            },
          ]}
        />
      ))}
    </View>
  );
}

export default function RiderEarningsScreen() {
  const [period, setPeriod] = useState<Period>("Today");
  const [online, setOnline] = useState(true);
  const [wallet, setWallet] = useState(100);
  const [showAll, setShowAll] = useState(false);

  const filteredTrips = trips.filter((trip) => {
    if (period === "Today") return trip.daysAgo === 0;
    if (period === "This Week") return trip.daysAgo < 7;
    return trip.daysAgo < 30;
  });

  const commission = filteredTrips.reduce(
    (total, trip) => total + trip.commission,
    0,
  );

  const earnings = filteredTrips.reduce(
    (total, trip) => total + trip.fare - trip.commission,
    0,
  );

  const visibleTrips = showAll
    ? filteredTrips
    : filteredTrips.slice(0, 3);

  function topUp() {
    Alert.alert(
      "Demo wallet top-up",
      "Add ₱100 to your preview wallet? No payment will be made.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Add ₱100",
          onPress: () => setWallet((balance) => balance + 100),
        },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <View style={styles.header}>
            <View style={styles.brand}>
              <Text style={styles.logo}>GoSugbo·</Text>

              <View style={styles.riderBadge}>
                <Image
                  source={require("../../assets/home/single-motor-pin.png")}
                  style={styles.badgeImage}
                  resizeMode="contain"
                />
                <Text style={styles.badgeText}>Rider</Text>
              </View>
            </View>

            <View style={styles.onlineControl}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: online ? "#0DB477" : "#A49287" },
                ]}
              />
              <Text style={styles.onlineText}>
                {online ? "Online" : "Offline"}
              </Text>
              <Switch
                accessibilityLabel="Demo online status"
                value={online}
                onValueChange={setOnline}
                trackColor={{ false: "#D4C5BC", true: burgundy }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>

          <View style={styles.heading}>
            <Image
              source={require("../../assets/auth/cebu-header.png")}
              style={styles.bridge}
              resizeMode="cover"
              accessible={false}
            />
            <Text style={styles.title}>Earnings</Text>
            <Text style={styles.subtitle}>
              Track your income and commission
            </Text>
          </View>

          <View style={styles.summary}>
            <View style={styles.wave} />

            <View style={styles.earningsColumn}>
              <Text style={styles.summaryLabel}>
                {period === "Today" ? "Today’s Earnings" : `${period}’s Earnings`}
              </Text>
              <Text
                style={styles.earningsAmount}
                adjustsFontSizeToFit
                numberOfLines={1}
              >
                {money(earnings)}
              </Text>
              <Text style={styles.completed}>
                {filteredTrips.length} completed trips
              </Text>
            </View>

            <View style={styles.commissionColumn}>
              <Coins white />
              <Text style={styles.commissionLabel}>Commission</Text>
              <Text
                style={styles.commissionAmount}
                adjustsFontSizeToFit
                numberOfLines={1}
              >
                {money(commission)}
              </Text>
            </View>
          </View>

          <View style={styles.filters} accessibilityRole="tablist">
            {periods.map((item) => (
              <Pressable
                key={item}
                accessibilityRole="tab"
                accessibilityState={{ selected: period === item }}
                onPress={() => {
                  setPeriod(item);
                  setShowAll(false);
                }}
                style={[
                  styles.filter,
                  period === item && styles.selectedFilter,
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    period === item && styles.selectedFilterText,
                  ]}
                >
                  {item}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.wallet}>
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                Alert.alert(
                  "Commission Wallet",
                  `Demo balance: ${money(wallet)}\nThis wallet covers GoSugbo fees.`,
                )
              }
              style={styles.walletRow}
            >
              <View style={styles.walletIcon}>
                <View style={styles.walletOutline}>
                  <View style={styles.walletClasp} />
                </View>
              </View>

              <View style={styles.walletDetails}>
                <Text style={styles.walletTitle}>Commission Wallet</Text>
                <Text style={styles.walletDescription}>
                  Balance for GoSugbo fees
                </Text>
              </View>

              <Text style={styles.walletAmount}>{money(wallet)}</Text>
              <Text style={styles.chevron}>›</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={topUp}
              style={({ pressed }) => [
                styles.topUp,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.topUpText}>＋  Top Up Wallet</Text>
            </Pressable>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Trip History</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setShowAll((value) => !value)}
              style={styles.viewAll}
            >
              <Text style={styles.viewAllText}>
                {showAll ? "Show Less" : "View All"}  ›
              </Text>
            </Pressable>
          </View>

          {visibleTrips.map((trip) => (
            <Pressable
              key={trip.id}
              accessibilityRole="button"
              onPress={() =>
                Alert.alert(
                  trip.route,
                  `${trip.time}\n\nFare: ${money(trip.fare)}\nCommission: ${money(trip.commission)}\nYour earnings: ${money(trip.fare - trip.commission)}`,
                )
              }
              style={({ pressed }) => [
                styles.tripCard,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.tripIcon}>
                <Image
                  source={require("../../assets/home/single-motor-pin.png")}
                  style={styles.motorcycle}
                  resizeMode="contain"
                  accessible={false}
                />
              </View>

              <View style={styles.tripDetails}>
                <Text style={styles.tripRoute}>{trip.route}</Text>
                <Text style={styles.tripTime}>{trip.time}</Text>
                <Text style={styles.tripFees}>
                  Fare: ₱{trip.fare} · Commission: ₱{trip.commission}
                </Text>
              </View>

              <View style={styles.tripAmountRow}>
                <Text style={styles.tripAmount}>
                  {money(trip.fare - trip.commission)}
                </Text>
                <Text style={styles.chevron}>›</Text>
              </View>
            </Pressable>
          ))}

          <Text style={styles.demoNote}>
            Preview only · Sample earnings and wallet balance
          </Text>
        </ScrollView>

        <View style={styles.bottomNavigation}>
          {["Home", "Trips", "Earnings", "Profile"].map((tab) => (
            <Pressable
              key={tab}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === "Earnings" }}
              onPress={() => {
                if (tab === "Home") router.replace("/home");
                if (tab === "Trips") setShowAll(true);
                if (tab === "Profile") {
                  Alert.alert(
                    "Profile",
                    "Open My Account from the rider Home screen.",
                  );
                }
              }}
              style={styles.navigationItem}
            >
              <View
                style={[
                  styles.navigationIcon,
                  tab === "Earnings" && styles.activeNavigation,
                ]}
              >
                {tab === "Earnings" ? (
                  <Coins />
                ) : tab === "Home" ? (
                  <Text style={styles.homeSymbol}>⌂</Text>
                ) : (
                  <Image
                    source={
                      tab === "Trips"
                        ? require("../../assets/home/orders-pin.png")
                        : require("../../assets/home/profile-pin.png")
                    }
                    style={styles.tabImage}
                    resizeMode="contain"
                    accessible={false}
                  />
                )}
              </View>
              <Text
                style={[
                  styles.navigationLabel,
                  tab === "Earnings" && styles.activeLabel,
                ]}
              >
                {tab}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFF3E9" },
  container: {
    flex: 1,
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
  },
  content: { padding: 16, paddingBottom: 24 },
  header: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 8 },
  logo: {
    color: "#AC333B",
    fontSize: 27,
    fontWeight: "900",
    letterSpacing: -1,
  },
  riderBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 24,
    backgroundColor: "#FBE0C4",
  },
  badgeImage: { width: 21, height: 19, tintColor: burgundy },
  badgeText: { color: burgundy, fontWeight: "700", fontSize: 12 },
  onlineControl: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingLeft: 10,
    paddingRight: 3,
    backgroundColor: "#FFFFFF",
    borderRadius: 25,
    minHeight: 44,
  },
  statusDot: { width: 9, height: 9, borderRadius: 5 },
  onlineText: { color: burgundy, fontSize: 12 },
  heading: {
    marginTop: 24,
    paddingTop: 12,
    paddingBottom: 20,
    overflow: "hidden",
  },
  bridge: {
    position: "absolute",
    right: -30,
    bottom: 0,
    width: "85%",
    height: 110,
    opacity: 0.5,
  },
  title: {
    color: "#530F1B",
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: -1,
  },
  subtitle: { color: "#77675E", fontSize: 15, marginTop: 6 },
  summary: {
    backgroundColor: burgundy,
    borderRadius: 20,
    paddingVertical: 22,
    paddingHorizontal: 18,
    flexDirection: "row",
    overflow: "hidden",
    marginTop: 4,
  },
  wave: {
    position: "absolute",
    bottom: -75,
    left: -30,
    width: 500,
    height: 100,
    backgroundColor: "#A93F48",
    borderRadius: 100,
    transform: [{ rotate: "-6deg" }],
  },
  earningsColumn: { flex: 1.6, paddingRight: 12 },
  summaryLabel: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  earningsAmount: {
    color: "#FFFFFF",
    fontSize: 38,
    fontWeight: "800",
    marginTop: 4,
  },
  completed: { color: "#FFF4ED", fontSize: 14, marginTop: 7 },
  commissionColumn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderLeftWidth: 1,
    borderLeftColor: "#BF8A85",
    paddingLeft: 12,
  },
  coins: { width: 30, height: 31 },
  coin: {
    position: "absolute",
    width: 27,
    height: 15,
    borderWidth: 2,
    borderRadius: 14,
  },
  commissionLabel: { color: "#FFFFFF", fontSize: 13, marginTop: 5 },
  commissionAmount: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 24,
    marginTop: 5,
  },
  filters: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#EBD6C8",
    borderRadius: 28,
    padding: 2,
    marginVertical: 17,
  },
  filter: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 25,
  },
  selectedFilter: { backgroundColor: burgundy },
  filterText: { color: "#58222A", fontSize: 14 },
  selectedFilterText: { color: "#FFFFFF", fontWeight: "700" },
  wallet: {
    padding: 13,
    backgroundColor: "#F6E0DA",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#EFD6CB",
  },
  walletRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 9,
    minHeight: 55,
  },
  walletIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FFF0DF",
    alignItems: "center",
    justifyContent: "center",
  },
  walletOutline: {
    width: 27,
    height: 21,
    borderWidth: 2,
    borderRadius: 4,
    borderColor: burgundy,
  },
  walletClasp: {
    position: "absolute",
    right: -2,
    top: 6,
    width: 10,
    height: 8,
    borderWidth: 2,
    borderColor: burgundy,
    borderRadius: 3,
  },
  walletDetails: { flex: 1, minWidth: 125 },
  walletTitle: { color: "#581421", fontSize: 16, fontWeight: "800" },
  walletDescription: { color: "#735349", fontSize: 11, marginTop: 3 },
  walletAmount: { color: burgundy, fontWeight: "800", fontSize: 21 },
  chevron: { color: burgundy, fontSize: 29 },
  topUp: {
    backgroundColor: burgundy,
    minHeight: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  topUpText: { color: "#FFFFFF", fontSize: 17, fontWeight: "700" },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 17,
    marginBottom: 8,
  },
  sectionTitle: { color: "#530F1B", fontSize: 22, fontWeight: "800" },
  viewAll: { minHeight: 44, justifyContent: "center", paddingHorizontal: 4 },
  viewAllText: { color: burgundy, fontWeight: "700", fontSize: 14 },
  tripCard: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 11,
    padding: 13,
    marginBottom: 9,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#F2DFD2",
    backgroundColor: "#FFFAF6",
    boxShadow: "0 3px 6px rgba(100, 45, 25, 0.04)",
  },
  tripIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: "#FCE8D6",
    alignItems: "center",
    justifyContent: "center",
  },
  motorcycle: { width: 29, height: 29, tintColor: burgundy },
  tripDetails: { flex: 1, minWidth: 155 },
  tripRoute: { color: "#2F1714", fontSize: 14, fontWeight: "700" },
  tripTime: { color: "#7B6256", fontSize: 12, marginTop: 4 },
  tripFees: { color: "#74483E", fontSize: 11, marginTop: 4 },
  tripAmountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginLeft: "auto",
  },
  tripAmount: { color: "#087C35", fontSize: 18, fontWeight: "800" },
  demoNote: {
    textAlign: "center",
    color: "#A18B7D",
    fontSize: 10,
    marginTop: 8,
  },
  bottomNavigation: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    paddingVertical: 10,
  },
  navigationItem: { flex: 1, alignItems: "center", minHeight: 56 },
  navigationIcon: {
    width: 65,
    height: 35,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 23,
  },
  activeNavigation: { backgroundColor: "#FBEADB" },
  tabImage: { width: 26, height: 26, tintColor: "#96847A" },
  homeSymbol: { fontSize: 36, lineHeight: 39, color: "#96847A" },
  navigationLabel: { color: "#96847A", fontSize: 12, marginTop: 5 },
  activeLabel: { color: burgundy, fontWeight: "800" },
  pressed: { opacity: 0.75 },
});