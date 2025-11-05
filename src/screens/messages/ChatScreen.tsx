import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useRef, useState } from "react";
import {
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface Message {
  id: string;
  fromSelf: boolean;
  text: string;
  timestamp: string;
  status?: "sending" | "sent" | "delivered" | "read";
  type?: "text" | "file" | "image";
}

const mockMessages: Message[] = [
  {
    id: "m1",
    fromSelf: false,
    text: "Shipment has left the port and expected in 5 days.",
    timestamp: "10:30 AM",
    status: "read",
  },
  {
    id: "m2",
    fromSelf: true,
    text: "Thanks for the update. Documents uploaded for inspection.",
    timestamp: "10:32 AM",
    status: "delivered",
  },
  {
    id: "m3",
    fromSelf: false,
    text: "Great. Will confirm once warehouse acknowledges receipt.",
    timestamp: "10:35 AM",
    status: "read",
  },
  {
    id: "m4",
    fromSelf: true,
    text: "Perfect! The payment guarantee has been released from the pool.",
    timestamp: "10:37 AM",
    status: "sent",
  },
  {
    id: "m5",
    fromSelf: false,
    text: "Excellent! This blockchain trade finance solution is really streamlining our process. Looking forward to our next transaction.",
    timestamp: "10:40 AM",
    status: "read",
  },
];

export const ChatScreen: React.FC = () => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [isOnline] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const typingAnimation = useRef(new Animated.Value(0)).current;

  const contactName = "Ahmed Khan";
  const walletAddress = "0x742d35Cc6645C0532b4abE4b4CdeF83eB7a7e5D7";

  const sendMessage = () => {
    if (!message.trim()) return;

    const newMessage: Message = {
      id: `m${messages.length + 1}`,
      fromSelf: true,
      text: message.trim(),
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      status: "sending",
    };

    setMessages((prev) => [...prev, newMessage]);
    setMessage("");

    // Simulate message delivery
    setTimeout(() => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === newMessage.id ? { ...msg, status: "delivered" } : msg
        )
      );
    }, 1000);

    // Scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View
      style={[
        styles.messageContainer,
        item.fromSelf
          ? styles.selfMessageContainer
          : styles.otherMessageContainer,
      ]}
    >
      <View
        style={[
          styles.messageBubble,
          item.fromSelf ? styles.selfBubble : styles.otherBubble,
        ]}
      >
        <Text
          style={[
            styles.messageText,
            { color: item.fromSelf ? "white" : colors.text },
          ]}
        >
          {item.text}
        </Text>
        <View style={styles.messageFooter}>
          <Text
            style={[
              styles.timestamp,
              {
                color: item.fromSelf
                  ? "rgba(255,255,255,0.7)"
                  : colors.textSecondary,
              },
            ]}
          >
            {item.timestamp}
          </Text>
          {item.fromSelf && (
            <MaterialCommunityIcons
              name={
                item.status === "sending"
                  ? "clock-outline"
                  : item.status === "sent"
                  ? "check"
                  : item.status === "delivered"
                  ? "check-all"
                  : "check-all"
              }
              size={14}
              color={
                item.status === "read" ? "#4CAF50" : "rgba(255,255,255,0.7)"
              }
            />
          )}
        </View>
      </View>
    </View>
  );

  const renderTypingIndicator = () => {
    if (!isTyping) return null;

    return (
      <View style={[styles.messageContainer, styles.otherMessageContainer]}>
        <View
          style={[
            styles.messageBubble,
            styles.otherBubble,
            styles.typingBubble,
          ]}
        >
          <View style={styles.typingIndicator}>
            <View style={[styles.typingDot, { animationDelay: "0ms" }]} />
            <View style={[styles.typingDot, { animationDelay: "150ms" }]} />
            <View style={[styles.typingDot, { animationDelay: "300ms" }]} />
          </View>
        </View>
      </View>
    );
  };

  return (
    <Screen padded={false}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton}>
            <MaterialCommunityIcons
              name="arrow-left"
              size={24}
              color={colors.text}
            />
          </TouchableOpacity>

          <View style={styles.headerInfo}>
            <View style={styles.avatarContainer}>
              <View
                style={[styles.avatar, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.avatarText}>{contactName.charAt(0)}</Text>
              </View>
              {isOnline && <View style={styles.onlineIndicator} />}
            </View>

            <View style={styles.contactInfo}>
              <Text style={styles.contactName}>{contactName}</Text>
              <Text style={styles.contactStatus}>
                {isOnline ? "Online" : "Last seen recently"}
              </Text>
              <Text style={styles.walletAddress} numberOfLines={1}>
                {walletAddress}
              </Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerActionButton}>
              <MaterialCommunityIcons
                name="phone"
                size={20}
                color={colors.primary}
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerActionButton}>
              <MaterialCommunityIcons
                name="video"
                size={20}
                color={colors.primary}
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerActionButton}>
              <MaterialCommunityIcons
                name="dots-vertical"
                size={20}
                color={colors.primary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesContainer}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={renderTypingIndicator}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
        />

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <View style={styles.inputRow}>
            <TouchableOpacity style={styles.attachButton}>
              <MaterialCommunityIcons
                name="plus"
                size={24}
                color={colors.primary}
              />
            </TouchableOpacity>

            <View style={styles.textInputContainer}>
              <TextInput
                style={styles.textInput}
                value={message}
                onChangeText={setMessage}
                placeholder="Type a message..."
                placeholderTextColor={colors.textSecondary}
                multiline
                maxLength={1000}
              />
              <TouchableOpacity style={styles.emojiButton}>
                <MaterialCommunityIcons
                  name="emoticon-outline"
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            {message.trim() ? (
              <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
                <MaterialCommunityIcons name="send" size={20} color="white" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.voiceButton}>
                <MaterialCommunityIcons
                  name="microphone"
                  size={20}
                  color={colors.primary}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  backButton: {
    padding: spacing.sm,
    marginRight: spacing.sm,
  },
  headerInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  avatarContainer: {
    position: "relative",
    marginRight: spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#4CAF50",
    borderWidth: 2,
    borderColor: "white",
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 2,
  },
  contactStatus: {
    fontSize: 12,
    color: colors.primary,
    marginBottom: 2,
  },
  walletAddress: {
    fontSize: 10,
    color: colors.textSecondary,
    fontFamily: "monospace",
  },
  headerActions: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  headerActionButton: {
    padding: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  messagesContainer: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
  },
  messageContainer: {
    marginBottom: spacing.md,
  },
  selfMessageContainer: {
    alignItems: "flex-end",
  },
  otherMessageContainer: {
    alignItems: "flex-start",
  },
  messageBubble: {
    maxWidth: "80%",
    borderRadius: 18,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  selfBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: spacing.xs,
  },
  messageFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: spacing.xs,
  },
  timestamp: {
    fontSize: 11,
  },
  typingBubble: {
    paddingVertical: spacing.md,
  },
  typingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.textSecondary,
    opacity: 0.4,
  },
  inputContainer: {
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  textInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: colors.background,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 40,
    maxHeight: 100,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    lineHeight: 20,
    marginRight: spacing.sm,
  },
  emojiButton: {
    padding: spacing.xs,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  voiceButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
});
