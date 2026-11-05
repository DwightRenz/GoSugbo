import { useEffect, useMemo, useRef, useState } from "react";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import BackArrow from "./back-arrow";
import { ApiError } from "@/lib/api";
import { isPlusCode } from "@/lib/format";
import {
  bookRide,
  createAddress,
  estimateFare,
  fetchRideTypes,
} from "@/services/rideService";
import type { FareEstimate, RideType } from "@/types/ride";

export type Coordinates = { latitude: number; longitude: number };
type LocationType = "pickup" | "destination";

const FALLBACK_TYPES = [
  {
    id: "motorbike",
    title: "Motorbike",
    description: "1 passenger · Motorcycle ride",
    summary: "1 passenger · Helmet provided",
    rideTypeId: null as number | null,
    icon: require("../../../assets/home/single-motor-pin.png") as number,
  },
  {
    id: "tricycle4",
    title: "Tricycle — 4 Seaters",
    description: "Up to 4 passengers",
    summary: "Up to 4 passengers",
    rideTypeId: null as number | null,
    icon: require("../../../assets/home/tricycle-4.png") as number,
  },
  {
    id: "tricycle6",
    title: "Tricycle — 6 Seaters",
    description: "Up to 6 passengers",
    summary: "Up to 6 passengers",
    rideTypeId: null as number | null,
    icon: require("../../../assets/home/tricycle-6.png") as number,
  },
];

function iconKeyForRideType(
  name: string,
): "motorbike" | "tricycle4" | "tricycle6" {
  const n = name.toLowerCase();
  if (n.includes("motorbike") || n.includes("motorcycle")) return "motorbike";
  if (n.includes("6")) return "tricycle6";
  return "tricycle4";
}

function iconFor(key: "motorbike" | "tricycle4" | "tricycle6") {
  switch (key) {
    case "motorbike":
      return require("../../../assets/home/single-motor-pin.png");
    case "tricycle4":
      return require("../../../assets/home/tricycle-4.png");
    case "tricycle6":
      return require("../../../assets/home/tricycle-6.png");
  }
}

/** Build a readable address label from an expo-location reverse geocode result.
 *  Skips Plus Codes entirely (Android sometimes puts them in `name`/`street`). */
function buildAddressLabel(
  geo: Location.LocationGeocodedAddress | undefined,
  fallbackCoords: Coordinates,
): string {
  if (!geo) {
    return `${fallbackCoords.latitude.toFixed(5)}, ${fallbackCoords.longitude.toFixed(5)}`;
  }
  const parts = [geo.name, geo.street, geo.streetNumber, geo.district]
    .filter((p): p is string => !!p && !isPlusCode(p))
    .map((p) => p.trim());
  const deduped = parts.filter((p, i) => parts.indexOf(p) === i);
  const label = deduped.join(", ");
  if (label) return label;
  const district = [geo.district, geo.city]
    .filter((p): p is string => !!p && !isPlusCode(p))
    .join(", ");
  if (district) return district;
  return `${fallbackCoords.latitude.toFixed(5)}, ${fallbackCoords.longitude.toFixed(5)}`;
}

/** Build the fields we save to /api/addresses. */
function buildAddressFields(
  geo: Location.LocationGeocodedAddress | undefined,
  fallbackCoords: Coordinates,
): { line1: string; city: string; province: string } {
  const line1 = buildAddressLabel(geo, fallbackCoords);
  const safe = (v: string | null | undefined) =>
    v && !isPlusCode(v) ? v : null;
  const city =
    safe(geo?.city) ??
    safe(geo?.subregion) ??
    safe(geo?.district) ??
    "Unknown city";
  const province = safe(geo?.region) ?? "Cebu";
  return { line1, city, province };
}

export default function BookRideScreen() {
  const [pickup, setPickup] = useState("");
  const [pickupCoords, setPickupCoords] = useState<Coordinates | null>(null);
  const [destination, setDestination] = useState("");
  const [destinationCoords, setDestinationCoords] =
    useState<Coordinates | null>(null);
  const [locationError, setLocationError] = useState("");

  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [selecting, setSelecting] = useState<LocationType>("destination");
  const [pickerInitial, setPickerInitial] = useState<Coordinates>({
    latitude: 9.94,
    longitude: 123.4,
  });
  const pickerCenter = useRef<Coordinates>({
    latitude: 9.94,
    longitude: 123.4,
  });
  const mapRef = useRef<MapView>(null);
  const lookupVersion = useRef({ pickup: 0, destination: 0 });

  const [rideTypes, setRideTypes] = useState<FareEstimate[] | null>(null);
  const [backendTypes, setBackendTypes] = useState<RideType[] | null>(null);
  const [typesError, setTypesError] = useState("");
  const [selectedRideTypeId, setSelectedRideTypeId] = useState<number | null>(
    null,
  );

  const [estimate, setEstimate] = useState<FareEstimate | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [estimateError, setEstimateError] = useState("");

  const [booking, setBooking] = useState(false);
  const [bookingError, setBookingError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const types = await fetchRideTypes();
        if (!active) return;
        setBackendTypes(types);
        setTypesError("");
        if (types.length > 0) {
          setSelectedRideTypeId((current) => current ?? types[0].rideTypeId);
        }
      } catch (e) {
        if (!active) return;
        const message =
          e instanceof ApiError ?
            e.displayMessage
          : "Could not load ride types.";
        setTypesError(message);
        console.log("[ride-types] fetch failed:", e);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadCurrentLocation() {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!active) return;
        if (permission.status !== "granted") {
          setLocationError(
            "Allow location access in your phone settings to find your pickup.",
          );
          return;
        }

        const enabled = await Location.hasServicesEnabledAsync();
        if (!active) return;
        if (!enabled) {
          setLocationError("Please turn on your phone’s location services.");
          return;
        }

        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!active || lookupVersion.current.pickup > 0) return;

        const coordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setPickupCoords(coordinates);
        mapRef.current?.animateToRegion({
          ...coordinates,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
        setPickup(
          (current) =>
            current ||
            `${coordinates.latitude.toFixed(5)}, ${coordinates.longitude.toFixed(5)}`,
        );

        try {
          const [address] = await Location.reverseGeocodeAsync(coordinates);
          if (!active || lookupVersion.current.pickup > 0) return;
          const label = buildAddressLabel(address, coordinates);
          if (label) {
            const coordinateLabel = `${coordinates.latitude.toFixed(5)}, ${coordinates.longitude.toFixed(5)}`;
            setPickup((current) =>
              current === coordinateLabel ? label : current,
            );
          }
        } catch {
          /* keep coordinates */
        }
      } catch {
        if (active) {
          setLocationError(
            "Could not get your location. Check GPS and reopen this screen.",
          );
        }
      }
    }

    void loadCurrentLocation();
    return () => {
      active = false;
    };
  }, []);

  async function updateLocation(type: LocationType, coordinates: Coordinates) {
    const version = ++lookupVersion.current[type];
    const setCoordinates =
      type === "pickup" ? setPickupCoords : setDestinationCoords;
    const setAddress = type === "pickup" ? setPickup : setDestination;
    const coordinateLabel = `${coordinates.latitude.toFixed(5)}, ${coordinates.longitude.toFixed(5)}`;

    setCoordinates(coordinates);
    setAddress(coordinateLabel);
    try {
      const [address] = await Location.reverseGeocodeAsync(coordinates);
      if (!address || version !== lookupVersion.current[type]) return;
      const label = buildAddressLabel(address, coordinates);
      setAddress((current) => (current === coordinateLabel ? label : current));
    } catch {
      /* keep coordinates */
    }
  }

  useEffect(() => {
    if (pickupCoords && destinationCoords) {
      mapRef.current?.fitToCoordinates([pickupCoords, destinationCoords], {
        edgePadding: { top: 45, right: 45, bottom: 45, left: 45 },
        animated: true,
      });
    }
  }, [pickupCoords, destinationCoords]);

  useEffect(() => {
    if (!pickupCoords || !destinationCoords || selectedRideTypeId == null) {
      return;
    }

    let active = true;

    estimateFare({
      rideTypeId: selectedRideTypeId,
      pickupLat: pickupCoords.latitude,
      pickupLng: pickupCoords.longitude,
      dropoffLat: destinationCoords.latitude,
      dropoffLng: destinationCoords.longitude,
    })
      .then((res) => {
        if (!active) return;
        setEstimate(res);
        setEstimateError("");
      })
      .catch((e) => {
        if (!active) return;
        setEstimate(null);
        setEstimateError(
          e instanceof ApiError ?
            e.displayMessage
          : "Could not calculate fare right now.",
        );
      });

    return () => {
      active = false;
    };
  }, [pickupCoords, destinationCoords, selectedRideTypeId]);

  const selectedBackendType = useMemo(() => {
    if (!backendTypes || selectedRideTypeId == null) return null;
    return (
      backendTypes.find((t) => t.rideTypeId === selectedRideTypeId) ?? null
    );
  }, [backendTypes, selectedRideTypeId]);

  const selectedIconKey =
    selectedBackendType ?
      iconKeyForRideType(selectedBackendType.name)
    : "motorbike";

  const selectedTitle =
    estimate?.rideTypeName ?? selectedBackendType?.name ?? "Motorbike";

  const selectedSummary =
    selectedIconKey === "motorbike" ? "1 passenger · Helmet provided"
    : selectedIconKey === "tricycle6" ? "Up to 6 passengers"
    : "Up to 4 passengers";

  const displayFare = estimate?.estimatedFare ?? null;
  const displayDistance = estimate?.estimatedDistanceKm ?? null;
  const displayMinutes = estimate?.estimatedDurationMin ?? null;

  function openMapPicker(type: LocationType) {
    setSelecting(type);
    pickerCenter.current = (type === "pickup" ? pickupCoords : (
      destinationCoords
    )) ??
      pickupCoords ?? { latitude: 9.94, longitude: 123.4 };
    setPickerInitial(pickerCenter.current);
    setMapPickerOpen(true);
  }

  function goBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/home");
    }
  }

  async function handleBook() {
    setBookingError("");

    if (!pickupCoords || !destinationCoords) {
      setBookingError(
        "Tap the pickup and destination fields to choose both locations.",
      );
      return;
    }
    if (selectedRideTypeId == null) {
      setBookingError("Choose a vehicle type.");
      return;
    }
    if (booking) return;

    setBooking(true);
    try {
      const [pickupGeo] = await Location.reverseGeocodeAsync(pickupCoords);
      const [dropoffGeo] =
        await Location.reverseGeocodeAsync(destinationCoords);

      const pickupFields = buildAddressFields(pickupGeo, pickupCoords);
      const dropoffFields = buildAddressFields(dropoffGeo, destinationCoords);

      const pickupAddress = await createAddress({
        label: "Pickup",
        line1: pickupFields.line1,
        city: pickupFields.city,
        province: pickupFields.province,
        country: pickupGeo?.country ?? "Philippines",
        latitude: pickupCoords.latitude,
        longitude: pickupCoords.longitude,
      });

      const dropoffAddress = await createAddress({
        label: "Destination",
        line1: dropoffFields.line1,
        city: dropoffFields.city,
        province: dropoffFields.province,
        country: dropoffGeo?.country ?? "Philippines",
        latitude: destinationCoords.latitude,
        longitude: destinationCoords.longitude,
      });

      const ride = await bookRide({
        rideTypeId: selectedRideTypeId,
        pickupAddressId: pickupAddress.id,
        dropoffAddressId: dropoffAddress.id,
      });

      router.replace({
        pathname: "/ride-tracking",
        params: { rideId: String(ride.rideId) },
      });
    } catch (e) {
      const message =
        e instanceof ApiError ?
          e.displayMessage
        : "Could not book your ride. Please try again.";
      setBookingError(message);
      Alert.alert("Booking failed", message);
    } finally {
      setBooking(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable
            onPress={goBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={styles.headerButton}>
            <BackArrow />
          </Pressable>

          <Text style={styles.headerTitle}>Book a ride</Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Booking help"
            style={styles.headerButton}
            onPress={() =>
              Alert.alert(
                "Book a ride",
                "Choose pickup and destination, pick a vehicle, then tap Book.",
              )
            }>
            <View style={styles.helpCircle}>
              <Text style={styles.helpText}>?</Text>
            </View>
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}>
          <Text style={styles.fieldLabel}>Pickup</Text>
          <Pressable
            style={styles.locationField}
            accessibilityRole="button"
            accessibilityLabel={`Choose pickup. ${pickup || "Not selected"}`}
            onPress={() => openMapPicker("pickup")}>
            <View style={styles.pickupIcon}>
              <View style={styles.pickupDot} />
            </View>
            <Text
              style={[
                styles.locationValue,
                !pickup && styles.locationPlaceholder,
              ]}
              numberOfLines={2}>
              {pickup || "Choose pickup on map"}
            </Text>
            <Text style={styles.fieldChevron}>›</Text>
          </Pressable>

          <Text style={[styles.fieldLabel, styles.destinationLabel]}>
            Destination
          </Text>
          <Pressable
            style={styles.locationField}
            accessibilityRole="button"
            accessibilityLabel={`Choose destination. ${destination || "Not selected"}`}
            onPress={() => openMapPicker("destination")}>
            <Image
              source={require("../../../assets/home/map-pin.png")}
              style={styles.pinImage}
              resizeMode="contain"
              accessible={false}
            />
            <Text
              style={[
                styles.locationValue,
                !destination && styles.locationPlaceholder,
              ]}
              numberOfLines={2}>
              {destination || "Choose destination on map"}
            </Text>
            <Text style={styles.fieldChevron}>›</Text>
          </Pressable>

          <Text style={styles.mapHint}>
            Choose a location above to open the full-screen map. Move the map
            under the pin, then confirm.
          </Text>
          {!!locationError && (
            <Text style={styles.mapHint}>{locationError}</Text>
          )}

          <View style={styles.map}>
            <MapView
              ref={mapRef}
              style={StyleSheet.absoluteFill}
              initialRegion={{
                ...(pickupCoords ?? { latitude: 9.94, longitude: 123.4 }),
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              scrollEnabled={false}
              zoomEnabled={false}
              rotateEnabled={false}
              pitchEnabled={false}
              onPress={() => openMapPicker(selecting)}>
              {pickupCoords && (
                <Marker
                  coordinate={pickupCoords}
                  title="Your pickup"
                  description={pickup}
                  pinColor="#7D1E2B"
                  stopPropagation
                  onDragEnd={(event) =>
                    void updateLocation("pickup", event.nativeEvent.coordinate)
                  }
                />
              )}
              {destinationCoords && (
                <Marker
                  coordinate={destinationCoords}
                  title="Destination"
                  description={destination}
                  pinColor="#26734D"
                  stopPropagation
                  onDragEnd={(event) =>
                    void updateLocation(
                      "destination",
                      event.nativeEvent.coordinate,
                    )
                  }
                />
              )}
            </MapView>
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.summaryTop}>
              <Image
                source={iconFor(selectedIconKey)}
                resizeMode="contain"
                style={styles.vehicleImage}
                accessible={false}
              />
              <View style={styles.summaryDetails}>
                <Text style={styles.summaryTitle}>{selectedTitle}</Text>
                <Text style={styles.summarySubtitle}>{selectedSummary}</Text>
              </View>
              <View style={styles.selectedBadge}>
                <Text style={styles.selectedBadgeText}>Selected</Text>
              </View>
            </View>

            {estimating ?
              <Text style={styles.tripDetails}>Calculating fare…</Text>
            : estimate ?
              <Text style={styles.tripDetails}>
                {displayDistance?.toFixed(2)} km · ~{displayMinutes} min · ₱
                {Number(displayFare).toFixed(0)}
              </Text>
            : <Text style={styles.tripDetails}>
                Choose both locations to see a trip estimate.
              </Text>
            }
            {!!estimateError && (
              <Text style={[styles.estimateNote, { color: "#A92D36" }]}>
                {estimateError}
              </Text>
            )}
          </View>

          <View style={styles.vehiclePanel}>
            <Text style={styles.panelTitle}>Type of Vehicle</Text>

            {(backendTypes ?? []).map((type) => {
              const selected = selectedRideTypeId === type.rideTypeId;
              const iconKey = iconKeyForRideType(type.name);
              const summary =
                iconKey === "motorbike" ? "1 passenger · Motorcycle ride"
                : iconKey === "tricycle6" ? "Up to 6 passengers"
                : "Up to 4 passengers";

              return (
                <Pressable
                  key={type.rideTypeId}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={`${type.name}, minimum fare ${type.minFare} pesos`}
                  onPress={() => setSelectedRideTypeId(type.rideTypeId)}
                  style={({ pressed }) => [
                    styles.vehicleOption,
                    selected && styles.selectedVehicle,
                    pressed && styles.pressed,
                  ]}>
                  <View style={styles.vehicleDetails}>
                    <Text
                      style={[
                        styles.vehicleTitle,
                        selected && styles.whiteText,
                      ]}>
                      {type.name}
                    </Text>
                    <Text
                      style={[
                        styles.vehicleDescription,
                        selected && styles.selectedDescription,
                      ]}>
                      {summary}
                    </Text>
                  </View>
                </Pressable>
              );
            })}

            {!backendTypes && !typesError && (
              <Text style={styles.tripDetails}>
                Loading available ride types…
              </Text>
            )}

            {!!typesError && (
              <Text style={[styles.tripDetails, { color: "#A92D36" }]}>
                {typesError}
              </Text>
            )}
          </View>

          <View style={styles.safetyNote}>
            <Text style={styles.safetyText}>
              {selectedIconKey === "motorbike" ?
                "Check your pickup spot and wear your helmet."
              : "Check your pickup spot and destination."}
            </Text>
          </View>

          <Text style={styles.previewNote}>
            Fares and travel times are estimates and may change with traffic.
          </Text>

          {!!bookingError && (
            <Text style={[styles.previewNote, { color: "#A92D36" }]}>
              {bookingError}
            </Text>
          )}
        </ScrollView>

        <SafeAreaView edges={["bottom"]} style={styles.footerSafeArea}>
          <View style={styles.footer}>
            <View style={styles.fareBlock}>
              <Text style={styles.fareLabel}>Estimated fare</Text>
              <Text style={styles.fare}>
                {displayFare != null ?
                  `₱${Number(displayFare).toFixed(0)}`
                : "—"}
              </Text>
            </View>

            <View style={styles.footerDivider} />

            <Pressable
              accessibilityRole="button"
              onPress={handleBook}
              disabled={booking}
              style={({ pressed }) => [
                styles.nextButton,
                (pressed || booking) && styles.pressed,
              ]}>
              {booking ?
                <ActivityIndicator color="#FFFFFF" />
              : <Text style={styles.nextText}>Book ride →</Text>}
            </Pressable>
          </View>
        </SafeAreaView>
      </View>

      <Modal
        visible={mapPickerOpen}
        animationType="slide"
        onRequestClose={() => setMapPickerOpen(false)}>
        <SafeAreaView style={styles.pickerScreen}>
          <View style={styles.header}>
            <Pressable
              style={styles.headerButton}
              accessibilityRole="button"
              accessibilityLabel="Close map"
              onPress={() => setMapPickerOpen(false)}>
              <BackArrow />
            </Pressable>
            <Text style={styles.headerTitle}>
              {selecting === "pickup" ? "Choose pickup" : "Choose destination"}
            </Text>
          </View>
          <Text style={styles.pickerHint}>
            Move the map to position the pin. Pinch to zoom.
          </Text>
          <View style={styles.pickerMap}>
            {mapPickerOpen && (
              <MapView
                style={StyleSheet.absoluteFill}
                initialRegion={{
                  ...pickerInitial,
                  latitudeDelta: 0.005,
                  longitudeDelta: 0.005,
                }}
                onRegionChangeComplete={(region) => {
                  pickerCenter.current = {
                    latitude: region.latitude,
                    longitude: region.longitude,
                  };
                }}
                rotateEnabled={false}
                pitchEnabled={false}
              />
            )}
            <View pointerEvents="none" style={styles.centerPin}>
              <View
                style={[
                  styles.pinHead,
                  selecting === "destination" && { backgroundColor: "#26734D" },
                ]}>
                <View style={styles.pinHole} />
              </View>
              <View
                style={[
                  styles.pinStem,
                  selecting === "destination" && { backgroundColor: "#26734D" },
                ]}
              />
            </View>
          </View>
          <View style={styles.pickerFooter}>
            <Pressable
              accessibilityRole="button"
              style={styles.nextButton}
              onPress={() => {
                void updateLocation(selecting, { ...pickerCenter.current });
                setMapPickerOpen(false);
              }}>
              <Text style={styles.nextText}>
                Confirm {selecting === "pickup" ? "pickup" : "destination"}
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  locationValue: {
    flex: 1,
    paddingVertical: 13,
    color: "#4C1C24",
    fontSize: 13,
    lineHeight: 19,
  },
  locationPlaceholder: { color: "#9A857E" },
  fieldChevron: { color: "#795551", fontSize: 24 },
  estimateNote: {
    color: "#88766E",
    fontSize: 10,
    lineHeight: 16,
    marginTop: 5,
  },
  pickerScreen: { flex: 1, backgroundColor: "#F3E9DB" },
  pickerMap: { flex: 1 },
  pickerHint: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    color: "#88766E",
    fontSize: 13,
  },
  pickerFooter: { padding: 20, backgroundColor: "#FFFFFF" },
  centerPin: {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: 32,
    height: 44,
    marginLeft: -16,
    marginTop: -44,
    alignItems: "center",
  },
  pinHead: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#7D1E2B",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  pinHole: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FFFFFF",
  },
  pinStem: { width: 4, height: 12, backgroundColor: "#7D1E2B" },
  mapHint: {
    color: "#88766E",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 8,
  },
  screen: { flex: 1, backgroundColor: "#F3E9DB" },
  container: {
    flex: 1,
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
  },
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
    marginLeft: 2,
    color: "#4C1C24",
    fontSize: 18,
    fontWeight: "700",
  },
  helpCircle: {
    width: 19,
    height: 19,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#795551",
    alignItems: "center",
    justifyContent: "center",
  },
  helpText: { color: "#795551", fontSize: 12 },
  content: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 24,
  },
  fieldLabel: {
    color: "#4C1C24",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 7,
  },
  destinationLabel: { marginTop: 14 },
  locationField: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 48,
    paddingHorizontal: 13,
    gap: 11,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E3CFB9",
    borderRadius: 12,
  },
  pickupIcon: {
    width: 15,
    height: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#977773",
    alignItems: "center",
    justifyContent: "center",
  },
  pickupDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#977773",
  },
  pinImage: { width: 16, height: 18 },
  map: {
    height: 280,
    marginTop: 16,
    borderRadius: 15,
    backgroundColor: "#D2B48C",
    overflow: "hidden",
  },
  summaryCard: {
    marginTop: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E3CFB9",
    borderRadius: 15,
    padding: 13,
  },
  summaryTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  summaryDetails: { flex: 1 },
  summaryTitle: { color: "#4C1C24", fontSize: 14, fontWeight: "700" },
  summarySubtitle: { color: "#88766E", fontSize: 10, marginTop: 4 },
  selectedBadge: {
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 12,
    backgroundColor: "#F3E9DB",
  },
  selectedBadgeText: { color: "#4C1C24", fontSize: 9, fontWeight: "700" },
  tripDetails: {
    color: "#88766E",
    fontSize: 10,
    marginTop: 10,
    lineHeight: 15,
  },
  vehiclePanel: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E3CFB9",
    borderRadius: 15,
    padding: 20,
    marginTop: 15,
  },
  panelTitle: {
    color: "#4C1C24",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 17,
  },
  vehicleOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 75,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#E3CFB9",
    paddingHorizontal: 15,
    paddingVertical: 14,
    marginBottom: 15,
    backgroundColor: "#FFFFFF",
  },
  selectedVehicle: {
    backgroundColor: "#7D1E2B",
    borderColor: "#7D1E2B",
  },
  vehicleDetails: { flex: 1 },
  vehicleTitle: { color: "#4C1C24", fontSize: 14, fontWeight: "700" },
  vehicleDescription: {
    marginTop: 5,
    color: "#88766E",
    fontSize: 10,
    lineHeight: 15,
  },
  whiteText: { color: "#FFFFFF" },
  selectedDescription: { color: "#F1DDDB" },
  vehicleImage: { width: 32, height: 32 },
  safetyNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
  },
  safetyText: {
    flex: 1,
    color: "#88766E",
    fontSize: 10,
    lineHeight: 16,
  },
  previewNote: {
    color: "#88766E",
    fontSize: 10,
    lineHeight: 16,
    marginTop: 8,
  },
  footerSafeArea: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E3CFB9",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 13,
    gap: 20,
  },
  fareBlock: { minWidth: 65 },
  fareLabel: { color: "#88766E", fontSize: 10, marginBottom: 4 },
  fare: { color: "#4C1C24", fontSize: 28, fontWeight: "800" },
  footerDivider: {
    width: 1,
    height: 44,
    backgroundColor: "#E6DDD5",
  },
  nextButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: "#4C1C24",
    alignItems: "center",
    justifyContent: "center",
  },
  nextText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  pressed: { opacity: 0.8 },
});
