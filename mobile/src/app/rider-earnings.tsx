import { useMemo, useState } from "react";
import { router } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  filterTripsByPeriod,
  useRiderEarnings,
  type EarningsPeriod,
} from "@/hooks/use-rider-earnings";
import type { EarningsTrip } from "@/services/riderService";

const burgundy = "#701F2B";
const periods: EarningsPeriod[] = ["Today", "This Week", "This Month"];

function money(amount: number) {
  return `₱${amount.toFixed(2)}`;
}

function formatTripTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const time = d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  if (sameDay) return `Today, ${time}`;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
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
  const [period, setPeriod] = useState<EarningsPeriod>("Today");
  const [showAll, setShowAll] = useState(false);

  const { trips, loading, refreshing, error, refresh } = useRiderEarnings();

  const filteredTrips = useMemo(
    () => filterTripsByPeriod(trips, period),
    [trips, period],
  );

  const earnings = useMemo(
    () => filteredTrips.reduce((sum, t) => sum + t.fare, 0),
    [filteredTrips],
  );

  const visibleTrips = showAll ? filteredTrips : filteredTrips.slice(0, 3);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={burgundy}
            />
          }>
          <View style={styles.header}>
            <View style={styles.brand}>
              <Text style={styles.logo}>GoSugbo·</Text>
              <View style={styles.riderBadge}>
                <Image
                  source={require("../../assets/home/Motorcycle.png")}
                  style={styles.badgeImage}
                  resizeMode="contain"
                />
                <Text style={styles.badgeText}>Rider</Text>
              </View>
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
              Track your completed trips and income
            </Text>
          </View>

          <View style={styles.summary}>
            <View style={styles.wave} />
            <View style={styles.earningsColumn}>
              <Text style={styles.summaryLabel}>
                {period === "Today" ?
                  "Today’s Earnings"
                : `${period}’s Earnings`}
              </Text>
              <Text
                style={styles.earningsAmount}
                adjustsFontSizeToFit
                numberOfLines={1}>
                {loading ? "…" : money(earnings)}
              </Text>
              <Text style={styles.completed}>
                {loading ?
                  "Loading…"
                : `${filteredTrips.length} completed trip${filteredTrips.length === 1 ? "" : "s"}`
                }
              </Text>
            </View>
            <View style={styles.commissionColumn}>
              <Coins white />
              <Text style={styles.commissionLabel}>Trips</Text>
              <Text style={styles.commissionAmount}>
                {loading ? "…" : String(filteredTrips.length)}
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
                ]}>
                <Text
                  style={[
                    styles.filterText,
                    period === item && styles.selectedFilterText,
                  ]}>
                  {item}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Trip History</Text>
            {filteredTrips.length > 3 && (
              <Pressable
                accessibilityRole="button"
                onPress={() => setShowAll((v) => !v)}
                style={styles.viewAll}>
                <Text style={styles.viewAllText}>
                  {showAll ? "Show Less" : "View All"} ›
                </Text>
              </Pressable>
            )}
          </View>

          {loading ?
            <View style={styles.center}>
              <ActivityIndicator color={burgundy} />
              <Text style={styles.centerText}>Loading trips…</Text>
            </View>
          : error ?
            <View style={styles.center}>
              <Text style={styles.errorText}>{error}</Text>
              <Pressable onPress={refresh} style={styles.retry}>
                <Text style={styles.retryText}>Try again</Text>
              </Pressable>
            </View>
          : visibleTrips.length === 0 ?
            <View style={styles.center}>
              <Text style={styles.emptyText}>
                No completed trips{" "}
                {period === "Today" ? "today" : `in ${period.toLowerCase()}`}.
              </Text>
            </View>
          : visibleTrips.map((trip) => (
              <TripCard key={trip.rideId} trip={trip} />
            ))
          }

          <Text style={styles.demoNote}>
            Live completed trips · Commission and wallet coming soon
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
              style={styles.navigationItem}>
              <View
                style={[
                  styles.navigationIcon,
                  tab === "Earnings" && styles.activeNavigation,
                ]}>
                {tab === "Earnings" ?
                  <Coins />
                : tab === "Home" ?
                  <Text style={styles.homeSymbol}>⌂</Text>
                : <Image
                    source={
                      tab === "Trips" ?
                        require("../../assets/home/orders-pin.png")
                      : require("../../assets/home/profile-pin.png")
                    }
                    style={styles.tabImage}
                    resizeMode="contain"
                    accessible={false}
                  />
                }
              </View>
              <Text
                style={[
                  styles.navigationLabel,
                  tab === "Earnings" && styles.activeLabel,
                ]}>
                {tab}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

function TripCard({ trip }: { trip: EarningsTrip }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() =>
        Alert.alert(
          trip.route,
          `${formatTripTime(trip.completedAt)}\n\nFare: ${money(trip.fare)}`,
        )
      }
      style={({ pressed }) => [styles.tripCard, pressed && styles.pressed]}>
      <View style={styles.tripIcon}>
        <Image
          source={require("../../assets/home/Motorcycle.png")}
          style={styles.motorcycle}
          resizeMode="contain"
          accessible={false}
        />
      </View>
      <View style={styles.tripDetails}>
        <Text style={styles.tripRoute}>{trip.route}</Text>
        <Text style={styles.tripTime}>{formatTripTime(trip.completedAt)}</Text>
      </View>
      <View style={styles.tripAmountRow}>
        <Text style={styles.tripAmount}>{money(trip.fare)}</Text>
        <Text style={styles.chevron}>›</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFF3E9" },
  container: { flex: 1, width: "100%", maxWidth: 520, alignSelf: "center" },
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
  tripAmountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginLeft: "auto",
  },
  tripAmount: { color: "#087C35", fontSize: 18, fontWeight: "800" },
  chevron: { color: burgundy, fontSize: 29 },
  center: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 30,
    gap: 10,
  },
  centerText: { color: "#77675E", fontSize: 13 },
  errorText: { color: "#A92D36", fontSize: 13, textAlign: "center" },
  emptyText: { color: "#88766E", fontSize: 13, textAlign: "center" },
  retry: {
    minHeight: 44,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: burgundy,
    alignItems: "center",
    justifyContent: "center",
  },
  retryText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  demoNote: {
    textAlign: "center",
    color: "#A18B7D",
    fontSize: 10,
    marginTop: 12,
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
