import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useRiderStats } from "@/hooks/use-rider-stats";
import { useAvailableRides } from "@/hooks/use-available-rides";
import { useActiveRide } from "@/hooks/use-active-ride";
import { useRiderLocationPush } from "@/hooks/use-rider-location-push";
import { fetchMyRiderProfile, setAvailability } from "@/services/riderService";
import LogoutButton from "./logout-button";

const ink = "#621B28";
const images = {
  ride: require("../../../assets/home/single-motor-pin.png"),
  pin: require("../../../assets/home/map-pin.png"),
  receipt: require("../../../assets/home/orders-pin.png"),
  profile: require("../../../assets/home/profile-pin.png"),
};
type IconName = keyof typeof images | "home" | "calendar" | "coins" | "star";

function Icon({ name, white = false }: { name: IconName; white?: boolean }) {
  const color = white ? "#FFFFFF" : ink;
  if (name === "coins")
    return (
      <View style={s.coins}>
        {[0, 1, 2].map((n) => (
          <View key={n} style={[s.coin, { top: n * 6, borderColor: color }]} />
        ))}
      </View>
    );
  if (name === "calendar")
    return (
      <View style={[s.calendar, { borderColor: color }]}>
        <View style={[s.calendarLine, { backgroundColor: color }]} />
        <View style={[s.calendarRing, { left: 5, backgroundColor: color }]} />
        <View style={[s.calendarRing, { right: 5, backgroundColor: color }]} />
      </View>
    );
  if (name === "home" || name === "star")
    return (
      <Text style={[s.symbol, { color }]}>{name === "home" ? "⌂" : "☆"}</Text>
    );
  return (
    <Image
      source={images[name]}
      style={[s.icon, { tintColor: color }]}
      resizeMode="contain"
      accessible={false}
    />
  );
}

const shortcuts: {
  title: string;
  detail: string;
  icon: IconName;
  color: string;
  arrow: string;
}[] = [
  {
    title: "Find Rides",
    detail: "Accept nearby bookings",
    icon: "pin",
    color: "#F4DCD5",
    arrow: "#A35050",
  },
  {
    title: "Earnings",
    detail: "View your income & history",
    icon: "receipt",
    color: "#F8DBB9",
    arrow: "#CD8748",
  },
  {
    title: "My Schedule",
    detail: "Set your availability",
    icon: "calendar",
    color: "#F3E7DA",
    arrow: "#CD967A",
  },
  {
    title: "My Account",
    detail: "Vehicle, documents & profile",
    icon: "profile",
    color: "#F4D6D0",
    arrow: "#A35050",
  },
];
const tabs: { title: string; icon: IconName }[] = [
  { title: "Home", icon: "home" },
  { title: "Trips", icon: "receipt" },
  { title: "Earnings", icon: "coins" },
  { title: "Profile", icon: "profile" },
];

function money(amount: number | null) {
  if (amount == null) return "—";
  return `₱${amount.toFixed(2)}`;
}

const NEXT_ACTION: Record<
  string,
  { label: string; status: "arrived_pickup" | "in_progress" | "completed" }
> = {
  accepted: { label: "I've arrived", status: "arrived_pickup" },
  arrived_pickup: { label: "Start trip", status: "in_progress" },
  in_progress: { label: "Complete trip", status: "completed" },
};

export default function RiderHomeScreen() {
  const { user } = useAuth();
  const { stats, loading, refreshing, refresh } = useRiderStats();
  const [online, setOnline] = useState(false);
  const [togglingOnline, setTogglingOnline] = useState(false);
  const [panel, setPanel] = useState<string | null>(null);
  const [available, setAvailable] = useState(true);

  const board = useAvailableRides(online);
  const active = useActiveRide(online);

  // Stream GPS to the backend while there's an active ride.
  useRiderLocationPush(
    active.ride?.rideId ?? null,
    active.ride?.status ?? null,
  );

  // Sync the toggle with the backend's actual availability on mount.
  useEffect(() => {
    let alive = true;
    fetchMyRiderProfile()
      .then((p) => {
        if (alive) setOnline(p.available);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  function openFeature(feature: string) {
    if (feature === "Earnings") {
      router.push("/rider-earnings");
      return;
    }
    setPanel(feature === "Home" ? null : feature);
  }

  async function onToggleOnline(next: boolean) {
    if (togglingOnline) return;
    setTogglingOnline(true);
    const previous = online;
    setOnline(next);
    try {
      const profile = await setAvailability(next);
      setOnline(profile.available);
    } catch (e: any) {
      setOnline(previous);
      Alert.alert(
        "Availability",
        e?.message ?? "Could not update availability.",
      );
    } finally {
      setTogglingOnline(false);
    }
  }

  async function onAccept() {
    const assigned = await board.accept();
    if (!assigned) {
      if (board.error) Alert.alert("Could not accept ride", board.error);
      return;
    }
    active.seed(assigned);
  }

  async function onAdvance() {
    if (!active.ride) return;
    const action = NEXT_ACTION[active.ride.status];
    if (!action) return;
    const updated = await active.advance(action.status);
    if (!updated) {
      if (active.error) Alert.alert("Ride update failed", active.error);
      return;
    }
    // Completion changes the stats — re-fetch them.
    if (updated.status === "completed") {
      refresh();
      board.refresh();
    }
  }

  function onRefresh() {
    refresh();
    board.refresh();
    active.refresh();
  }

  // ----- Card content -----
  const activeRide = active.ride;
  const availableRide = board.ride;
  const action = activeRide ? NEXT_ACTION[activeRide.status] : null;

  const title =
    activeRide ?
      activeRide.status === "accepted" ? "Ride Accepted"
      : activeRide.status === "arrived_pickup" ? "At pickup"
      : activeRide.status === "in_progress" ? "Trip in progress"
      : "Active ride"
    : availableRide ? "New Ride Request"
    : "No Requests";

  const route =
    activeRide ?
      {
        from: activeRide.pickup?.line1 ?? activeRide.pickup?.city ?? "Pickup",
        to:
          activeRide.dropoff?.city ??
          activeRide.dropoff?.line1 ??
          "Destination",
        fare: activeRide.fareAmount,
      }
    : availableRide ?
      {
        from:
          availableRide.pickup?.line1 ?? availableRide.pickup?.city ?? "Pickup",
        to: availableRide.dropoffCity ?? "Destination",
        fare: availableRide.estimatedFare,
      }
    : null;

  const showAccept = !activeRide && !!availableRide;
  const showAdvance = !!activeRide && !!action;
  const busy = active.updating || board.accepting;

  // ----- Stats -----
  const tripsValue = loading ? "…" : String(stats?.todayTrips ?? 0);
  const earningsValue =
    loading ? "…" : `₱${(stats?.todayEarnings ?? 0).toFixed(0)}`;
  const ratingValue = (() => {
    if (loading) return "…";
    const avg = stats?.ratingAvg ?? 0;
    const count = stats?.ratingCount ?? 0;
    if (!count || avg <= 0) return "—";
    return `${avg.toFixed(1)} ★`;
  })();

  const ratingSubLabel =
    !stats || stats.ratingCount === 0 ?
      "No ratings yet"
    : `${stats.ratingCount} rating${stats.ratingCount === 1 ? "" : "s"}`;

  return (
    <SafeAreaView style={s.screen}>
      <View style={s.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={ink}
            />
          }>
          <View style={s.header}>
            <View style={s.brandRow}>
              <Text style={s.logo}>GoSugbo·</Text>
              <View style={s.badge}>
                <View style={s.badgeIcon}>
                  <Icon name="ride" />
                </View>
                <Text style={s.badgeText}>Rider</Text>
              </View>
            </View>
            <View style={s.onlineControl}>
              <View
                style={[
                  s.dot,
                  { backgroundColor: online ? "#10AF72" : "#A18C81" },
                ]}
              />
              <Text style={s.onlineText}>{online ? "Online" : "Offline"}</Text>
              <Switch
                accessibilityLabel="Available for ride requests"
                value={online}
                onValueChange={onToggleOnline}
                disabled={togglingOnline}
                trackColor={{ false: "#D8CBC4", true: ink }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
          <Image
            source={require("../../../assets/auth/cebu-header.png")}
            style={s.bridge}
            resizeMode="cover"
            accessible={false}
          />
          <Text style={s.greeting}>
            Maayong adlaw, {user?.firstName ?? "Rider"}!
          </Text>
          <Text style={s.subtitle}>
            {online ? "Ready to take a trip?" : "Go online when you’re ready."}
          </Text>

          <View style={s.stats}>
            {[
              {
                icon: "ride" as const,
                label: "Today’s Trips",
                value: tripsValue,
              },
              {
                icon: "coins" as const,
                label: "Today’s Earnings",
                value: earningsValue,
              },
              { icon: "star" as const, label: "Rating", value: ratingValue },
            ].map((item, index) => (
              <View
                key={item.label}
                style={[s.stat, index > 0 && s.statBorder]}>
                <View style={s.statIcon}>
                  <Icon name={item.icon} white />
                </View>
                <Text style={s.statLabel}>{item.label}</Text>
                <Text style={s.statValue}>{item.value}</Text>
              </View>
            ))}
          </View>

          <Text style={s.ratingNote}>
            Rating: {ratingValue}
            {stats && stats.ratingCount > 0 ? ` · ${ratingSubLabel}` : ""}
          </Text>

          <View style={s.grid}>
            {shortcuts.map((item) => (
              <Pressable
                key={item.title}
                accessibilityRole="button"
                onPress={() => openFeature(item.title)}
                style={({ pressed }) => [
                  s.card,
                  { backgroundColor: item.color },
                  pressed && s.pressed,
                ]}>
                <View style={s.iconTile}>
                  <Icon name={item.icon} />
                </View>
                <Text style={s.cardTitle}>{item.title}</Text>
                <Text style={s.cardDetail}>{item.detail}</Text>
                <View style={[s.arrowCircle, { backgroundColor: item.arrow }]}>
                  <Text style={s.arrow}>→</Text>
                </View>
              </Pressable>
            ))}
          </View>

          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Current Task</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setPanel("Trips")}
              style={s.viewAll}>
              <Text style={s.viewAllText}>View all ›</Text>
            </Pressable>
          </View>
          <View style={s.request}>
            <View style={s.requestIcon}>
              <Icon name="ride" />
            </View>
            <View style={s.requestDetails}>
              <Text style={s.requestTitle}>{title}</Text>
              {board.loading && !route ?
                <View style={s.loadingRow}>
                  <ActivityIndicator size="small" color={ink} />
                  <Text style={s.loadingText}>Checking for requests…</Text>
                </View>
              : route ?
                <>
                  <View style={s.routeRow}>
                    <View style={s.pickupDot} />
                    <Text style={s.routeText}>{route.from}</Text>
                  </View>
                  <View style={s.routeConnector} />
                  <View style={s.routeRow}>
                    <View style={s.destinationDot} />
                    <Text style={s.routeText}>{route.to}</Text>
                  </View>
                  {route.fare != null && (
                    <Text style={s.fareText}>Fare: {money(route.fare)}</Text>
                  )}
                  {!online && !activeRide && (
                    <Text style={s.offlineNote}>
                      Go online to accept this ride.
                    </Text>
                  )}
                </>
              : <Text style={s.emptyText}>
                  {online ?
                    "No open requests right now. Pull to refresh."
                  : "Go online to see ride requests."}
                </Text>
              }
            </View>

            {showAccept && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Accept ride request"
                disabled={!online || busy}
                onPress={onAccept}
                style={({ pressed }) => [
                  s.accept,
                  (!online || busy) && s.disabled,
                  pressed && s.pressed,
                ]}>
                {board.accepting ?
                  <ActivityIndicator size="small" color="#FFFFFF" />
                : <Text style={s.acceptText}>Accept</Text>}
              </Pressable>
            )}

            {showAdvance && action && (
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                onPress={onAdvance}
                style={({ pressed }) => [
                  s.accept,
                  busy && s.disabled,
                  pressed && s.pressed,
                ]}>
                {active.updating ?
                  <ActivityIndicator size="small" color="#FFFFFF" />
                : <Text style={s.acceptText}>{action.label}</Text>}
              </Pressable>
            )}
          </View>
          <Text style={s.demo}>
            Live trips, earnings, requests, ride flow, tracking & ratings
          </Text>
        </ScrollView>

        <View style={s.navigation} accessibilityRole="tablist">
          {tabs.map((tab) => (
            <Pressable
              key={tab.title}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab.title === "Home" }}
              onPress={() => openFeature(tab.title)}>
              <View style={[s.tabIcon, tab.title === "Home" && s.activeTab]}>
                <Icon name={tab.icon} />
              </View>
              <Text style={[s.tabLabel, tab.title === "Home" && s.activeLabel]}>
                {tab.title}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Modal
        visible={panel !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setPanel(null)}>
        <View style={s.modalBackdrop}>
          <SafeAreaView style={s.sheet}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>{panel}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close panel"
                onPress={() => setPanel(null)}
                style={s.viewAll}>
                <Text style={s.viewAllText}>Close</Text>
              </Pressable>
            </View>
            <Text style={s.sheetText}>
              {panel === "Earnings" ?
                `Today’s earnings: ₱${(stats?.todayEarnings ?? 0).toFixed(2)} from ${stats?.todayTrips ?? 0} trips.`
              : panel === "My Schedule" ?
                "Set your availability for today."
              : panel === "Profile" || panel === "My Account" ?
                `${user?.firstName ?? "Rider"} ${user?.lastName ?? ""}\n${user?.email ?? ""}\nVehicle and document management will appear here when connected.`
              : "Ride details will appear here."}
            </Text>
            {panel === "My Schedule" && (
              <View style={s.availability}>
                <Text style={s.sheetText}>Available today</Text>
                <Switch
                  accessibilityLabel="Available today"
                  value={available}
                  onValueChange={setAvailable}
                  trackColor={{ true: ink, false: "#D8CBC4" }}
                />
              </View>
            )}
            {(panel === "Profile" || panel === "My Account") && (
              <View style={s.logout}>
                <LogoutButton />
              </View>
            )}
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFF3E9" },
  container: { flex: 1, width: "100%", maxWidth: 520, alignSelf: "center" },
  content: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 22 },
  header: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    zIndex: 1,
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  logo: {
    fontSize: 28,
    fontWeight: "900",
    color: "#AA3838",
    letterSpacing: -1,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FBE0C4",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 24,
  },
  badgeIcon: {
    width: 21,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: ink, fontWeight: "700", fontSize: 12 },
  onlineControl: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    paddingLeft: 10,
    paddingRight: 4,
    minHeight: 44,
  },
  onlineText: { color: ink, fontSize: 12 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  bridge: {
    height: 85,
    width: "100%",
    opacity: 0.7,
    marginTop: 8,
    borderRadius: 8,
  },
  greeting: {
    color: ink,
    fontWeight: "800",
    fontSize: 27,
    letterSpacing: -0.8,
    marginTop: 4,
  },
  subtitle: { color: "#8B766B", fontSize: 16, marginTop: 7, marginBottom: 24 },
  stats: {
    flexDirection: "row",
    backgroundColor: "#702832",
    borderRadius: 20,
    paddingVertical: 18,
    marginBottom: 8,
  },
  stat: { flex: 1, alignItems: "center", paddingHorizontal: 4 },
  statBorder: { borderLeftWidth: 1, borderLeftColor: "#BC8B7A" },
  statIcon: {
    width: 32,
    height: 31,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statLabel: { color: "#FFF7F2", fontSize: 11, textAlign: "center" },
  statValue: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "800",
    marginTop: 6,
  },
  ratingNote: {
    color: "#8B766B",
    fontSize: 11,
    textAlign: "right",
    marginBottom: 12,
    paddingRight: 4,
  },
  icon: { width: "100%", height: "100%", maxWidth: 30, maxHeight: 30 },
  symbol: { fontSize: 36, lineHeight: 39 },
  coins: { width: 29, height: 30 },
  coin: {
    position: "absolute",
    width: 26,
    height: 15,
    borderRadius: 13,
    borderWidth: 2,
    backgroundColor: "transparent",
  },
  calendar: { width: 27, height: 27, borderWidth: 2, borderRadius: 4 },
  calendarLine: { height: 2, marginTop: 7 },
  calendarRing: {
    position: "absolute",
    width: 3,
    height: 8,
    top: -5,
    borderRadius: 2,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  card: {
    width: "48%",
    flexGrow: 1,
    minHeight: 160,
    borderRadius: 20,
    padding: 15,
    paddingBottom: 42,
    boxShadow: "0 4px 9px rgba(100, 48, 30, 0.04)",
  },
  iconTile: {
    width: 43,
    height: 43,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 9,
  },
  cardTitle: {
    color: "#4E111A",
    fontWeight: "800",
    fontSize: 18,
    letterSpacing: -0.5,
  },
  cardDetail: { color: "#6C5144", fontSize: 13, lineHeight: 18, marginTop: 5 },
  arrowCircle: {
    position: "absolute",
    bottom: 13,
    right: 13,
    width: 29,
    height: 29,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  arrow: { color: "#FFFFFF", fontSize: 25, lineHeight: 28 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 19,
    marginBottom: 8,
    gap: 8,
  },
  sectionTitle: { color: "#4E111A", fontSize: 21, fontWeight: "800" },
  viewAll: { minHeight: 44, justifyContent: "center", paddingHorizontal: 4 },
  viewAllText: { color: ink, fontWeight: "700", fontSize: 14 },
  request: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
    boxShadow: "0 4px 12px rgba(100, 48, 30, 0.06)",
  },
  requestIcon: {
    width: 43,
    height: 43,
    backgroundColor: "#FBEBD9",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  requestDetails: { flex: 1, minWidth: 158 },
  requestTitle: {
    color: "#4E111A",
    fontWeight: "800",
    fontSize: 16,
    marginBottom: 10,
  },
  routeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  pickupDot: {
    width: 8,
    height: 8,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: "#CA957B",
  },
  destinationDot: {
    width: 8,
    height: 8,
    borderRadius: 5,
    backgroundColor: "#C95E4D",
  },
  routeText: { flex: 1, color: ink, fontSize: 12, lineHeight: 17 },
  routeConnector: {
    height: 9,
    borderLeftWidth: 1,
    borderStyle: "dashed",
    borderColor: "#C8A597",
    marginLeft: 3,
  },
  fareText: { fontSize: 12, color: "#087C35", fontWeight: "700", marginTop: 8 },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  loadingText: { color: "#8B766B", fontSize: 12 },
  emptyText: { color: "#8B766B", fontSize: 12, lineHeight: 17 },
  accept: {
    backgroundColor: "#702832",
    borderRadius: 25,
    paddingHorizontal: 22,
    minHeight: 44,
    justifyContent: "center",
    marginLeft: "auto",
  },
  acceptText: { color: "#FFFFFF", fontWeight: "700", fontSize: 16 },
  offlineNote: { fontSize: 11, color: "#8B766B", marginTop: 8 },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.75 },
  demo: { fontSize: 10, textAlign: "center", color: "#9A8175", marginTop: 14 },
  navigation: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 25,
    paddingVertical: 9,
  },
  tab: { flex: 1, alignItems: "center", minHeight: 56 },
  tabIcon: {
    height: 35,
    width: 65,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 23,
    opacity: 0.55,
  },
  activeTab: { backgroundColor: "#FBEBD9", opacity: 1 },
  tabLabel: { fontSize: 12, color: "#9A8980", marginTop: 5 },
  activeLabel: { color: ink, fontWeight: "700" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "#2E101766",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFF3E9",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 24,
    minHeight: 280,
  },
  sheetText: { color: ink, fontSize: 15, lineHeight: 24 },
  availability: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
  },
  logout: { height: 80, marginTop: 16 },
});
