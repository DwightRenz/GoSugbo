import { useEffect, useMemo, useRef, useState } from "react";
import MapView, { Marker } from "react-native-maps";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import BackArrow from "@/components/gosugbo/back-arrow";
import RatingModal from "@/components/gosugbo/rating-modal";
import { ApiError } from "@/lib/api";
import { formatPlace, formatPeso } from "@/lib/format";
import {
  cancelRide,
  fetchRide,
  fetchRideHistory,
  rateRider,
} from "@/services/rideService";
import {
  initiateRideCheckout,
  verifyRideCheckout,
} from "@/services/paymentService";
import { useRideTracking } from "@/hooks/use-ride-tracking";
import type { Ride, RideStatus, RideStatusHistoryEntry } from "@/types/ride";

const STATUS_LABEL: Record<RideStatus, string> = {
  requested: "Looking for a rider…",
  accepted: "Rider on the way",
  arrived_pickup: "Rider has arrived",
  in_progress: "On the way to destination",
  completed: "Ride completed",
  cancelled: "Ride cancelled",
  no_show: "No-show",
};

const POLL_MS = 3000;

export default function RideTrackingScreen() {
  const params = useLocalSearchParams<{ rideId?: string }>();
  const rideId = params.rideId ? Number(params.rideId) : null;

  const [ride, setRide] = useState<Ride | null>(null);
  const [history, setHistory] = useState<RideStatusHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [paying, setPaying] = useState(false);
  const mapRef = useRef<MapView>(null);

  // -------- rating modal state (NEW) --------
  const [ratingDismissed, setRatingDismissed] = useState(false);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);

  const tracking = useRideTracking(rideId);

  useEffect(() => {
    if (rideId == null) {
      void Promise.resolve().then(() => {
        setLoading(false);
        setError("Missing ride id.");
      });
      return;
    }

    let active = true;

    void Promise.resolve().then(() => {
      if (!active) return;
      setLoading(true);
      setError("");
    });

    Promise.all([fetchRide(rideId), fetchRideHistory(rideId)])
      .then(([r, h]) => {
        if (!active) return;
        setRide(r);
        setHistory(h);
      })
      .catch((e) => {
        if (!active) return;
        setError(
          e instanceof ApiError ?
            e.displayMessage
          : "Could not load your ride.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [rideId]);

  useEffect(() => {
    if (rideId == null) return;
    if (!tracking.liveStatus || !ride) return;
    if (tracking.liveStatus === ride.status) return;
    void fetchRide(rideId)
      .then(setRide)
      .catch(() => {});
    void fetchRideHistory(rideId)
      .then(setHistory)
      .catch(() => {});
  }, [tracking.liveStatus, rideId]); // eslint-disable-line react-hooks/exhaustive-deps

  const payVisible =
    !!ride &&
    ride.status === "completed" &&
    isOnlineMethod(ride.paymentMethod) &&
    ride.paymentStatus !== "paid";

  useEffect(() => {
    if (!payVisible || !rideId) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const fresh = await verifyRideCheckout(rideId);
        if (!cancelled) setRide(fresh);
      } catch {
        if (!cancelled) {
          void fetchRide(rideId)
            .then((r) => {
              if (!cancelled) setRide(r);
            })
            .catch(() => {});
        }
      }
    };
    void tick();
    const t = setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [payVisible, rideId]);

  useEffect(() => {
    if (!ride) return;
    const points: { latitude: number; longitude: number }[] = [
      { latitude: ride.pickupLat, longitude: ride.pickupLng },
      { latitude: ride.dropoffLat, longitude: ride.dropoffLng },
    ];
    if (tracking.riderPosition) points.push(tracking.riderPosition);
    if (points.length >= 2) {
      mapRef.current?.fitToCoordinates(points, {
        edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
        animated: true,
      });
    }
  }, [ride, tracking.riderPosition]);

  const canCancel = useMemo(() => {
    if (!ride) return false;
    return ride.status === "requested" || ride.status === "accepted";
  }, [ride]);

  // -------- show the rating modal only when it makes sense (NEW) --------
  const showRatingModal =
    !!ride &&
    ride.status === "completed" &&
    !!ride.rider &&
    ride.riderRating == null &&
    !ratingDismissed;

  async function handleCancel() {
    if (!ride || !canCancel || cancelling) return;
    Alert.alert("Cancel ride?", "The rider will be notified.", [
      { text: "Keep ride", style: "cancel" },
      {
        text: "Cancel ride",
        style: "destructive",
        onPress: async () => {
          setCancelling(true);
          try {
            await cancelRide(ride.rideId, "Cancelled by customer");
            const updated = await fetchRide(ride.rideId);
            setRide(updated);
          } catch (e) {
            Alert.alert(
              "Cancel failed",
              e instanceof ApiError ? e.displayMessage : "Please try again.",
            );
          } finally {
            setCancelling(false);
          }
        },
      },
    ]);
  }

  async function handlePay() {
    if (!rideId || paying) return;
    setPaying(true);
    try {
      const res = await initiateRideCheckout(rideId);
      const opened = await Linking.canOpenURL(res.checkoutUrl);
      if (!opened) {
        Alert.alert(
          "Cannot open checkout",
          "Your device blocked opening the payment page. Please try again.",
        );
        return;
      }
      await Linking.openURL(res.checkoutUrl);
    } catch (e) {
      Alert.alert(
        "Payment",
        e instanceof ApiError ? e.displayMessage : "Could not start checkout.",
      );
    } finally {
      setPaying(false);
    }
  }

  async function handleSubmitRating(stars: number, comment: string) {
    if (!ride) return;
    setRatingSubmitting(true);
    try {
      const updated = await rateRider(ride.rideId, {
        rating: stars,
        comment,
      });
      setRide(updated);
      Alert.alert("Thanks!", "Your rating has been submitted.");
    } catch (e) {
      Alert.alert(
        "Rating",
        e instanceof ApiError ? e.displayMessage : "Could not submit rating.",
      );
    } finally {
      setRatingSubmitting(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#4C1C24" />
        <Text style={styles.centerText}>Loading your ride…</Text>
      </SafeAreaView>
    );
  }

  if (error || !ride) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.errorText}>{error || "Ride not found."}</Text>
        <Pressable
          style={styles.backHome}
          onPress={() => router.replace("/home")}>
          <Text style={styles.backHomeText}>Back to home</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const status = tracking.liveStatus ?? ride.status;
  const paymentStatus = ride.paymentStatus ?? null;
  const paymentMethod = ride.paymentMethod ?? null;

  const isOnline = isOnlineMethod(paymentMethod);
  const showPayCard =
    status === "completed" && isOnline && paymentStatus !== "paid";
  const showPaidChip = status === "completed" && paymentStatus === "paid";

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable
            onPress={() => {
              if (router.canGoBack()) router.back();
              else router.replace("/home");
            }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={styles.headerButton}>
            <BackArrow />
          </Pressable>
          <Text style={styles.headerTitle}>Your ride</Text>
          <View style={styles.headerButton} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}>
          <View style={styles.statusCard}>
            <Text style={styles.statusTitle}>{STATUS_LABEL[status]}</Text>
            <Text style={styles.statusSubtitle}>
              {tracking.connected ?
                "Live tracking connected"
              : "Connecting to live tracking…"}
            </Text>
            {!!tracking.error && (
              <Text style={styles.statusError}>{tracking.error}</Text>
            )}
          </View>

          <View style={styles.map}>
            <MapView
              ref={mapRef}
              style={StyleSheet.absoluteFill}
              initialRegion={{
                latitude: (ride.pickupLat + ride.dropoffLat) / 2,
                longitude: (ride.pickupLng + ride.dropoffLng) / 2,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }}>
              <Marker
                coordinate={{
                  latitude: ride.pickupLat,
                  longitude: ride.pickupLng,
                }}
                title="Pickup"
                description={formatPlace(ride.pickup, "Pickup")}
                pinColor="#7D1E2B"
              />
              <Marker
                coordinate={{
                  latitude: ride.dropoffLat,
                  longitude: ride.dropoffLng,
                }}
                title="Destination"
                description={formatPlace(ride.dropoff, "Destination")}
                pinColor="#26734D"
              />
              {tracking.riderPosition && (
                <Marker
                  coordinate={tracking.riderPosition}
                  title="Your rider"
                  pinColor="#1D4ED8"
                />
              )}
            </MapView>
          </View>

          <View style={styles.infoCard}>
            <Row
              label="Pickup"
              value={formatPlace(ride.pickup, "Pinned location")}
            />
            <Row
              label="Destination"
              value={formatPlace(ride.dropoff, "Pinned location")}
            />
            <Row label="Status" value={STATUS_LABEL[status]} />
            <Row label="Fare" value={formatPeso(ride.fareAmount)} />
            <Row label="Payment" value={isOnline ? "Online" : "Cash"} />
            <Row
              label="Distance"
              value={
                ride.estimatedDistanceKm != null ?
                  `${ride.estimatedDistanceKm.toFixed(2)} km`
                : "—"
              }
            />
            <Row
              label="ETA"
              value={
                ride.estimatedDurationMin != null ?
                  `${ride.estimatedDurationMin} min`
                : "—"
              }
            />
            {ride.rider && (
              <>
                <Row label="Rider" value={ride.rider.fullName} />
                {ride.rider.plateNumber && (
                  <Row label="Plate" value={ride.rider.plateNumber} />
                )}
              </>
            )}
            {ride.riderRating != null && (
              <Row
                label="Your rating"
                value={`${"★".repeat(ride.riderRating)}${"☆".repeat(
                  5 - ride.riderRating,
                )}`}
              />
            )}
          </View>

          {showPayCard && (
            <View style={styles.payCard}>
              <Text style={styles.payTitle}>Pay your fare</Text>
              <Text style={styles.paySubtitle}>
                You&apos;ll be taken to a secure payment page to complete the
                payment.
              </Text>
              <Pressable
                onPress={handlePay}
                disabled={paying}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.payButton,
                  (pressed || paying) && styles.pressed,
                ]}>
                {paying ?
                  <ActivityIndicator color="#FFFFFF" />
                : <Text style={styles.payButtonText}>
                    Pay {formatPeso(ride.fareAmount)} now
                  </Text>
                }
              </Pressable>
            </View>
          )}

          {showPaidChip && (
            <View style={styles.paidChip}>
              <Text style={styles.paidChipText}>
                ✓ Fare paid{paymentMethod === "cod" ? " in cash" : ""}
              </Text>
            </View>
          )}

          {history.length > 0 && (
            <View style={styles.infoCard}>
              <Text style={styles.sectionTitle}>Timeline</Text>
              {history.map((h, i) => (
                <Text key={i} style={styles.timelineRow}>
                  {new Date(h.createdAt).toLocaleTimeString()} · {h.status}
                  {h.notes ? ` — ${h.notes}` : ""}
                </Text>
              ))}
            </View>
          )}

          {canCancel && (
            <Pressable
              onPress={handleCancel}
              disabled={cancelling}
              style={({ pressed }) => [
                styles.cancelButton,
                (pressed || cancelling) && styles.pressed,
              ]}>
              {cancelling ?
                <ActivityIndicator color="#FFFFFF" />
              : <Text style={styles.cancelText}>Cancel ride</Text>}
            </Pressable>
          )}
        </ScrollView>

        <RatingModal
          visible={showRatingModal}
          riderName={ride.rider?.fullName ?? null}
          submitting={ratingSubmitting}
          onSubmit={handleSubmitRating}
          onSkip={() => setRatingDismissed(true)}
        />
      </View>
    </SafeAreaView>
  );
}

function isOnlineMethod(method: string | null | undefined): boolean {
  if (!method) return false;
  return (
    method === "gcash" ||
    method === "maya" ||
    method === "card" ||
    method === "bank_transfer"
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
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
  headerTitle: {
    flex: 1,
    color: "#4C1C24",
    fontSize: 18,
    fontWeight: "700",
    marginLeft: 2,
  },
  content: { paddingHorizontal: 20, paddingBottom: 24, gap: 14 },
  statusCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#E3CFB9",
    padding: 16,
  },
  statusTitle: { color: "#4C1C24", fontSize: 16, fontWeight: "800" },
  statusSubtitle: { color: "#88766E", fontSize: 11, marginTop: 4 },
  statusError: { color: "#A92D36", fontSize: 11, marginTop: 6 },
  map: {
    height: 280,
    borderRadius: 15,
    backgroundColor: "#D2B48C",
    overflow: "hidden",
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#E3CFB9",
    padding: 16,
  },
  sectionTitle: {
    color: "#4C1C24",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    gap: 12,
  },
  rowLabel: { color: "#88766E", fontSize: 12 },
  rowValue: {
    color: "#4C1C24",
    fontSize: 12,
    fontWeight: "600",
    flexShrink: 1,
    textAlign: "right",
  },
  timelineRow: { color: "#4C1C24", fontSize: 11, lineHeight: 18 },
  cancelButton: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: "#A92D36",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  pressed: { opacity: 0.8 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3E9DB",
    gap: 12,
  },
  centerText: { color: "#4C1C24", fontSize: 13 },
  errorText: {
    color: "#A92D36",
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: 24,
  },
  backHome: {
    minHeight: 44,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: "#4C1C24",
    alignItems: "center",
    justifyContent: "center",
  },
  backHomeText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  payCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#E3CFB9",
    padding: 16,
    gap: 10,
  },
  payTitle: { color: "#4C1C24", fontSize: 15, fontWeight: "800" },
  paySubtitle: { color: "#88766E", fontSize: 12, lineHeight: 18 },
  payButton: {
    marginTop: 4,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: "#4C1C24",
    alignItems: "center",
    justifyContent: "center",
  },
  payButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  paidChip: {
    alignSelf: "flex-start",
    backgroundColor: "#E3F5E9",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#A8D9B8",
  },
  paidChipText: { color: "#087C35", fontSize: 12, fontWeight: "800" },
});
