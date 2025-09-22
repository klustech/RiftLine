import React from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import { api } from "../lib/api";

export default function Market() {
  const [listings, setListings] = React.useState<any[]>([]);

  React.useEffect(() => {
    api("/market/listings").then(setListings).catch(console.error);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Marketplace</Text>
      <FlatList
        data={listings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.kind}</Text>
            <Text style={styles.cardSubtitle}>{item.price} wei</Text>
          </View>
        )}
        ListEmptyComponent={() => (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No active listings.</Text>
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
  empty: { marginTop: 32, alignItems: "center" },
  emptyText: { color: "#5a6072" }
});
