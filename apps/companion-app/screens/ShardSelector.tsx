import React from "react";
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { api } from "../lib/api";
import { getAuthToken } from "../lib/wallet";

interface ShardRow {
  id: number;
  name: string;
  population: number;
}

export default function ShardSelector() {
  const [shards, setShards] = React.useState<ShardRow[]>([]);

  React.useEffect(() => {
    api("/shards").then(setShards).catch(console.error);
  }, []);

  const requestTravel = async (id: number) => {
    const token = getAuthToken();
    if (!token) {
      Alert.alert("Sign in required");
      return;
    }
    try {
      await api("/travel/request", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ toShard: id })
      });
      Alert.alert("Travel requested", "Your ticket is pending.");
    } catch (err: any) {
      Alert.alert("Unable to travel", err.message ?? String(err));
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Choose a shard</Text>
      <FlatList
        data={shards}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardSubtitle}>Population {item.population}</Text>
            <TouchableOpacity style={styles.button} onPress={() => requestTravel(item.id)}>
              <Text style={styles.buttonText}>Travel</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b0b0f", padding: 16, paddingTop: 48 },
  heading: { fontSize: 24, fontWeight: "700", color: "#ffffff", marginBottom: 16 },
  card: { backgroundColor: "#151822", borderRadius: 12, padding: 16, marginBottom: 12 },
  cardTitle: { color: "#ffffff", fontSize: 16, fontWeight: "600" },
  cardSubtitle: { color: "#9aa0b0", marginTop: 4 },
  button: { marginTop: 12, backgroundColor: "#4cf1b0", paddingVertical: 10, borderRadius: 8, alignItems: "center" },
  buttonText: { color: "#0b0b0f", fontWeight: "600" }
});
