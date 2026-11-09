import { Image, Pressable, StyleSheet, Text, View } from "react-native";

const ink = "#621B28";

type Props = {
  uri: string | null;
  size?: number;
  initials?: string;
  onPress?: () => void;
  disabled?: boolean;
};

/**
 * Round avatar for a rider. Shows the Cloudinary image if present, falls back
 * to the rider's initials on a solid ink background. Presentational only —
 * opening the image picker is the caller's job.
 */
export default function RiderAvatar({
  uri,
  size = 96,
  initials,
  onPress,
  disabled,
}: Props) {
  const radius = size / 2;
  const inner = (
    <View
      style={[
        styles.wrap,
        { width: size, height: size, borderRadius: radius },
      ]}>
      {uri ?
        <Image
          source={{ uri }}
          style={{ width: size, height: size, borderRadius: radius }}
          resizeMode="cover"
        />
      : <Text style={[styles.initials, { fontSize: size * 0.38 }]}>
          {initials || "R"}
        </Text>
      }
    </View>
  );

  if (!onPress) return inner;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel="Change profile picture"
      style={({ pressed }) => [
        {
          opacity:
            disabled ? 0.5
            : pressed ? 0.75
            : 1,
        },
      ]}>
      {inner}
      <View style={styles.editBadge}>
        <Text style={styles.editBadgeText}>✎</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: "#702832",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  initials: {
    color: "#FFF7F2",
    fontWeight: "800",
    letterSpacing: -1,
  },
  editBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: ink,
    borderWidth: 2,
    borderColor: "#FFF3E9",
    alignItems: "center",
    justifyContent: "center",
  },
  editBadgeText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
});
