import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import SignInScreen from "./screens/SignIn";
import InventoryScreen from "./screens/Inventory";
import MarketScreen from "./screens/Market";
import AuctionsScreen from "./screens/Auctions";
import ShardSelectorScreen from "./screens/ShardSelector";
import ChatScreen from "./screens/Chat";
import WalletScreen from "./screens/Wallet";
import TravelStatusScreen from "./screens/TravelStatus";

export type RootStackParamList = {
  SignIn: undefined;
  Inventory: undefined;
  Market: undefined;
  Auctions: undefined;
  ShardSelector: undefined;
  Chat: undefined;
  Wallet: undefined;
  TravelStatus: { state?: string } | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="SignIn" component={SignInScreen} />
        <Stack.Screen name="Inventory" component={InventoryScreen} />
        <Stack.Screen name="Market" component={MarketScreen} />
        <Stack.Screen name="Auctions" component={AuctionsScreen} />
        <Stack.Screen name="ShardSelector" component={ShardSelectorScreen} />
        <Stack.Screen name="Chat" component={ChatScreen} />
        <Stack.Screen name="Wallet" component={WalletScreen} />
        <Stack.Screen name="TravelStatus" component={TravelStatusScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
