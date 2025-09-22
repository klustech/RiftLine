import React from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { api } from "../lib/api";
import { getAuthToken } from "../lib/wallet";
import { usePlayer } from "../lib/stores";
import type { RootStackParamList } from "../App";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "Inventory">;

type InventoryResponse = {
  items1155: Array<{ id: string; tokenId: string; amount: string }>;
  apartments: Array<{ id: string; tokenId: number }>;
};

export default function Inventory() {
  const navigation = useNavigation<NavigationProp>();
  const player = usePlayer();
  const [data, setData] = React.useState<InventoryResponse | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);

  const load = React.useCallback(async () => {
    const token = getAuthToken();
    if (!token) return;
    const response = await api("/inventory", {
      headers: { Authorization: `Bearer ${token}` }
    });
    setData(response);
  }, []);

  React.useEffect(() => {
    load().catch(console.error);
  }, [load]);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    load().finally(() => setRefreshing(false));
  }, [load]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>Inventory</Text>
        <TouchableOpacity onPress={() => navigation.navigate("ShardSelector")}> 
          <Text style={styles.link}>Shard: {player?.shardId ?? "-"}</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={data?.items1155 ?? []}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Token {item.tokenId}</Text>
            <Text style={styles.cardSubtitle}>Amount {item.amount}</Text>
          </View>
        )}
        ListEmptyComponent={() => (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No items yet.</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b0b0f", paddingHorizontal: 16, paddingTop: 48 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  heading: { fontSize: 24, fontWeight: "700", color: "#ffffff" },
  link: { color: "#4cf1b0", fontSize: 16 },
  card: { backgroundColor: "#151822", borderRadius: 12, padding: 16, marginBottom: 12 },
  cardTitle: { color: "#ffffff", fontSize: 16, fontWeight: "600" },
  cardSubtitle: { color: "#9aa0b0", marginTop: 4 },
  empty: { marginTop: 48, alignItems: "center" },
  emptyText: { color: "#5a6072" }
});
