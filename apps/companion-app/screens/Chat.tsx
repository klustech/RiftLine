import React from "react";
import { View, Text, TextInput, Button, FlatList, StyleSheet } from "react-native";

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

  const sendMessage = React.useCallback(() => {
    if (!draft.trim()) return;
    const next: ChatMessage = {
      id: Date.now().toString(36),
      author: "you",
      body: draft.trim()
    };
    setMessages((prev) => [next, ...prev]);
    setDraft("");
  }, [draft]);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Faction Comms</Text>
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
      <View style={styles.composer}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Broadcast to your faction"
          placeholderTextColor="#6c7a94"
          style={styles.input}
          returnKeyType="send"
          onSubmitEditing={sendMessage}
        />
        <Button title="Send" onPress={sendMessage} />
      </View>
    </View>
  );
}
