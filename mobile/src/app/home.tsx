import { View, StyleSheet } from "react-native";
import HomeScreen from "@/components/gosugbo/home-screen";
import LogoutButton from "@/components/gosugbo/logout-button";
import RiderHomeScreen from "@/components/gosugbo/rider-home-screen";
import { useAuth } from "@/context/AuthContext";

export default function Home() {
  const { user } = useAuth();

  if (user?.role === "rider") return <RiderHomeScreen />;

  return (
    <View style={styles.wrap}>
      <HomeScreen />
      <LogoutButton />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
});
