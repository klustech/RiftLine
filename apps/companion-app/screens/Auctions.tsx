import React from "react";
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { api } from "../lib/api";
import { getAuthToken } from "../lib/wallet";

interface AuctionRow {
  id: number;
  tokenId: number;
  endTime: string;
  highestBid: string;
}

export default function Auctions() {
  const [auctions, setAuctions] = React.useState<AuctionRow[]>([]);

  const load = React.useCallback(() => {
    api("/auctions").then((rows) => setAuctions(rows)).catch(console.error);
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const placeBid = async (id: number, minimum: string) => {
    const token = getAuthToken();
    if (!token) {
      Alert.alert("Sign in required");
      return;
    }
    try {
      await api(`/auctions/${id}/bid`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount: minimum })
      });
      Alert.alert("Bid submitted");
    } catch (err: any) {
      Alert.alert("Bid failed", err.message ?? String(err));
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Lease Auctions</Text>
      <FlatList
        data={auctions}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Token {item.tokenId}</Text>
            <Text style={styles.cardSubtitle}>Ends {new Date(item.endTime).toLocaleString()}</Text>
            <Text style={styles.cardSubtitle}>Highest bid {item.highestBid ?? "-"}</Text>
            <TouchableOpacity style={styles.button} onPress={() => placeBid(item.id, item.highestBid ?? "0")}>
              <Text style={styles.buttonText}>Bid</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={() => (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No auctions live.</Text>
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
  cardTitle: { color: "#ffffff", fontSize: 16, fontWeight: "600", marginBottom: 8 },
  cardSubtitle: { color: "#9aa0b0", marginTop: 2 },
  button: { marginTop: 12, backgroundColor: "#4cf1b0", paddingVertical: 10, borderRadius: 8, alignItems: "center" },
  buttonText: { color: "#0b0b0f", fontWeight: "600" },
  empty: { marginTop: 32, alignItems: "center" },
  emptyText: { color: "#5a6072" }
});
