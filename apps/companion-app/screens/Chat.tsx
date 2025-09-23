import React from "react";
import { View, Text, TextInput, Button, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import type { DefaultSocket, Channel, ChannelMessage } from "@heroiclabs/nakama-js";
import { connectAnon, joinGlobal } from "../lib/nakama";

interface ChatMessage {
  id: string;
  author: string;
  body: string;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#081120",
    padding: 16
  },
  header: {
    fontSize: 20,
    fontWeight: "600",
    color: "#f4f6ff",
    marginBottom: 12
  },
  message: {
    color: "#d7e1ff",
    marginVertical: 4
  },
  composer: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12
  },
  input: {
    flex: 1,
    backgroundColor: "#13223a",
    borderRadius: 8,
    color: "#f4f6ff",
    paddingHorizontal: 12,
    paddingVertical: 10
  }
});

export default function ChatScreen() {
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [draft, setDraft] = React.useState("");
  const [connecting, setConnecting] = React.useState(true);
  const socketRef = React.useRef<DefaultSocket | null>(null);
  const channelRef = React.useRef<Channel | null>(null);

  React.useEffect(() => {
    let mounted = true;
    const bootstrap = async () => {
      try {
        const username = `mobile_${Math.random().toString(36).slice(2, 10)}`;
        const { socket } = await connectAnon(username);
        if (!mounted) {
          socket.disconnect(true);
          return;
        }
        socketRef.current = socket;
        const channel = await joinGlobal(socket);
        channelRef.current = channel;
        socket.onchannelmessage = (message) => {
          handleIncoming(message);
        };
      } catch (err) {
        console.warn("Failed to connect to Nakama", err);
      } finally {
        if (mounted) {
          setConnecting(false);
        }
      }
    };

    const handleIncoming = (message: ChannelMessage) => {
      const body =
        typeof message.content === "object" && message.content
          ? (message.content as Record<string, unknown>).text
          : undefined;
      const text = typeof body === "string" ? body : "";
      setMessages((prev) => [
        {
          id: message.message_id ?? `${Date.now()}`,
          author: message.username ?? "anon",
          body: text
        },
        ...prev
      ]);
    };

    bootstrap();

    return () => {
      mounted = false;
      if (socketRef.current) {
        socketRef.current.onchannelmessage = (_message: ChannelMessage) => {};
        socketRef.current.disconnect(true);
        socketRef.current = null;
      }
      channelRef.current = null;
    };
  }, []);

  const sendMessage = React.useCallback(async () => {
    if (!draft.trim()) return;
    const socket = socketRef.current;
    const channel = channelRef.current;
    if (!socket || !channel) return;
    try {
      await socket.writeChatMessage(channel.id, { text: draft.trim() });
      setDraft("");
    } catch (err) {
      console.warn("Failed to send message", err);
    }
  }, [draft]);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Faction Comms</Text>
      {connecting ? (
        <ActivityIndicator color="#6bb1ff" />
      ) : (
        <FlatList
          inverted
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Text style={styles.message}>
              <Text style={{ color: "#6bb1ff" }}>{item.author}: </Text>
              {item.body}
            </Text>
          )}
          ListEmptyComponent={<Text style={styles.message}>No chatter yet. Start the conversation!</Text>}
        />
      )}
      <View style={styles.composer}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Broadcast to your faction"
          placeholderTextColor="#6c7a94"
          style={styles.input}
          editable={!connecting}
          returnKeyType="send"
          onSubmitEditing={sendMessage}
        />
        <Button title="Send" onPress={sendMessage} disabled={!draft.trim() || connecting} />
      </View>
    </View>
  );
}
