import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { api } from "../lib/api";
import { setAuthToken } from "../lib/wallet";
import { setPlayer } from "../lib/stores";
import type { RootStackParamList } from "../App";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "SignIn">;

export default function SignIn() {
  const navigation = useNavigation<NavigationProp>();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleContinue = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api("/players/guest", { method: "POST" });
      setAuthToken(response.token);
      setPlayer(response.player);
      navigation.replace("Inventory");
    } catch (err: any) {
      setError(err.message ?? String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to RiftLine</Text>
      <Text style={styles.subtitle}>Sign in with your wallet or continue as a guest.</Text>
      <TouchableOpacity style={styles.button} onPress={handleContinue} disabled={loading}>
        {loading ? <ActivityIndicator color="#0b0b0f" /> : <Text style={styles.buttonText}>Continue</Text>}
      </TouchableOpacity>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "#0b0b0f" },
  title: { fontSize: 32, fontWeight: "700", color: "#ffffff", marginBottom: 12 },
  subtitle: { fontSize: 16, color: "#bdc0c5", textAlign: "center", marginBottom: 32 },
  button: { backgroundColor: "#4cf1b0", paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 },
  buttonText: { color: "#0b0b0f", fontWeight: "600", fontSize: 18 },
  error: { color: "#ff6b6b", marginTop: 16 }
});
