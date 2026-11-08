import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type Props = {
  visible: boolean;
  riderName?: string | null;
  submitting?: boolean;
  onSubmit: (rating: number, comment: string) => void;
  onSkip: () => void;
};

const STAR_LABELS = ["", "Poor", "Fair", "Good", "Great", "Excellent"];

export default function RatingModal({
  visible,
  riderName,
  submitting = false,
  onSubmit,
  onSkip,
}: Props) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const canSubmit = rating >= 1 && rating <= 5 && !submitting;

  function reset() {
    setRating(0);
    setComment("");
  }

  function handleSkip() {
    if (submitting) return;
    reset();
    onSkip();
  }

  function handleSubmit() {
    if (!canSubmit) return;
    onSubmit(rating, comment.trim());
    reset();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleSkip}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Rate your ride</Text>
          <Text style={styles.subtitle}>
            How was your trip
            {riderName ? ` with ${riderName}` : ""}?
          </Text>

          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((n) => {
              const filled = n <= rating;
              return (
                <Pressable
                  key={n}
                  accessibilityRole="button"
                  accessibilityLabel={`${n} star${n > 1 ? "s" : ""}`}
                  onPress={() => setRating(n)}
                  hitSlop={6}
                  style={styles.starButton}>
                  <Text style={[styles.star, filled && styles.starFilled]}>
                    ★
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.starLabel}>
            {rating > 0 ? STAR_LABELS[rating] : "Tap a star to rate"}
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Add a comment (optional)"
            placeholderTextColor="#88766E"
            value={comment}
            onChangeText={setComment}
            maxLength={500}
            multiline
            editable={!submitting}
          />

          <Pressable
            accessibilityRole="button"
            disabled={!canSubmit}
            onPress={handleSubmit}
            style={({ pressed }) => [
              styles.submit,
              (!canSubmit || pressed) && styles.submitDisabled,
            ]}>
            {submitting ?
              <ActivityIndicator color="#FFFFFF" />
            : <Text style={styles.submitText}>Submit rating</Text>}
          </Pressable>

          <Pressable
            accessibilityRole="button"
            disabled={submitting}
            onPress={handleSkip}
            style={styles.skip}>
            <Text style={styles.skipText}>Maybe later</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E3CFB9",
    padding: 22,
    gap: 12,
  },
  title: {
    color: "#4C1C24",
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  subtitle: {
    color: "#88766E",
    fontSize: 13,
    textAlign: "center",
  },
  starsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: 8,
  },
  starButton: { padding: 4 },
  star: { fontSize: 40, color: "#E3CFB9" },
  starFilled: { color: "#E5A93B" },
  starLabel: {
    color: "#4C1C24",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 4,
  },
  input: {
    minHeight: 72,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E3CFB9",
    backgroundColor: "#FBF6EF",
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    color: "#4C1C24",
    fontSize: 13,
    textAlignVertical: "top",
  },
  submit: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: "#4C1C24",
    alignItems: "center",
    justifyContent: "center",
  },
  submitDisabled: { opacity: 0.55 },
  submitText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  skip: {
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  skipText: { color: "#88766E", fontSize: 13, fontWeight: "600" },
});
