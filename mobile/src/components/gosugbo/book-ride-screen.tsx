import { useEffect, useRef, useState } from 'react';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackArrow from './back-arrow';

const vehicles = [
  {
    id: 'motorbike',
    title: 'Motorbike',
    description: '1 passenger · Motorcycle ride',
    summary: '1 passenger · Helmet provided',
    fare: 85,
    icon: require('../../../assets/home/single-motor-pin.png'),
  },
  {
    id: 'tricycle4',
    title: 'Tricycle — 4 Seaters',
    description: 'Up to 4 passengers',
    summary: 'Up to 4 passengers',
    fare: 120,
    icon: require('../../../assets/home/tricycle-4.png'),
  },
  {
    id: 'tricycle6',
    title: 'Tricycle — 6 Seaters',
    description: 'Up to 6 passengers',
    summary: 'Up to 6 passengers',
    fare: 150,
    icon: require('../../../assets/home/tricycle-6.png'),
  },
];

type Vehicle = (typeof vehicles)[number];
type Coordinates = { latitude: number; longitude: number };
type LocationType = 'pickup' | 'destination';

function distanceKm(from: Coordinates, to: Coordinates) {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const latitude = radians(to.latitude - from.latitude);
  const longitude = radians(to.longitude - from.longitude);
  const a = Math.sin(latitude / 2) ** 2 +
    Math.cos(radians(from.latitude)) * Math.cos(radians(to.latitude)) *
    Math.sin(longitude / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
}

function VehicleIcon({
  vehicle,
  selected = false,
}: {
  vehicle: Vehicle;
  selected?: boolean;
}) {
  if (vehicle.icon) {
    return (
      <Image
        source={vehicle.icon}
        resizeMode="contain"
        style={[
          styles.vehicleImage,
          selected && styles.whiteIcon,
        ]}
        accessible={false}
      />
    );
  }

  // Replace this illustration with your tricycle PNG when available.
  return (
    <View
      style={styles.tricycle}
      accessible={false}
    >
      <View
        style={[
          styles.tricycleRoof,
          selected && styles.whiteBorder,
        ]}
      />
      <View
        style={[
          styles.tricycleBody,
          selected && styles.whiteBorder,
        ]}
      >
        <View
          style={[
            styles.tricycleWindow,
            selected && styles.whiteBorder,
          ]}
        />
      </View>

      <View style={styles.wheels}>
        <View
          style={[
            styles.wheel,
            selected && styles.whiteBorder,
          ]}
        />
        <View
          style={[
            styles.wheel,
            selected && styles.whiteBorder,
          ]}
        />
      </View>
    </View>
  );
}

export default function BookRideScreen() {
  const [pickup, setPickup] = useState('');

  const [pickupCoords, setPickupCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const [locationError, setLocationError] = useState('');

  const [destination, setDestination] = useState('');
  const [destinationCoords, setDestinationCoords] = useState<Coordinates | null>(null);
  const [selecting, setSelecting] = useState<LocationType>('destination');
  const lookupVersion = useRef({ pickup: 0, destination: 0 });
  const mapRef = useRef<MapView>(null);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [pickerInitial, setPickerInitial] = useState<Coordinates>({ latitude: 9.94, longitude: 123.4 });
  const pickerCenter = useRef<Coordinates>({ latitude: 9.94, longitude: 123.4 });

  function openMapPicker(type: LocationType) {
    setSelecting(type);
    pickerCenter.current =
      (type === 'pickup' ? pickupCoords : destinationCoords) ??
      pickupCoords ?? { latitude: 9.94, longitude: 123.4 };
    setPickerInitial(pickerCenter.current);
    setMapPickerOpen(true);
  }
  const [selectedId, setSelectedId] = useState('motorbike');

  const selectedVehicle =
    vehicles.find((vehicle) => vehicle.id === selectedId) ??
    vehicles[0];

  const distance = pickupCoords && destinationCoords
    ? distanceKm(pickupCoords, destinationCoords) : null;
  const assumedSpeed = selectedId === 'motorbike' ? 25 : 20;
  const minutes = distance === null ? null : Math.max(1, Math.ceil(distance / assumedSpeed * 60));

  useEffect(() => {
    if (pickupCoords && destinationCoords) {
      mapRef.current?.fitToCoordinates([pickupCoords, destinationCoords], {
        edgePadding: { top: 45, right: 45, bottom: 45, left: 45 },
        animated: true,
      });
    }
  }, [pickupCoords, destinationCoords]);

  useEffect(() => {
    let active = true;

    async function loadCurrentLocation() {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!active) return;
        if (permission.status !== 'granted') {
          setLocationError('Allow location access in your phone settings to find your pickup.');
          return;
        }

        const enabled = await Location.hasServicesEnabledAsync();
        if (!active) return;
        if (!enabled) {
          setLocationError('Please turn on your phone’s location services.');
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
        setPickup((current) => current ||
          `${coordinates.latitude.toFixed(5)}, ${coordinates.longitude.toFixed(5)}`);

        try {
          const [address] = await Location.reverseGeocodeAsync(coordinates);
          if (!active || !address || lookupVersion.current.pickup > 0) return;
          const label = [address.name, address.street, address.district, address.city]
            .filter((part, index, parts) => Boolean(part) && parts.indexOf(part) === index)
            .join(', ');
          if (label) {
            // Preserve any pickup text the user entered during address lookup.
            const coordinateLabel = `${coordinates.latitude.toFixed(5)}, ${coordinates.longitude.toFixed(5)}`;
            setPickup((current) => current === coordinateLabel ? label : current);
          }
        } catch {
          // Keep the coordinates when an address cannot be found.
        }
      } catch {
        if (active) {
          setLocationError('Could not get your location. Check GPS and reopen this screen.');
        }
      }
    }

    void loadCurrentLocation();
    return () => { active = false; };
  }, []);

  async function updateLocation(type: LocationType, coordinates: Coordinates) {
    const version = ++lookupVersion.current[type];
    const setCoordinates = type === 'pickup' ? setPickupCoords : setDestinationCoords;
    const setAddress = type === 'pickup' ? setPickup : setDestination;
    const coordinateLabel = `${coordinates.latitude.toFixed(5)}, ${coordinates.longitude.toFixed(5)}`;

    setCoordinates(coordinates);
    setAddress(coordinateLabel);
    try {
      const [address] = await Location.reverseGeocodeAsync(coordinates);
      if (!address || version !== lookupVersion.current[type]) return;
      const label = [address.name, address.street, address.district, address.city]
        .filter((part, index, parts) => Boolean(part) && parts.indexOf(part) === index)
        .join(', ');
      if (label) {
        setAddress((current) => current === coordinateLabel ? label : current);
      }
    } catch {
      // Keep the selected coordinates when address lookup is unavailable.
    }
  }

  function goBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/home');
    }
  }

  function next() {
    if (!pickupCoords || !destinationCoords || !pickup.trim() || !destination.trim()) {
      Alert.alert(
        'Add your locations',
        'Tap the pickup and destination fields to choose both locations on the map.',
      );
      return;
    }

    Alert.alert(
      'Booking preview',
      [
        `Pickup: ${pickup.trim()}`,
        `Destination: ${destination.trim()}`,
        `Vehicle: ${selectedVehicle.title}`,
        `Straight-line distance: ${distance?.toFixed(2)} km`,
        `Rough travel estimate: ${minutes} min at ${assumedSpeed} km/h; roads and traffic not included`,
        `Sample fare: ₱${selectedVehicle.fare}`,
        '',
        'Preview only. No driver has been requested.',
      ].join('\n'),
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable
            onPress={goBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={styles.headerButton}
          >
            <BackArrow />
          </Pressable>

          <Text style={styles.headerTitle}>Book a ride</Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Booking help"
            style={styles.headerButton}
            onPress={() =>
              Alert.alert(
                'Book a ride',
                'Enter your locations, choose a vehicle, then tap Next to review.',
              )
            }
          >
            <View style={styles.helpCircle}>
              <Text style={styles.helpText}>?</Text>
            </View>
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
        >
          <Text style={styles.fieldLabel}>Pickup</Text>

          <Pressable style={styles.locationField} accessibilityRole="button" accessibilityLabel={`Choose pickup. ${pickup || 'Not selected'}`} onPress={() => openMapPicker('pickup')}>
            <View style={styles.pickupIcon}>
              <View style={styles.pickupDot} />
            </View>

            <Text style={[styles.locationValue, !pickup && styles.locationPlaceholder]} numberOfLines={2}>
              {pickup || 'Choose pickup on map'}
            </Text>
            <Text style={styles.fieldChevron}>›</Text>
          </Pressable>

          <Text style={[styles.fieldLabel, styles.destinationLabel]}>
            Destination
          </Text>

          <Pressable style={styles.locationField} accessibilityRole="button" accessibilityLabel={`Choose destination. ${destination || 'Not selected'}`} onPress={() => openMapPicker('destination')}>
            <Image
              source={require('../../../assets/home/map-pin.png')}
              style={styles.pinImage}
              resizeMode="contain"
              accessible={false}
            />

            <Text style={[styles.locationValue, !destination && styles.locationPlaceholder]} numberOfLines={2}>
              {destination || 'Choose destination on map'}
            </Text>
            <Text style={styles.fieldChevron}>›</Text>
          </Pressable>

          <Text style={styles.mapHint}>
            Choose a location above to open the full-screen map. Move the map under the pin, then confirm.
          </Text>
          {!!locationError && <Text style={styles.mapHint}>{locationError}</Text>}

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
                onPress={() => openMapPicker(selecting)}
              >
                {pickupCoords && (
                <Marker
                  coordinate={pickupCoords}
                  title="Your pickup"
                  description={pickup}
                  pinColor="#7D1E2B"
                  stopPropagation
                  onDragEnd={(event) => void updateLocation('pickup', event.nativeEvent.coordinate)}
                />
                )}
                {destinationCoords && (
                  <Marker
                    coordinate={destinationCoords}
                    title="Destination"
                    description={destination}
                    pinColor="#26734D"
                    stopPropagation
                    onDragEnd={(event) => void updateLocation('destination', event.nativeEvent.coordinate)}
                  />
                )}
              </MapView>
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.summaryTop}>
              <VehicleIcon vehicle={selectedVehicle} />

              <View style={styles.summaryDetails}>
                <Text style={styles.summaryTitle}>
                  {selectedVehicle.title}
                </Text>
                <Text style={styles.summarySubtitle}>
                  {selectedVehicle.summary}
                </Text>
              </View>

              <View style={styles.selectedBadge}>
                <Text style={styles.selectedBadgeText}>
                  Selected
                </Text>
              </View>
            </View>

            <Text style={styles.tripDetails}>
              {distance === null
                ? 'Choose both locations to see a trip estimate.'
                : `${distance.toFixed(2)} km straight-line · Roughly ${minutes} min`}
            </Text>
            {distance !== null && (
              <Text style={styles.estimateNote}>
                Based on {assumedSpeed} km/h. Road distance and traffic are not included; actual travel may take longer.
              </Text>
            )}
          </View>

          <View style={styles.vehiclePanel}>
            <Text style={styles.panelTitle}>Type of Vehicle</Text>

            {vehicles.map((vehicle) => {
              const selected = selectedId === vehicle.id;

              return (
                <Pressable
                  key={vehicle.id}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={`${vehicle.title}, sample fare ${vehicle.fare} pesos`}
                  onPress={() => setSelectedId(vehicle.id)}
                  style={({ pressed }) => [
                    styles.vehicleOption,
                    selected && styles.selectedVehicle,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.vehicleDetails}>
                    <Text
                      style={[
                        styles.vehicleTitle,
                        selected && styles.whiteText,
                      ]}
                    >
                      {vehicle.title}
                    </Text>

                    <Text
                      style={[
                        styles.vehicleDescription,
                        selected && styles.selectedDescription,
                      ]}
                    >
                      {vehicle.description}
                    </Text>
                  </View>
                  
                </Pressable>
              );
            })}
          </View>

          <View style={styles.safetyNote}>
            <Text style={styles.safetyText}>
              {selectedId === 'motorbike'
                ? 'Check your pickup spot and wear your helmet.'
                : 'Check your pickup spot and destination.'}
            </Text>
          </View>

          <Text style={styles.previewNote}>
            Locations, travel times and fares are for preview only.
          </Text>
        </ScrollView>

        <SafeAreaView
          edges={['bottom']}
          style={styles.footerSafeArea}
        >
          <View style={styles.footer}>
            <View style={styles.fareBlock}>
              <Text style={styles.fareLabel}>Sample fare</Text>
              <Text style={styles.fare}>
                ₱{selectedVehicle.fare}
              </Text>
            </View>

            <View style={styles.footerDivider} />

            <Pressable
              accessibilityRole="button"
              onPress={next}
              style={({ pressed }) => [
                styles.nextButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.nextText}>Next →</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
      <Modal
        visible={mapPickerOpen}
        animationType="slide"
        onRequestClose={() => setMapPickerOpen(false)}
      >
        <SafeAreaView style={styles.pickerScreen}>
          <View style={styles.header}>
            <Pressable
              style={styles.headerButton}
              accessibilityRole="button"
              accessibilityLabel="Close map"
              onPress={() => setMapPickerOpen(false)}
            >
              <BackArrow />
            </Pressable>
            <Text style={styles.headerTitle}>
              {selecting === 'pickup' ? 'Choose pickup' : 'Choose destination'}
            </Text>
          </View>
          <Text style={styles.pickerHint}>Move the map to position the pin. Pinch to zoom.</Text>
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
              <View style={[
                styles.pinHead,
                selecting === 'destination' && { backgroundColor: '#26734D' },
              ]}>
                <View style={styles.pinHole} />
              </View>
              <View style={[
                styles.pinStem,
                selecting === 'destination' && { backgroundColor: '#26734D' },
              ]} />
            </View>
          </View>
          <View style={styles.pickerFooter}>
            <Pressable
              accessibilityRole="button"
              style={styles.nextButton}
              onPress={() => {
                void updateLocation(selecting, { ...pickerCenter.current });
                setMapPickerOpen(false);
              }}
            >
              <Text style={styles.nextText}>
                Confirm {selecting === 'pickup' ? 'pickup' : 'destination'}
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  locationValue: { flex: 1, paddingVertical: 13, color: '#4C1C24', fontSize: 13, lineHeight: 19 },
  locationPlaceholder: { color: '#9A857E' },
  fieldChevron: { color: '#795551', fontSize: 24 },
  estimateNote: { color: '#88766E', fontSize: 10, lineHeight: 16, marginTop: 5 },
  pickerScreen: { flex: 1, backgroundColor: '#F3E9DB' },
  pickerMap: { flex: 1 },
  pickerHint: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    color: '#88766E',
    fontSize: 13,
  },
  pickerFooter: { padding: 20, backgroundColor: '#FFFFFF' },
  centerPin: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 32,
    height: 44,
    marginLeft: -16,
    marginTop: -44,
    alignItems: 'center',
  },
  pinHead: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#7D1E2B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  pinHole: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FFFFFF' },
  pinStem: { width: 4, height: 12, backgroundColor: '#7D1E2B' },
  mapControls: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  mapControl: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3CFB9',
  },
  mapControlText: {
    color: '#4C1C24',
    fontSize: 12,
    fontWeight: '600',
  },
  mapHint: {
    color: '#88766E',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 8,
  },
  mapPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  mapStatus: {
    color: '#4C1C24',
    textAlign: 'center',
    fontSize: 12,
  },
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    color: '#6D4745',
    fontSize: 25,
  },
  headerTitle: {
    flex: 1,
    marginLeft: 2,
    color: '#4C1C24',
    fontSize: 18,
    fontWeight: '700',
  },
  helpCircle: {
    width: 19,
    height: 19,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#795551',
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpText: {
    color: '#795551',
    fontSize: 12,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 24,
  },
  fieldLabel: {
    color: '#4C1C24',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 7,
  },
  destinationLabel: {
    marginTop: 14,
  },
  locationField: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    paddingHorizontal: 13,
    gap: 11,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3CFB9',
    borderRadius: 12,
  },
  pickupIcon: {
    width: 15,
    height: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#977773',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickupDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#977773',
  },
  pinImage: {
    width: 16,
    height: 18,
  },
  locationInput: {
    flex: 1,
    minHeight: 46,
    paddingVertical: 10,
    color: '#4C1C24',
    fontSize: 13,
  },
  map: {
    height: 280,
    marginTop: 16,
    borderRadius: 15,
    backgroundColor: '#D2B48C',
    overflow: 'hidden',
  },
  mapLand: {
    position: 'absolute',
    left: '25%',
    top: 0,
    bottom: 0,
    right: 0,
    backgroundColor: '#F3E9DB',
  },
  mapBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#F3E9DB',
    zIndex: 2,
  },
  mapBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#826C5F',
  },
  roadVertical: {
    position: 'absolute',
    left: '31%',
    top: 45,
    width: 10,
    height: 90,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '-16deg' }],
  },
  roadTop: {
    position: 'absolute',
    left: '31%',
    top: 46,
    width: '34%',
    height: 10,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '-5deg' }],
  },
  roadRight: {
    position: 'absolute',
    left: '64%',
    top: 45,
    width: 10,
    height: 85,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '-8deg' }],
  },
  roadBottom: {
    position: 'absolute',
    left: '35%',
    top: 125,
    width: '48%',
    height: 10,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '-5deg' }],
  },
  routeDown: {
    position: 'absolute',
    left: '33%',
    top: 70,
    width: 4,
    height: 62,
    backgroundColor: '#7D1E2B',
    transform: [{ rotate: '-17deg' }],
  },
  routeAcross: {
    position: 'absolute',
    left: '36%',
    top: 125,
    width: '47%',
    height: 4,
    backgroundColor: '#7D1E2B',
    transform: [{ rotate: '-5deg' }],
  },
  routeStart: {
    position: 'absolute',
    left: '30%',
    top: 65,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#7D1E2B',
  },
  routeEnd: {
    position: 'absolute',
    left: '82%',
    top: 117,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#7D1E2B',
  },
  pickupMapLabel: {
    position: 'absolute',
    left: '28%',
    top: 55,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 7,
    paddingVertical: 6,
    borderRadius: 5,
  },
  destinationMapLabel: {
    position: 'absolute',
    right: 12,
    top: 126,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 7,
    paddingVertical: 6,
    borderRadius: 5,
  },
  mapLabelText: {
    color: '#4C1C24',
    fontSize: 9,
    fontWeight: '600',
  },
  summaryCard: {
    marginTop: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3CFB9',
    borderRadius: 15,
    padding: 13,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  summaryDetails: {
    flex: 1,
  },
  summaryTitle: {
    color: '#4C1C24',
    fontSize: 14,
    fontWeight: '700',
  },
  summarySubtitle: {
    color: '#88766E',
    fontSize: 10,
    marginTop: 4,
  },
  selectedBadge: {
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 12,
    backgroundColor: '#F3E9DB',
  },
  selectedBadgeText: {
    color: '#4C1C24',
    fontSize: 9,
    fontWeight: '700',
  },
  tripDetails: {
    color: '#88766E',
    fontSize: 10,
    marginTop: 10,
    lineHeight: 15,
  },
  vehiclePanel: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3CFB9',
    borderRadius: 15,
    padding: 20,
    marginTop: 15,
  },
  panelTitle: {
    color: '#4C1C24',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 17,
  },
  vehicleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 75,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#E3CFB9',
    paddingHorizontal: 15,
    paddingVertical: 14,
    marginBottom: 15,
    backgroundColor: '#FFFFFF',
  },
  selectedVehicle: {
    backgroundColor: '#7D1E2B',
    borderColor: '#7D1E2B',
  },
  vehicleDetails: {
    flex: 1,
  },
  vehicleTitle: {
    color: '#4C1C24',
    fontSize: 14,
    fontWeight: '700',
  },
  vehicleDescription: {
    marginTop: 5,
    color: '#88766E',
    fontSize: 10,
    lineHeight: 15,
  },
  whiteText: {
    color: '#FFFFFF',
  },
  selectedDescription: {
    color: '#F1DDDB',
  },
  vehicleImage: {
    width: 32,
    height: 32,
  },
  whiteIcon: {
    tintColor: '#FFFFFF',
  },
  tricycle: {
    width: 35,
    height: 30,
    justifyContent: 'center',
  },
  tricycleRoof: {
    height: 5,
    borderWidth: 1,
    borderColor: '#7D1E2B',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  tricycleBody: {
    height: 15,
    marginHorizontal: 2,
    borderWidth: 1,
    borderColor: '#7D1E2B',
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
  tricycleWindow: {
    width: 10,
    height: 10,
    marginLeft: 5,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#7D1E2B',
  },
  wheels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 5,
    marginTop: -1,
  },
  wheel: {
    width: 6,
    height: 6,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#7D1E2B',
  },
  whiteBorder: {
    borderColor: '#FFFFFF',
  },
  safetyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
  },
  shield: {
    color: '#795551',
    fontSize: 18,
  },
  safetyText: {
    flex: 1,
    color: '#88766E',
    fontSize: 10,
    lineHeight: 16,
  },
  previewNote: {
    color: '#88766E',
    fontSize: 10,
    lineHeight: 16,
    marginTop: 8,
  },
  footerSafeArea: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E3CFB9',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 13,
    gap: 20,
  },
  fareBlock: {
    minWidth: 65,
  },
  fareLabel: {
    color: '#88766E',
    fontSize: 10,
    marginBottom: 4,
  },
  fare: {
    color: '#4C1C24',
    fontSize: 28,
    fontWeight: '800',
  },
  footerDivider: {
    width: 1,
    height: 44,
    backgroundColor: '#E6DDD5',
  },
  nextButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: '#4C1C24',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.8,
  },
});
