import { router } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMyRides } from "@/hooks/use-my-rides";
import { formatPlace } from "@/lib/format";
import type { Ride } from "@/types/ride";

const STATUS_LABEL: Record<Ride["status"], string> = {
  requested: "Looking for a rider…",
  accepted: "Rider on the way",
  arrived_pickup: "Rider has arrived",
  in_progress: "On the way",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
};

const ACTIVE: Ride["status"][] = [
  "requested",
  "accepted",
  "arrived_pickup",
  "in_progress",
];

function money(amount: number | null) {
  if (amount == null) return "—";
  return `₱${amount.toFixed(2)}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function RideCard({ ride, onPress }: { ride: Ride; onPress: () => void }) {
  const isActive = ACTIVE.includes(ride.status);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        isActive && styles.activeCard,
        pressed && styles.pressed,
      ]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.status, isActive && styles.activeStatus]}>
          {STATUS_LABEL[ride.status]}
        </Text>
        <Text style={styles.date}>{formatDate(ride.requestedAt)}</Text>
      </View>
      <Text style={styles.route} numberOfLines={1}>
        {formatPlace(ride.pickup, "Pickup")} →{" "}
        {formatPlace(ride.dropoff, "Destination")}
      </Text>
      <View style={styles.cardFooter}>
        <Text style={styles.fare}>{money(ride.fareAmount)}</Text>
        {ride.rider && (
          <Text style={styles.rider}>Rider: {ride.rider.fullName}</Text>
        )}
      </View>
    </Pressable>
  );
}

export default function MyRidesScreen() {
  const { rides, activeRide, loading, refreshing, error, refresh } =
    useMyRides();

  const history = rides.filter((r) => r.rideId !== activeRide?.rideId);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace("/home")
            }
            accessibilityRole="button"
            accessibilityLabel="Back"
            style={styles.headerButton}>
            <Text style={styles.backArrow}>‹</Text>
          </Pressable>
          <Text style={styles.headerTitle}>My rides</Text>
          <View style={styles.headerButton} />
        </View>

        {loading && rides.length === 0 && !activeRide ?
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#4C1C24" />
            <Text style={styles.centerText}>Loading your rides…</Text>
          </View>
        : error ?
          <View style={styles.center}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={refresh} style={styles.retry}>
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        : <ScrollView
            contentContainerStyle={styles.content}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={refresh}
                tintColor="#4C1C24"
              />
            }>
            {activeRide && (
              <>
                <Text style={styles.sectionTitle}>Active ride</Text>
                <RideCard
                  ride={activeRide}
                  onPress={() =>
                    router.push(`/ride-tracking?rideId=${activeRide.rideId}`)
                  }
                />
              </>
            )}

            <Text style={styles.sectionTitle}>Past rides</Text>
            {history.length === 0 ?
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>No rides yet.</Text>
                <Pressable
                  onPress={() => router.push("/book-ride")}
                  style={styles.bookButton}>
                  <Text style={styles.bookButtonText}>Book a ride</Text>
                </Pressable>
              </View>
            : history.map((ride) => (
                <RideCard
                  key={ride.rideId}
                  ride={ride}
                  onPress={() =>
                    router.push(`/ride-tracking?rideId=${ride.rideId}`)
                  }
                />
              ))
            }
          </ScrollView>
        }
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F3E9DB" },
  container: { flex: 1, maxWidth: 480, alignSelf: "center", width: "100%" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  backArrow: { fontSize: 32, color: "#4C1C24", lineHeight: 34 },
  headerTitle: {
    flex: 1,
    color: "#4C1C24",
    fontSize: 18,
    fontWeight: "700",
    marginLeft: 2,
  },
  content: { paddingHorizontal: 20, paddingBottom: 24, gap: 10 },
  sectionTitle: {
    color: "#4C1C24",
    fontSize: 14,
    fontWeight: "800",
    marginTop: 10,
    marginBottom: 4,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#E3CFB9",
    padding: 14,
    gap: 8,
  },
  activeCard: { borderColor: "#922E34", borderWidth: 2 },
  pressed: { opacity: 0.8 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between" },
  status: { color: "#88766E", fontSize: 12, fontWeight: "700" },
  activeStatus: { color: "#922E34" },
  date: { color: "#88766E", fontSize: 11 },
  route: { color: "#4C1C24", fontSize: 14, fontWeight: "600" },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  fare: { color: "#26734D", fontSize: 14, fontWeight: "800" },
  rider: { color: "#88766E", fontSize: 11 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 24,
  },
  centerText: { color: "#4C1C24", fontSize: 13 },
  errorText: { color: "#A92D36", fontSize: 13, textAlign: "center" },
  retry: {
    minHeight: 44,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: "#4C1C24",
    alignItems: "center",
    justifyContent: "center",
  },
  retryText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  emptyBox: { alignItems: "center", paddingVertical: 30, gap: 12 },
  emptyText: { color: "#88766E", fontSize: 13 },
  bookButton: {
    minHeight: 44,
    paddingHorizontal: 22,
    borderRadius: 12,
    backgroundColor: "#922E34",
    alignItems: "center",
    justifyContent: "center",
  },
  bookButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
});
