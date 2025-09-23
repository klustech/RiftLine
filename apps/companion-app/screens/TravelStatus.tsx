import React from "react";
import { Text, View } from "react-native";

interface TravelStatusProps {
  route?: { params?: { state?: string } };
}

export default function TravelStatusScreen({ route }: TravelStatusProps) {
  const state = route?.params?.state ?? 'Pending';
  return (
    <View style={{ flex: 1, backgroundColor: '#061229', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#9fd', fontSize: 20, fontWeight: '600' }}>Shard Transfer: {state}</Text>
      <Text style={{ color: '#cde', marginTop: 8 }}>World streaming in progress…</Text>
    </View>
  );
}
