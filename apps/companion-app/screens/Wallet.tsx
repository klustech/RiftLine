import React from "react";
import { Alert, Button, Text, View } from "react-native";
import { api } from "../lib/api";

export default function WalletScreen() {
  const [wallet, setWallet] = React.useState<string | null>(null);

  const begin = React.useCallback(async () => {
    const response = await api('/wallet/begin', {
      method: 'POST',
      headers: { Authorization: `Bearer ${(globalThis as any).authToken ?? ''}` }
    });
    Alert.alert('Link Wallet', `Open provider: ${response.url}`);
  }, []);

  const complete = React.useCallback(async () => {
    const response = await api('/wallet/complete', {
      method: 'POST',
      headers: { Authorization: `Bearer ${(globalThis as any).authToken ?? ''}` }
    });
    setWallet(response.wallet);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#061229', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <Text style={{ color: '#cde', fontSize: 16 }}>Wallet: {wallet ?? 'not linked'}</Text>
      <Button title="Begin Social Login" onPress={begin} />
      <Button title="Complete Linking" onPress={complete} />
    </View>
  );
}
